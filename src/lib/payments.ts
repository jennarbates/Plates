// Charges and holds on a customer's saved card. Import this from server code only.
import Stripe from "stripe";
import { bookingColumns, type BookingRow } from "@/lib/bookings";
import { getStripe } from "@/lib/checkout";
import { getDb, type Queryable } from "@/lib/db";
import { deliverPendingEmails } from "@/lib/email";
import {
  notifyBalanceCharged,
  notifyChargeForDamage,
  notifyHoldPlaced,
  notifyHoldReleased,
  notifyPaymentFailed,
  toOwner,
} from "@/lib/notifications";
import { addDays, localToday, site } from "@/lib/site";

const maxAttempts = 3;
const setupBalanceDaysBefore = 2; // The agreement charges setup balances 48 hours before.
const holdDaysBefore = 1; // Holds on a saved card can expire in about 5 days, so place them late.

type PaymentKind = "balance" | "security_hold";

export type PaymentRow = {
  id: string;
  booking_id: string;
  kind: PaymentKind | "extra";
  status: "processing" | "succeeded" | "failed" | "held" | "released" | "captured";
  amount_cents: number;
  captured_cents: number | null;
  attempts: number;
  stripe_payment_intent_id: string | null;
  failure_code: string | null;
  note: string | null;
  capture_before: string | null;
};

export class PaymentActionError extends Error {}

const paymentColumns = `id, booking_id, kind, status, amount_cents, captured_cents, attempts, stripe_payment_intent_id,
  failure_code, note, capture_before::text AS capture_before`;

function requireStripe() {
  const stripe = getStripe();
  if (!stripe) throw new PaymentActionError("Stripe isn't connected.");
  return stripe;
}

async function savedPaymentMethod(stripe: Stripe, booking: BookingRow) {
  if (!booking.stripe_payment_intent_id || !booking.stripe_customer_id) {
    throw new PaymentActionError("This booking has no saved card.");
  }
  const original = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
  const method = original.payment_method;
  const id = typeof method === "string" ? method : method?.id;
  if (!id) throw new PaymentActionError("This booking has no saved card.");
  return id;
}

// Claims the right to attempt a payment, so overlapping runs can't charge twice.
async function claimPayment(db: Queryable, bookingId: string, kind: PaymentKind, amountCents: number, force: boolean) {
  const retryRule = force
    ? `payments.status = 'failed'`
    : `(payments.status = 'failed' AND payments.attempts < ${maxAttempts} AND payments.updated_at < now() - interval '24 hours')`;
  const { rows } = await db.query<{ id: string; attempts: number }>(
    `INSERT INTO payments (booking_id, kind, status, amount_cents) VALUES ($1, $2, 'processing', $3)
     ON CONFLICT (booking_id, kind) WHERE kind IN ('balance', 'security_hold') DO UPDATE SET
       status = 'processing',
       attempts = payments.attempts + CASE WHEN payments.status = 'failed' THEN 1 ELSE 0 END,
       updated_at = now()
     WHERE ${retryRule} OR (payments.status = 'processing' AND payments.stripe_payment_intent_id IS NULL AND payments.updated_at < now() - interval '15 minutes')
     RETURNING id, attempts`,
    [bookingId, kind, amountCents],
  );
  return rows[0] ?? null;
}

function chargeCapturedBefore(intent: Stripe.PaymentIntent) {
  const charge = intent.latest_charge;
  if (!charge || typeof charge === "string") return null;
  const seconds = charge.payment_method_details?.card?.capture_before;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function attemptPayment(booking: BookingRow, kind: PaymentKind, amountCents: number, force = false) {
  const db = await getDb();
  const claim = await claimPayment(db, booking.id, kind, amountCents, force);
  if (!claim) return "skipped" as const;

  const manual = kind === "security_hold";
  try {
    const stripe = requireStripe();
    const paymentMethod = await savedPaymentMethod(stripe, booking);
    const intent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: "usd",
        customer: booking.stripe_customer_id ?? undefined,
        payment_method: paymentMethod,
        off_session: true,
        confirm: true,
        allowed_payment_method_types: ["card"],
        ...(manual ? { capture_method: "manual" as const } : {}),
        description: `${site.name} ${manual ? "security hold" : "balance"}, ${booking.reference}`,
        metadata: { booking_id: booking.id, reference: booking.reference, kind },
        expand: ["latest_charge"],
      },
      { idempotencyKey: `${kind}-${booking.id}-${claim.attempts}` },
    );

    if (intent.status !== (manual ? "requires_capture" : "succeeded")) {
      throw new PaymentActionError(`Unexpected payment status: ${intent.status}`);
    }

    await db.query(
      `UPDATE payments SET status = $2, stripe_payment_intent_id = $3, capture_before = $4::timestamptz, failure_code = NULL, updated_at = now() WHERE id = $1`,
      [claim.id, manual ? "held" : "succeeded", intent.id, chargeCapturedBefore(intent)],
    );
    if (manual) await notifyHoldPlaced(booking, amountCents);
    else await notifyBalanceCharged(booking, amountCents);
    return "succeeded" as const;
  } catch (error) {
    const stripeError = error instanceof Stripe.errors.StripeError ? error : null;
    const code = stripeError?.code ?? (error instanceof Error ? error.message : "unknown_error");
    await db.query(
      `UPDATE payments SET status = 'failed', failure_code = $2, stripe_payment_intent_id = COALESCE($3, stripe_payment_intent_id), updated_at = now() WHERE id = $1`,
      [claim.id, code, stripeError?.payment_intent?.id ?? null],
    );
    await notifyPaymentFailed(booking, kind, amountCents, claim.attempts, code);
    return "failed" as const;
  }
}

async function bookingsDue(db: Queryable, condition: string, today: string, cutoff: string) {
  const { rows } = await db.query<BookingRow>(
    `SELECT ${bookingColumns} FROM bookings b
     WHERE b.status = 'confirmed' AND b.end_date >= $1::date AND b.start_date <= $2::date AND ${condition}`,
    [today, cutoff],
  );
  return rows;
}

async function alertExpiringHolds(db: Queryable, now: Date) {
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const { rows } = await db.query<BookingRow & { payment_id: string }>(
    `SELECT ${bookingColumns}, p.id AS payment_id FROM payments p JOIN bookings b ON b.id = p.booking_id
     WHERE p.kind = 'security_hold' AND p.status = 'held' AND p.capture_before <= $1::timestamptz`,
    [soon],
  );
  for (const booking of rows) {
    await toOwner(booking, `owner-hold-expiring:${booking.payment_id}`, "A security hold is about to expire", [
      "Release it or charge any damage from your bookings page before it expires. After that, any damage must be charged to the saved card instead.",
    ]);
  }
  await db.query(
    `UPDATE payments SET status = 'released', note = 'Expired at the bank', updated_at = now()
     WHERE kind = 'security_hold' AND status = 'held' AND capture_before < $1::timestamptz`,
    [now.toISOString()],
  );
}

// Runs hourly. Each payment is claimed first, so running it often is safe.
export async function runScheduledPayments(now = new Date()) {
  const db = await getDb();
  const today = localToday(now);
  const summary = { balances: 0, holds: 0, failed: 0 };
  const count = (result: string, key: "balances" | "holds") => {
    if (result === "succeeded") summary[key] += 1;
    if (result === "failed") summary.failed += 1;
  };

  const setupBalances = await bookingsDue(db, `b.kind = 'setup' AND b.balance_cents > 0`, today, addDays(today, setupBalanceDaysBefore));
  const rentalBalances = await bookingsDue(db, `b.kind = 'rental' AND b.balance_cents > 0`, today, today);
  for (const booking of [...setupBalances, ...rentalBalances]) {
    count(await attemptPayment(booking, "balance", booking.balance_cents), "balances");
  }

  for (const booking of await bookingsDue(db, `b.security_hold_cents > 0`, today, addDays(today, holdDaysBefore))) {
    count(await attemptPayment(booking, "security_hold", booking.security_hold_cents), "holds");
  }

  await alertExpiringHolds(db, now);
  const emails = await deliverPendingEmails();
  return { ...summary, emails };
}

// Owner actions

async function loadBooking(bookingId: string) {
  const db = await getDb();
  const { rows } = await db.query<BookingRow>(`SELECT ${bookingColumns} FROM bookings b WHERE b.id = $1`, [bookingId]);
  if (!rows[0]) throw new PaymentActionError("Booking not found.");
  return rows[0];
}

export async function listPayments(bookingIds: string[]) {
  const db = await getDb();
  const { rows } = await db.query<PaymentRow>(
    `SELECT ${paymentColumns} FROM payments WHERE booking_id = ANY($1::uuid[]) ORDER BY created_at`,
    [bookingIds],
  );
  return rows;
}

export async function retryPayment(bookingId: string, kind: PaymentKind) {
  const booking = await loadBooking(bookingId);
  if (booking.status !== "confirmed") throw new PaymentActionError("Only confirmed bookings can be charged.");
  const amount = kind === "balance" ? booking.balance_cents : booking.security_hold_cents;
  if (amount <= 0) throw new PaymentActionError("There's nothing to charge.");
  const result = await attemptPayment(booking, kind, amount, true);
  await deliverPendingEmails();
  if (result === "skipped") throw new PaymentActionError("This has already been processed.");
  return result;
}

// Takes the hold out of "held" first, so two clicks can't act on it twice.
async function claimHold(db: Queryable, bookingId: string) {
  const { rows } = await db.query<PaymentRow>(
    `UPDATE payments SET status = 'processing', updated_at = now()
     WHERE booking_id = $1 AND kind = 'security_hold' AND status = 'held' RETURNING ${paymentColumns}`,
    [bookingId],
  );
  if (!rows[0]?.stripe_payment_intent_id) throw new PaymentActionError("There's no active hold on this booking.");
  return rows[0];
}

async function restoreHold(db: Queryable, paymentId: string) {
  await db.query(`UPDATE payments SET status = 'held', updated_at = now() WHERE id = $1`, [paymentId]);
}

export async function releaseHold(bookingId: string) {
  const db = await getDb();
  const stripe = requireStripe();
  const booking = await loadBooking(bookingId);
  const hold = await claimHold(db, bookingId);
  try {
    await stripe.paymentIntents.cancel(hold.stripe_payment_intent_id ?? "");
  } catch (error) {
    await restoreHold(db, hold.id);
    throw error;
  }
  await db.query(`UPDATE payments SET status = 'released', updated_at = now() WHERE id = $1`, [hold.id]);
  await notifyHoldReleased(booking);
  await deliverPendingEmails();
}

type DamageCharge = { amountCents: number; note: string; itemizedListSent: boolean };

function checkDamageCharge({ amountCents, note, itemizedListSent }: DamageCharge) {
  // The agreement promises an itemized list with photos before any charge.
  if (!itemizedListSent) throw new PaymentActionError("Email the itemized list with photos before charging.");
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new PaymentActionError("Enter an amount.");
  if (note.trim().length < 3) throw new PaymentActionError("Add a reason for the charge.");
}

// Charges part of the hold and releases the rest.
export async function captureHold(bookingId: string, charge: DamageCharge) {
  checkDamageCharge(charge);
  const db = await getDb();
  const stripe = requireStripe();
  const booking = await loadBooking(bookingId);
  const hold = await claimHold(db, bookingId);
  if (charge.amountCents > hold.amount_cents) {
    await restoreHold(db, hold.id);
    throw new PaymentActionError("That's more than the hold. Charge the rest separately.");
  }
  try {
    await stripe.paymentIntents.capture(hold.stripe_payment_intent_id ?? "", { amount_to_capture: charge.amountCents });
  } catch (error) {
    await restoreHold(db, hold.id);
    throw error;
  }
  await db.query(`UPDATE payments SET status = 'captured', captured_cents = $2, note = $3, updated_at = now() WHERE id = $1`, [
    hold.id,
    charge.amountCents,
    charge.note.trim(),
  ]);
  await notifyChargeForDamage(booking, hold.id, charge.amountCents, charge.note.trim());
  await deliverPendingEmails();
}

// For costs above the hold, or after the hold has ended.
export async function chargeExtra(bookingId: string, charge: DamageCharge) {
  checkDamageCharge(charge);
  const db = await getDb();
  const stripe = requireStripe();
  const booking = await loadBooking(bookingId);
  const paymentMethod = await savedPaymentMethod(stripe, booking);
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO payments (booking_id, kind, status, amount_cents, note) VALUES ($1, 'extra', 'processing', $2, $3) RETURNING id`,
    [bookingId, charge.amountCents, charge.note.trim()],
  );
  const paymentId = rows[0].id;
  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: charge.amountCents,
        currency: "usd",
        customer: booking.stripe_customer_id ?? undefined,
        payment_method: paymentMethod,
        off_session: true,
        confirm: true,
        allowed_payment_method_types: ["card"],
        description: `${site.name} charge, ${booking.reference}`,
        metadata: { booking_id: booking.id, reference: booking.reference, kind: "extra" },
      },
      { idempotencyKey: `extra-${paymentId}` },
    );
    if (intent.status !== "succeeded") throw new PaymentActionError(`Unexpected payment status: ${intent.status}`);
    await db.query(`UPDATE payments SET status = 'succeeded', stripe_payment_intent_id = $2, updated_at = now() WHERE id = $1`, [paymentId, intent.id]);
  } catch (error) {
    const code = error instanceof Stripe.errors.StripeError ? (error.code ?? error.message) : "unknown_error";
    await db.query(`UPDATE payments SET status = 'failed', failure_code = $2, updated_at = now() WHERE id = $1`, [paymentId, code]);
    throw new PaymentActionError(`The card wasn't charged: ${code}`);
  }
  await notifyChargeForDamage(booking, paymentId, charge.amountCents, charge.note.trim());
  await deliverPendingEmails();
}

// Stops all future charges and releases any hold. Refunds are done by hand in Stripe.
export async function cancelBooking(bookingId: string) {
  const db = await getDb();
  const { rows } = await db.query<{ id: string }>(
    `UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND status IN ('confirmed', 'needs_review', 'cancelled') RETURNING id`,
    [bookingId],
  );
  if (!rows[0]) throw new PaymentActionError("This booking can't be cancelled.");
  const { rows: holds } = await db.query<{ id: string }>(
    `SELECT id FROM payments WHERE booking_id = $1 AND kind = 'security_hold' AND status = 'held'`,
    [bookingId],
  );
  if (holds[0]) {
    const stripe = requireStripe();
    const hold = await claimHold(db, bookingId);
    try {
      await stripe.paymentIntents.cancel(hold.stripe_payment_intent_id ?? "");
    } catch (error) {
      await restoreHold(db, hold.id);
      throw error;
    }
    await db.query(`UPDATE payments SET status = 'released', note = 'Booking cancelled', updated_at = now() WHERE id = $1`, [hold.id]);
  }
}
