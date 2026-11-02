import { z } from "zod";
import { cancelPendingBooking } from "@/lib/checkout";

const schema = z.object({ booking: z.string().uuid() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  await cancelPendingBooking(parsed.data.booking);
  return Response.json({ ok: true });
}
