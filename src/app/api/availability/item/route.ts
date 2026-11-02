import { connection, type NextRequest } from "next/server";
import { fullDaysForItem } from "@/lib/bookings";

export async function GET(request: NextRequest) {
  await connection();
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const month = request.nextUrl.searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) return Response.json({ error: "Invalid month" }, { status: 400 });
  return Response.json({ fullDays: await fullDaysForItem(slug, month) });
}
