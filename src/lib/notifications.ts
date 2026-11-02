// What we tell customers and the owner, in plain language. Import from server code only.
import { findBookingBySession, recordPayment, type BookingRow } from "@/lib/bookings";
import { getDb } from "@/lib/db";
import { deliverPendingEmails, queueEmail, type EmailContent } from "@/lib/email";
import { formatDate, moneyFromCents, site } from "@/lib/site";

function dateLine(booking: BookingRow) {
  return `${formatDate(booking.start_date)}${booking.time_slot ? `, ${booking.time_slot}` : ""}`;
}

function bookingRows(booking: BookingRow): [string, string][] {
  return [
    ["Reference", booking.reference],
    [booking.kind === "setup" ? "Date" : "Pickup", dateLine(booking)],
    ...(booking.kind === "rental" ? ([["Return by", formatDate(booking.end_date)]] as [string, string][]) : []),
  ];
}

async function toCustomer(booking: BookingRow, dedupeKey: string, content: EmailContent) {
  const db = await getDb();
  await queueEmail(db, { dedupeKey, bookingId: booking.id, recipient: booking.customer_email, content });
}

export async function toOwner(booking: BookingRow, dedupeKey: string, subject: string, paragraphs: string[]) {
  const owner = process.env.OWNER_EMAIL;
  if (!owner) return;
  const db = await getDb();
  await queueEmail(db, {
    dedupeKey,
    bookingId: booking.id,
    recipient: owner,
    content: {
      subject: `${subject} (${booking.reference})`,
      heading: subject,
      paragraphs,
      rows: [...bookingRows(booking), ["Customer", booking.customer_name], ["Email", booking.customer_email], ["Phone", booking.customer_phone]],
    },
  });
}

export async function notifyBookingConfirmed(booking: BookingRow) {
  const balanceLine =
    booking.balance_cents > 0
      ? [[booking.kind === "setup" ? "Balance, charged 48 hours before" : "Balance, charged at pickup", moneyFromCents(booking.balance_cents)] as [string, string]]
      : [];
  await toCustomer(booking, `confirmed:${booking.id}`, {
    subject: `Your ${site.name} booking is confirmed (${booking.reference})`,
    heading: "Your table is booked",
    paragraphs: [
      `Thank you, ${booking.customer_name.split(" ")[0]}. We've received your payment and your signed agreement.`,
      `We'll place a security hold on your saved card the day before. It isn't a charge, and we release it after everything is back and inspected.`,
    ],
    rows: [
      ...bookingRows(booking),
      ...(booking.location ? ([["Location", booking.location]] as [string, string][]) : []),
      ["Paid today", moneyFromCents(booking.due_now_cents)],
      ...balanceLine,
      ["Security hold", moneyFromCents(booking.security_hold_cents)],
    ],
  });
  await toOwner(booking, `owner-new:${booking.id}`, "New booking", [
    `${booking.customer_name} paid ${moneyFromCents(booking.due_now_cents)}. Details are on your bookings page.`,
    ...(booking.access_notes ? [`Access notes: ${booking.access_notes}`] : []),
  ]);
}

export async function notifyBalanceCharged(booking: BookingRow, amountCents: number) {
  await toCustomer(booking, `balance-charged:${booking.id}`, {
    subject: `Your ${site.name} balance has been paid (${booking.reference})`,
    heading: "Balance paid",
    paragraphs: [`We charged the remaining ${moneyFromCents(amountCents)} to your saved card, so you're all paid up.`],
    rows: bookingRows(booking),
  });
}

export async function notifyHoldPlaced(booking: BookingRow, amountCents: number) {
  await toCustomer(booking, `hold-placed:${booking.id}`, {
    subject: `Security hold for your ${site.name} booking (${booking.reference})`,
    heading: "Your security hold",
    paragraphs: [
      `We've placed a ${moneyFromCents(amountCents)} hold on your saved card. This is not a charge, though it may show as pending with your bank.`,
      `We release it after everything is returned and inspected, minus any charges your agreement allows.`,
    ],
    rows: bookingRows(booking),
  });
}

export async function notifyPaymentFailed(booking: BookingRow, kind: "balance" | "security_hold", amountCents: number, attempt: number, failure: string) {
  const what = kind === "balance" ? "balance" : "security hold";
  await toCustomer(booking, `${kind}-failed:${booking.id}`, {
    subject: `We need your help with your ${site.name} card (${booking.reference})`,
    heading: "We couldn't process your card",
    paragraphs: [
      `We tried to process your ${moneyFromCents(amountCents)} ${what} on your saved card, but your bank didn't approve it.`,
      `Please contact us as soon as you can so we can keep your booking on track. Your bank may also ask you to approve the payment.`,
    ],
    rows: bookingRows(booking),
  });
  await toOwner(booking, `owner-${kind}-failed:${booking.id}:${attempt}`, `Card problem: ${what} failed`, [
    `Attempt ${attempt} of 3 for ${moneyFromCents(amountCents)} failed (${failure}). The site retries once a day, or you can retry from your bookings page.`,
  ]);
}

export async function notifyHoldReleased(booking: BookingRow) {
  await toCustomer(booking, `hold-released:${booking.id}`, {
    subject: `Your ${site.name} security hold is released (${booking.reference})`,
    heading: "Hold released",
    paragraphs: ["Everything looks good, so we've released your security hold. Your bank may take a few days to clear it. Thank you!"],
    rows: bookingRows(booking),
  });
}

export async function notifyChargeForDamage(booking: BookingRow, paymentId: string, amountCents: number, note: string) {
  await toCustomer(booking, `damage:${paymentId}`, {
    subject: `A charge on your ${site.name} booking (${booking.reference})`,
    heading: "A charge on your booking",
    paragraphs: [
      `As itemized in our earlier email, we charged ${moneyFromCents(amountCents)} under your rental agreement.`,
      `Reason: ${note}`,
      "Any part of a security hold that wasn't charged has been released.",
    ],
    rows: bookingRows(booking),
  });
}

type PaidSession = Parameters<typeof recordPayment>[0];

// Called from both the webhook and the return page. Safe to run twice.
export async function confirmPaidSession(session: PaidSession) {
  const status = await recordPayment(session);
  const booking = await findBookingBySession(session.id);
  if (booking && status === "confirmed") await notifyBookingConfirmed(booking);
  if (booking && status === "needs_review") {
    await toOwner(booking, `owner-review:${booking.id}`, "A paid booking needs your review", [
      "Stripe took this payment, but it didn't match an active hold or the expected amount. Check it in Stripe and contact the customer.",
    ]);
  }
  await deliverPendingEmails().catch((error) => console.error("Email delivery failed", error));
  return status;
}
