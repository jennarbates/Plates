import { UnavailableError } from "@/lib/bookings";
import { PaymentsUnavailableError, startCheckout } from "@/lib/checkout";
import { checkoutSchema } from "@/lib/orders";

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ code: "invalid", error: "Please check your details and try again." }, { status: 400 });
  }
  try {
    const { url } = await startCheckout(parsed.data, {
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
      origin: new URL(request.url).origin,
    });
    return Response.json({ url });
  } catch (error) {
    if (error instanceof PaymentsUnavailableError) {
      return Response.json(
        { code: "payments_unavailable", error: "Payments aren't connected yet, so nothing was booked or charged." },
        { status: 503 },
      );
    }
    if (error instanceof UnavailableError) {
      return Response.json({ code: "unavailable", error: error.message, unavailable: error.unavailable }, { status: 409 });
    }
    console.error("Checkout failed", error);
    return Response.json(
      { code: "failed", error: "We couldn't start checkout, and you weren't charged. Please try again." },
      { status: 500 },
    );
  }
}
