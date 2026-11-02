import { expireBooking, findBookingBySession } from "@/lib/bookings";
import { getStripe, paidSessionDetails } from "@/lib/checkout";
import { confirmPaidSession } from "@/lib/notifications";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!stripe || !secret || !signature) return Response.json({ error: "Not configured" }, { status: 400 });

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" && event.data.object.payment_status === "paid") {
    await confirmPaidSession(paidSessionDetails(event.data.object));
  }
  if (event.type === "checkout.session.expired") {
    const booking = await findBookingBySession(event.data.object.id);
    if (booking) await expireBooking(booking.id);
  }
  return Response.json({ received: true });
}
