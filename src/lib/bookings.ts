// Availability and booking records. Import this from server code only.
import { randomBytes } from "node:crypto";
import { findRental, kitComponents } from "@/lib/catalog";
import { getDb, type Queryable } from "@/lib/db";
import type { CheckoutOrder, RentalOrder, SetupOrder } from "@/lib/orders";
import { quoteRental, quoteSetup, standardRentalDays, type Quote, type RentalLine } from "@/lib/pricing";
import { agreementVersion } from "@/lib/policies";
import { addDays, site, timeSlots } from "@/lib/site";

export const holdMinutes = 35; // Stripe's shortest session is 30 minutes, so holds outlast it.
const turnaroundDays = 1; // Items stay blocked for washing and inspection after return.
const bookingLockId = 7241;

const activeBooking = `(b.status = 'confirmed' OR (b.status = 'pending_payment' AND b.hold_expires_at > now()))`;

export type BookingRow = {
  id: string;
  reference: string;
  kind: "setup" | "rental";
  status: "pending_payment" | "confirmed" | "expired" | "needs_review" | "cancelled";
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  start_date: string;
  end_date: string;
  time_slot: string | null;
  location: string | null;
  access_notes: string | null;
  quote: Quote;
  total_cents: number;
  due_now_cents: number;
  balance_cents: number;
  security_hold_cents: number;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
};

export const bookingColumns = `b.id, b.reference, b.kind, b.status, b.customer_name, b.customer_email, b.customer_phone,
  b.start_date::text AS start_date, b.end_date::text AS end_date, b.time_slot, b.location, b.access_notes, b.quote,
  b.total_cents, b.due_now_cents, b.balance_cents, b.security_hold_cents, b.stripe_session_id, b.stripe_payment_intent_id, b.stripe_customer_id,
  b.created_at::text AS created_at`;

export class UnavailableError extends Error {
  constructor(
    message: string,
    readonly unavailable: string[] = [],
  ) {
    super(message);
  }
}

export function earliestBookableDate(today = new Date().toISOString().slice(0, 10)) {
  return today > site.bookingsOpen ? today : site.bookingsOpen;
}

export function rentalEndDate(pickup: string, extraDays: number) {
  return addDays(pickup, standardRentalDays + extraDays);
}

// A kit holds itself plus any catalog pieces inside it, so they can't also be rented alone.
function resourcesNeeded(lines: RentalLine[]) {
  const needed = new Map<string, number>();
  const add = (slug: string, quantity: number) => needed.set(slug, (needed.get(slug) ?? 0) + quantity);
  for (const line of lines) {
    add(line.slug, line.quantity);
    for (const part of kitComponents[line.slug] ?? []) add(part.slug, part.quantity * line.quantity);
  }
  return needed;
}

function resourcesFor(slug: string) {
  return [slug, ...(kitComponents[slug] ?? []).map((part) => part.slug)];
}

async function reservedBetween(db: Queryable, slugs: string[], start: string, end: string) {
  const { rows } = await db.query<{ slug: string; reserved: number }>(
    `SELECT r.slug, SUM(r.quantity)::int AS reserved
     FROM reservations r JOIN bookings b ON b.id = r.booking_id
     WHERE r.slug = ANY($1::text[]) AND ${activeBooking}
       AND r.start_date <= $3::date + ${turnaroundDays}
       AND r.end_date + ${turnaroundDays} >= $2::date
     GROUP BY r.slug`,
    [slugs, start, end],
  );
  return new Map(rows.map((row) => [row.slug, row.reserved]));
}

// Returns the requested items that can't be supplied for those dates.
export async function findUnavailableLines(db: Queryable, lines: RentalLine[], start: string, end: string) {
  const needed = resourcesNeeded(lines);
  const reserved = await reservedBetween(db, [...needed.keys()], start, end);
  const short = new Set(
    [...needed].filter(([slug, quantity]) => {
      const capacity = findRental(slug)?.quantity ?? 0;
      return (reserved.get(slug) ?? 0) + quantity > capacity;
    }).map(([slug]) => slug),
  );
  return lines.filter((line) => resourcesFor(line.slug).some((slug) => short.has(slug))).map((line) => line.slug);
}

export async function checkRentalAvailability(lines: RentalLine[], pickup: string, extraDays: number) {
  const db = await getDb();
  return findUnavailableLines(db, lines, pickup, rentalEndDate(pickup, extraDays));
}

export async function openSetupSlots(date: string) {
  const db = await getDb();
  const { rows } = await db.query<{ time_slot: string }>(
    `SELECT b.time_slot FROM bookings b WHERE b.kind = 'setup' AND b.start_date = $1::date AND ${activeBooking}`,
    [date],
  );
  const taken = new Set(rows.map((row) => row.time_slot));
  return timeSlots.filter((slot) => !taken.has(slot));
}

// The next Fridays and Saturdays with at least one open time slot.
export async function nextOpenSetupDates(count: number) {
  const db = await getDb();
  const start = earliestBookableDate();
  const { rows } = await db.query<{ date: string; taken: number }>(
    `SELECT b.start_date::text AS date, COUNT(*)::int AS taken FROM bookings b
     WHERE b.kind = 'setup' AND b.start_date >= $1::date AND ${activeBooking} GROUP BY b.start_date`,
    [start],
  );
  const taken = new Map(rows.map((row) => [row.date, row.taken]));
  const dates: string[] = [];
  for (let day = start, tries = 0; dates.length < count && tries < 370; day = addDays(day, 1), tries += 1) {
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    if ((weekday === 5 || weekday === 6) && (taken.get(day) ?? 0) < timeSlots.length) dates.push(day);
  }
  return dates;
}

// Days in a month when none of this item is free to start or continue a rental.
export async function fullDaysForItem(slug: string, month: string) {
  const item = findRental(slug);
  if (!item) return [];
  const db = await getDb();
  const first = `${month}-01`;
  const days: string[] = [];
  for (let day = first; day.startsWith(month); day = addDays(day, 1)) days.push(day);
  const resources = resourcesFor(slug);
  const { rows } = await db.query<{ slug: string; quantity: number; start_date: string; end_date: string }>(
    `SELECT r.slug, r.quantity, r.start_date::text AS start_date, r.end_date::text AS end_date
     FROM reservations r JOIN bookings b ON b.id = r.booking_id
     WHERE r.slug = ANY($1::text[]) AND ${activeBooking}
       AND r.start_date <= $3::date + ${turnaroundDays} AND r.end_date + ${turnaroundDays} >= $2::date`,
    [resources, first, days.at(-1)],
  );
  const perKit = new Map([[slug, 1], ...(kitComponents[slug] ?? []).map((part) => [part.slug, part.quantity] as const)]);
  return days.filter((day) =>
    resources.some((resource) => {
      const reserved = rows
        .filter((row) => row.slug === resource && row.start_date <= addDays(day, turnaroundDays) && addDays(row.end_date, turnaroundDays) >= day)
        .reduce((sum, row) => sum + row.quantity, 0);
      return reserved + (perKit.get(resource) ?? 1) > (findRental(resource)?.quantity ?? 0);
    }),
  );
}

function makeReference() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const code = [...randomBytes(6)].map((byte) => alphabet[byte % alphabet.length]).join("");
  return `WP-${code}`;
}

export function quoteFor(order: CheckoutOrder) {
  return order.kind === "setup" ? quoteSetup(order) : quoteRental(order);
}

type RequestDetails = { ip: string | null; userAgent: string | null };

async function insertBooking(
  tx: Queryable,
  order: CheckoutOrder,
  quote: Quote,
  details: { start: string; end: string; slot: string | null; location: string | null; access: string | null },
) {
  const { signature, ...orderDetails } = order;
  const { rows } = await tx.query<BookingRow>(
    `INSERT INTO bookings AS b (reference, kind, status, customer_name, customer_email, customer_phone, start_date, end_date,
       time_slot, location, access_notes, order_details, quote, total_cents, due_now_cents, balance_cents,
       security_hold_cents, hold_expires_at)
     VALUES ($1, $2, 'pending_payment', $3, $4, $5, $6::date, $7::date, $8, $9, $10, $11::jsonb, $12::jsonb, $13, $14, $15, $16,
       now() + interval '${holdMinutes} minutes')
     RETURNING ${bookingColumns}`,
    [
      makeReference(),
      order.kind,
      signature.fullName,
      signature.email,
      signature.phone,
      details.start,
      details.end,
      details.slot,
      details.location,
      details.access,
      JSON.stringify(orderDetails),
      JSON.stringify(quote),
      quote.totalCents,
      quote.dueNowCents,
      quote.balanceCents,
      quote.securityHoldCents,
    ],
  );
  return rows[0];
}

async function checkSetup(tx: Queryable, order: SetupOrder) {
  const { rows } = await tx.query(
    `SELECT 1 FROM bookings b WHERE b.kind = 'setup' AND b.start_date = $1::date AND b.time_slot = $2 AND ${activeBooking}`,
    [order.date, order.slot],
  );
  if (rows.length) throw new UnavailableError("That time was just booked. Please pick another.");
}

async function checkRental(tx: Queryable, order: RentalOrder, end: string) {
  const unavailable = await findUnavailableLines(tx, order.lines, order.pickup, end);
  if (unavailable.length) {
    throw new UnavailableError("Something in your cart isn't available for those dates.", unavailable);
  }
}

export async function createPendingBooking(order: CheckoutOrder, request: RequestDetails) {
  const start = order.kind === "setup" ? order.date : order.pickup;
  if (start < earliestBookableDate()) throw new UnavailableError("Please pick a later date.");
  const end = order.kind === "setup" ? order.date : rentalEndDate(order.pickup, order.extraDays);
  const quote = quoteFor(order);
  const db = await getDb();

  return db.transaction(async (tx) => {
    // One booking at a time, so two customers can't both take the last piece.
    await tx.query(`SELECT pg_advisory_xact_lock(${bookingLockId})`);
    await tx.query(`UPDATE bookings SET status = 'expired' WHERE status = 'pending_payment' AND hold_expires_at <= now()`);

    if (order.kind === "setup") await checkSetup(tx, order);
    else await checkRental(tx, order, end);

    const booking = await insertBooking(tx, order, quote, {
      start,
      end,
      slot: order.kind === "setup" ? order.slot : null,
      location: order.kind === "setup" ? order.address : null,
      access: order.kind === "setup" ? order.access : null,
    });

    if (order.kind === "rental") {
      for (const [slug, quantity] of resourcesNeeded(order.lines)) {
        await tx.query(
          `INSERT INTO reservations (booking_id, slug, quantity, start_date, end_date) VALUES ($1, $2, $3, $4::date, $5::date)`,
          [booking.id, slug, quantity, start, end],
        );
      }
    }

    await tx.query(
      `INSERT INTO signatures (booking_id, full_name, agreement_version, agreed, adult, addendum_initials, no_photos, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`,
      [
        booking.id,
        order.signature.fullName,
        agreementVersion,
        order.signature.agreed,
        order.signature.adult,
        JSON.stringify(order.signature.initials),
        order.signature.noPhotos,
        request.ip,
        request.userAgent,
      ],
    );
    return booking;
  });
}

export async function attachStripeSession(bookingId: string, sessionId: string) {
  const db = await getDb();
  await db.query(`UPDATE bookings SET stripe_session_id = $2 WHERE id = $1`, [bookingId, sessionId]);
}

export async function expireBooking(bookingId: string) {
  const db = await getDb();
  await db.query(`UPDATE bookings SET status = 'expired' WHERE id = $1 AND status = 'pending_payment'`, [bookingId]);
}

export async function findBookingBySession(sessionId: string) {
  const db = await getDb();
  const { rows } = await db.query<BookingRow>(`SELECT ${bookingColumns} FROM bookings b WHERE b.stripe_session_id = $1`, [sessionId]);
  return rows[0] ?? null;
}

export async function findBookingById(id: string) {
  const db = await getDb();
  const { rows } = await db.query<BookingRow>(`SELECT ${bookingColumns} FROM bookings b WHERE b.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listBookings(limit = 200) {
  const db = await getDb();
  const { rows } = await db.query<BookingRow>(
    `SELECT ${bookingColumns} FROM bookings b ORDER BY b.start_date DESC, b.created_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

type PaidSession = {
  id: string;
  amountTotal: number | null;
  paymentIntentId: string | null;
  customerId: string | null;
};

// Safe to run more than once. A payment that doesn't match a live hold goes to manual review.
export async function recordPayment(session: PaidSession) {
  const db = await getDb();
  const { rows } = await db.query<{ status: BookingRow["status"] }>(
    `UPDATE bookings SET
       status = CASE
         WHEN status = 'pending_payment' AND due_now_cents = $2 THEN 'confirmed'
         WHEN status IN ('confirmed', 'cancelled') THEN status
         ELSE 'needs_review' END,
       stripe_payment_intent_id = $3,
       stripe_customer_id = $4,
       confirmed_at = COALESCE(confirmed_at, now())
     WHERE stripe_session_id = $1
     RETURNING status`,
    [session.id, session.amountTotal, session.paymentIntentId, session.customerId],
  );
  return rows[0]?.status ?? null;
}
