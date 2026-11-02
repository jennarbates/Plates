import { connection, type NextRequest } from "next/server";
import { nextOpenSetupDates, openSetupSlots } from "@/lib/bookings";

export async function GET(request: NextRequest) {
  await connection();
  const date = request.nextUrl.searchParams.get("date");
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "Invalid date" }, { status: 400 });
    return Response.json({ slots: await openSetupSlots(date) });
  }
  return Response.json({ dates: await nextOpenSetupDates(4) });
}
