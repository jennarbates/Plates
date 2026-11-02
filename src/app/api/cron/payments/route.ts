import { timingSafeEqual } from "node:crypto";
import { runScheduledPayments } from "@/lib/payments";

function matches(supplied: string, secret: string) {
  const a = Buffer.from(supplied);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Called hourly by a scheduler. Hosts differ on GET or POST, so both are accepted.
async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("Not found", { status: 404 });
  if (!matches(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await runScheduledPayments());
}

export const GET = run;
export const POST = run;
