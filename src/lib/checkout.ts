// Starts a Stripe Checkout payment for a signed booking. Import from server code only.
import Stripe from "stripe";
import {
  attachStripeSession,
  createPendingBooking,
  expireBooking,
  findBookingById,
  findBookingBySession,
} from "@/lib/bookings";
import { confirmPaidSession } from "@/lib/notifications";
import type { CheckoutOrder } from "@/lib/orders";
import { site } from "@/lib/site";

export class PaymentsUnavailableError extends Error {}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // The agreement is still a draft, so live charges stay off until they're switched on deliberately.
  if (key.startsWith("sk_live_") && process.env.ALLOW_LIVE_PAYMENTS !== "true") return null;
  const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
  return new Stripe(key, {
    ...(base
      ? {
          host: base.hostname,
          port: Number(base.port),
          protocol: base.protocol.replace(":", "") as "http" | "https",
        }
      : {}),
  });
}

function textFor(booking: { kind: string; balance_cents: number }) {
  return booking.kind === "setup" ? "Setup booking deposit" : "Rental payment";
}

export async function startCheckout(
  order: CheckoutOrder,
  request: { ip: string | null; userAgent: string | null; origin: string },
) {
  const stripe = getStripe();
  if (!stripe) throw new PaymentsUnavailableError();

  const booking = await createPendingBooking(order, request);
  try {
    const siteUrl = process.env.SITE_URL ?? request.origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      customer_email: booking.customer_email,
      customer_creation: "always",
      client_reference_id: booking.id,
      metadata: { booking_id: booking.id, reference: booking.reference },
      payment_intent_data: {
        setup_future_usage: "off_session",
        metadata: { booking_id: booking.id, reference: booking.reference },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: booking.due_now_cents,
            product_data: {
              name: `${site.name}: ${textFor(booking)}`,
              description: `Booking ${booking.reference}`,
            },
          },
        },
      ],
      custom_text: {
        submit: {
          message:
            "Your card is saved for your balance, security hold and any charges allowed by the agreement you signed.",
        },
      },
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      success_url: `${siteUrl}/booking/confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/booking/cancelled?booking=${booking.id}`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout link");
    await attachStripeSession(booking.id, session.id);
    return { url: session.url, reference: booking.reference };
  } catch (error) {
    await expireBooking(booking.id);
    throw error;
  }
}

export function paidSessionDetails(session: Stripe.Checkout.Session) {
  const idOf = (value: string | { id: string } | null) => (typeof value === "string" ? value : (value?.id ?? null));
  return {
    id: session.id,
    amountTotal: session.amount_total,
    paymentIntentId: idOf(session.payment_intent),
    customerId: idOf(session.customer),
  };
}

// Covers a customer returning from Stripe before the webhook has arrived.
export async function syncPaidSession(sessionId: string) {
  const booking = await findBookingBySession(sessionId);
  if (!booking || booking.status !== "pending_payment") return booking;
  const stripe = getStripe();
  if (!stripe) return booking;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.status === "complete" && session.payment_status === "paid") {
    await confirmPaidSession(paidSessionDetails(session));
    return findBookingBySession(sessionId);
  }
  return booking;
}

// The customer backed out of Stripe, so their items go straight back on the shelf.
export async function cancelPendingBooking(bookingId: string) {
  const booking = await findBookingById(bookingId);
  if (!booking || booking.status !== "pending_payment") return;
  const stripe = getStripe();
  if (stripe && booking.stripe_session_id) {
    await stripe.checkout.sessions.expire(booking.stripe_session_id);
  }
  await expireBooking(bookingId);
}
