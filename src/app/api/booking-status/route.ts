import { connection, type NextRequest } from "next/server";
import { syncPaidSession } from "@/lib/checkout";

// The Stripe session id is long and unguessable, so it works as the key to this one booking.
export async function GET(request: NextRequest) {
  await connection();
  const sessionId = request.nextUrl.searchParams.get("session_id");
  const booking = sessionId ? await syncPaidSession(sessionId) : null;
  if (!booking) return Response.json({ status: "not_found" }, { status: 404 });
  return Response.json({
    status: booking.status,
    reference: booking.reference,
    kind: booking.kind,
    firstName: booking.customer_name.split(" ")[0],
    email: booking.customer_email,
    startDate: booking.start_date,
    endDate: booking.end_date,
    timeSlot: booking.time_slot,
    dueNowCents: booking.due_now_cents,
    balanceCents: booking.balance_cents,
    securityHoldCents: booking.security_hold_cents,
  });
}
