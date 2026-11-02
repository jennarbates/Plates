import { z } from "zod";
import {
  cancelBooking,
  captureHold,
  chargeExtra,
  PaymentActionError,
  releaseHold,
  retryPayment,
} from "@/lib/payments";

const charge = {
  amountCents: z.number().int().positive(),
  note: z.string().trim().min(3).max(1000),
  itemizedListSent: z.boolean(),
};

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("retry"), bookingId: z.string().uuid(), kind: z.enum(["balance", "security_hold"]) }),
  z.object({ action: z.literal("release"), bookingId: z.string().uuid() }),
  z.object({ action: z.literal("capture"), bookingId: z.string().uuid(), ...charge }),
  z.object({ action: z.literal("extra"), bookingId: z.string().uuid(), ...charge }),
  z.object({ action: z.literal("cancel"), bookingId: z.string().uuid() }),
]);

// Protected by the password check in src/proxy.ts. Browsers send that password automatically,
// so this also refuses requests that started on another website.
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin) && new URL(origin ?? "").host === new URL(request.url).host;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Not allowed" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please check the amount and reason." }, { status: 400 });

  const body = parsed.data;
  try {
    if (body.action === "retry") {
      const result = await retryPayment(body.bookingId, body.kind);
      return Response.json({ result });
    }
    if (body.action === "release") await releaseHold(body.bookingId);
    if (body.action === "capture") await captureHold(body.bookingId, body);
    if (body.action === "extra") await chargeExtra(body.bookingId, body);
    if (body.action === "cancel") await cancelBooking(body.bookingId);
    return Response.json({ result: "done" });
  } catch (error) {
    if (error instanceof PaymentActionError) return Response.json({ error: error.message }, { status: 409 });
    console.error("Payment action failed", error);
    return Response.json({ error: "Stripe couldn't complete that. Refresh and try again." }, { status: 502 });
  }
}
