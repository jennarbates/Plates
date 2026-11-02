import { z } from "zod";
import { checkRentalAvailability } from "@/lib/bookings";

const schema = z.object({
  lines: z.array(z.object({ slug: z.string().max(100), quantity: z.number().int().min(1).max(100) })).min(1).max(60),
  pickup: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  extraDays: z.number().int().min(0).max(2),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { lines, pickup, extraDays } = parsed.data;
  return Response.json({ unavailable: await checkRentalAvailability(lines, pickup, extraDays) });
}
