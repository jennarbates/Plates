import { connection } from "next/server";
import { listBookings } from "@/lib/bookings";
import { listPayments } from "@/lib/payments";

// Protected by the password check in src/proxy.ts.
export async function GET() {
  await connection();
  const bookings = await listBookings();
  const payments = bookings.length ? await listPayments(bookings.map((booking) => booking.id)) : [];
  return Response.json({
    bookings: bookings.map((booking) => ({
      ...booking,
      payments: payments.filter((payment) => payment.booking_id === booking.id),
    })),
  });
}
