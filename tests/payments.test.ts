import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as cronRoute } from "@/app/api/cron/payments/route";
import { POST as adminRoute } from "@/app/admin/api/payments/route";
import { attachStripeSession, createPendingBooking, findBookingById } from "@/lib/bookings";
import { getDb } from "@/lib/db";
import { deliverPendingEmails, escapeHtml } from "@/lib/email";
import { confirmPaidSession } from "@/lib/notifications";
import { checkoutSchema } from "@/lib/orders";
import { captureHold, cancelBooking, chargeExtra, listPayments, releaseHold, retryPayment, runScheduledPayments } from "@/lib/payments";

const signature = {
  fullName: "Test Renter",
  email: "renter@example.com",
  phone: "4135550100",
  agreed: true,
  adult: true,
  initials: [true, true, true, true],
  noPhotos: false,
};
const request = { ip: null, userAgent: null };

type Call = { method: string; path: string; body: URLSearchParams; idempotency: string | undefined };
let server: Server;
let stripeCalls: Call[] = [];
let sentEmails: { to: string[]; subject: string; html: string; text: string }[] = [];
let declineNext = 0;
let emailDown = false;
let intent = 0;

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/emails") {
        if (emailDown) {
          res.statusCode = 500;
          res.end("{}");
          return;
        }
        sentEmails.push(JSON.parse(raw));
        res.end(JSON.stringify({ id: "email_1" }));
        return;
      }
      const body = new URLSearchParams(raw);
      stripeCalls.push({ method: req.method ?? "", path: req.url ?? "", body, idempotency: req.headers["idempotency-key"] as string | undefined });
      if (req.method === "GET") {
        res.end(JSON.stringify({ id: req.url?.split("/").pop(), object: "payment_intent", payment_method: "pm_saved" }));
        return;
      }
      if (req.url === "/v1/payment_intents") {
        if (declineNext > 0) {
          declineNext -= 1;
          res.statusCode = 402;
          res.end(JSON.stringify({ error: { type: "card_error", code: "card_declined", message: "Declined", payment_intent: { id: "pi_declined" } } }));
          return;
        }
        intent += 1;
        const manual = body.get("capture_method") === "manual";
        res.end(JSON.stringify({
          id: `pi_${intent}`,
          object: "payment_intent",
          status: manual ? "requires_capture" : "succeeded",
          latest_charge: manual ? { id: "ch_1", object: "charge", payment_method_details: { card: { capture_before: 1900000000 } } } : null,
        }));
        return;
      }
      res.end(JSON.stringify({ id: req.url?.split("/")[3], object: "payment_intent", status: req.url?.endsWith("/cancel") ? "canceled" : "succeeded" }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.STRIPE_SECRET_KEY = "sk_test_local";
  process.env.STRIPE_API_BASE = base;
  process.env.EMAIL_API_BASE = base;
  process.env.RESEND_API_KEY = "re_test_local";
  process.env.EMAIL_FROM = "War and Peas <hello@example.com>";
  process.env.OWNER_EMAIL = "owner@example.com";
});

afterAll(() => server.close());

beforeEach(() => {
  stripeCalls = [];
  sentEmails = [];
  declineNext = 0;
  emailDown = false;
});

let session = 0;

async function confirmedSetup(date: string, name = signature.fullName) {
  const order = checkoutSchema.parse({
    kind: "setup",
    mode: "date",
    packageSlug: "showstopper",
    date,
    slot: "2:00 pm",
    address: "1 Main St, Amherst",
    signature: { ...signature, fullName: name },
  });
  const booking = await createPendingBooking(order, request);
  session += 1;
  await attachStripeSession(booking.id, `cs_${session}`);
  await confirmPaidSession({ id: `cs_${session}`, amountTotal: booking.due_now_cents, paymentIntentId: "pi_first", customerId: "cus_1" });
  stripeCalls = [];
  sentEmails = [];
  return booking;
}

async function confirmedRental(pickup: string, slug: string, quantity = 1) {
  const order = checkoutSchema.parse({ kind: "rental", lines: [{ slug, quantity }], pickup, signature });
  const booking = await createPendingBooking(order, request);
  session += 1;
  await attachStripeSession(booking.id, `cs_${session}`);
  await confirmPaidSession({ id: `cs_${session}`, amountTotal: booking.due_now_cents, paymentIntentId: "pi_first", customerId: "cus_1" });
  stripeCalls = [];
  sentEmails = [];
  return booking;
}

async function paymentOf(bookingId: string, kind: string) {
  return (await listPayments([bookingId])).find((payment) => payment.kind === kind);
}

// 3 pm in Massachusetts on the given date.
const at = (date: string) => new Date(`${date}T20:00:00Z`);
const creates = () => stripeCalls.filter((call) => call.method === "POST" && call.path === "/v1/payment_intents");

describe("scheduled balance charges", () => {
  it("charges a setup balance 48 hours before, once, on the saved card", async () => {
    const booking = await confirmedSetup("2027-03-10");

    await runScheduledPayments(at("2027-03-07"));
    expect(await paymentOf(booking.id, "balance")).toBeUndefined();

    await runScheduledPayments(at("2027-03-08"));
    expect((await paymentOf(booking.id, "balance"))?.status).toBe("succeeded");
    const charge = creates().find((call) => call.body.get("capture_method") !== "manual");
    expect(charge?.body.get("amount")).toBe("11250");
    expect(charge?.body.get("customer")).toBe("cus_1");
    expect(charge?.body.get("payment_method")).toBe("pm_saved");
    expect(charge?.body.get("off_session")).toBe("true");
    expect(charge?.body.get("confirm")).toBe("true");
    expect(charge?.idempotency).toBe(`balance-${booking.id}-1`);

    stripeCalls = [];
    await runScheduledPayments(at("2027-03-08"));
    await runScheduledPayments(at("2027-03-09"));
    expect(creates().filter((call) => call.body.get("capture_method") !== "manual")).toHaveLength(0);
  });

  it("charges an individual piece balance on the pickup date", async () => {
    const booking = await confirmedRental("2027-04-20", "hexagonal-glasses", 10);
    await runScheduledPayments(at("2027-04-19"));
    expect(await paymentOf(booking.id, "balance")).toBeUndefined();
    await runScheduledPayments(at("2027-04-20"));
    expect((await paymentOf(booking.id, "balance"))?.amount_cents).toBe(500);
  });

  it("uses the Massachusetts date even when it is already tomorrow in UTC", async () => {
    const booking = await confirmedSetup("2027-05-10");
    await runScheduledPayments(new Date("2027-05-08T02:00:00Z")); // Still 10 pm on May 7 locally.
    expect(await paymentOf(booking.id, "balance")).toBeUndefined();
  });

  it("never charges an unpaid booking or a finished one", async () => {
    const unpaid = checkoutSchema.parse({ kind: "setup", mode: "date", packageSlug: "full-tea", date: "2027-06-10", slot: "2:00 pm", address: "1 Main St", signature });
    const pending = await createPendingBooking(unpaid, request);
    const past = await confirmedSetup("2027-06-02");
    await runScheduledPayments(at("2027-06-09"));
    expect(await paymentOf(pending.id, "balance")).toBeUndefined();
    expect(await paymentOf(past.id, "balance")).toBeUndefined();
  });
});

describe("declined cards", () => {
  it("emails both people, retries once a day, and stops after 3 tries", async () => {
    const booking = await confirmedSetup("2027-07-10");
    declineNext = 2; // Fails the balance and the hold-free first run.
    await runScheduledPayments(at("2027-07-08"));

    const failed = await paymentOf(booking.id, "balance");
    expect(failed?.status).toBe("failed");
    expect(failed?.failure_code).toBe("card_declined");
    expect(sentEmails.some((email) => email.to[0] === "renter@example.com" && email.subject.includes("your") && email.text.includes("didn't approve"))).toBe(true);
    expect(sentEmails.some((email) => email.to[0] === "owner@example.com" && email.subject.includes("balance failed"))).toBe(true);

    declineNext = 10;
    stripeCalls = [];
    await runScheduledPayments(at("2027-07-08"));
    expect(creates().filter((call) => call.idempotency?.startsWith("balance"))).toHaveLength(0);

    const db = await getDb();
    const age = () => db.query(`UPDATE payments SET updated_at = now() - interval '25 hours' WHERE booking_id = $1`, [booking.id]);
    await age();
    await runScheduledPayments(at("2027-07-09"));
    expect((await paymentOf(booking.id, "balance"))?.attempts).toBe(2);
    await age();
    await runScheduledPayments(at("2027-07-09"));
    expect((await paymentOf(booking.id, "balance"))?.attempts).toBe(3);

    await age();
    stripeCalls = [];
    await runScheduledPayments(at("2027-07-10"));
    expect(creates().filter((call) => call.idempotency?.startsWith("balance"))).toHaveLength(0);

    declineNext = 0;
    expect(await retryPayment(booking.id, "balance")).toBe("succeeded");
    expect((await paymentOf(booking.id, "balance"))?.status).toBe("succeeded");
  });
});

describe("security holds", () => {
  it("places a hold the day before, and doesn't charge it", async () => {
    const booking = await confirmedSetup("2027-08-10");
    await runScheduledPayments(at("2027-08-08"));
    expect(await paymentOf(booking.id, "security_hold")).toBeUndefined();

    await runScheduledPayments(at("2027-08-09"));
    const hold = await paymentOf(booking.id, "security_hold");
    expect(hold?.status).toBe("held");
    expect(hold?.amount_cents).toBe(10000);
    expect(hold?.capture_before).toBeTruthy();
    expect(creates().some((call) => call.body.get("capture_method") === "manual" && call.body.get("amount") === "10000")).toBe(true);
  });

  async function heldBooking(date: string, dayBefore: string) {
    const booking = await confirmedSetup(date);
    await runScheduledPayments(at(dayBefore));
    stripeCalls = [];
    sentEmails = [];
    return booking;
  }

  it("releases a hold, and a second click does nothing", async () => {
    const booking = await heldBooking("2027-09-10", "2027-09-09");
    await releaseHold(booking.id);
    expect((await paymentOf(booking.id, "security_hold"))?.status).toBe("released");
    expect(stripeCalls.some((call) => call.path.endsWith("/cancel"))).toBe(true);
    expect(sentEmails.some((email) => email.subject.includes("released"))).toBe(true);
    await expect(releaseHold(booking.id)).rejects.toThrow("no active hold");
  });

  it("charges part of a hold, with the reason sent to the customer", async () => {
    const booking = await heldBooking("2027-10-10", "2027-10-09");
    await captureHold(booking.id, { amountCents: 3500, note: "Chipped dessert plate", itemizedListSent: true });
    const hold = await paymentOf(booking.id, "security_hold");
    expect(hold?.status).toBe("captured");
    expect(hold?.captured_cents).toBe(3500);
    expect(stripeCalls.find((call) => call.path.endsWith("/capture"))?.body.get("amount_to_capture")).toBe("3500");
    expect(sentEmails.some((email) => email.text.includes("Chipped dessert plate"))).toBe(true);
  });

  it("refuses to charge without the itemized list, a reason, or within the hold", async () => {
    const booking = await heldBooking("2027-11-10", "2027-11-09");
    await expect(captureHold(booking.id, { amountCents: 100, note: "Chipped plate", itemizedListSent: false })).rejects.toThrow("itemized");
    await expect(captureHold(booking.id, { amountCents: 100, note: "", itemizedListSent: true })).rejects.toThrow("reason");
    await expect(captureHold(booking.id, { amountCents: 10001, note: "Chipped plate", itemizedListSent: true })).rejects.toThrow("more than the hold");
    expect((await paymentOf(booking.id, "security_hold"))?.status).toBe("held");
    expect(stripeCalls.filter((call) => call.path.endsWith("/capture"))).toHaveLength(0);
  });

  it("charges the saved card above the hold", async () => {
    const booking = await heldBooking("2027-12-10", "2027-12-09");
    await chargeExtra(booking.id, { amountCents: 12000, note: "Replacement teapot", itemizedListSent: true });
    expect((await paymentOf(booking.id, "extra"))?.status).toBe("succeeded");
    expect(creates()[0].body.get("amount")).toBe("12000");
  });
});

describe("cancelling", () => {
  it("stops future charges and releases the hold", async () => {
    const booking = await confirmedSetup("2028-01-10");
    await runScheduledPayments(at("2028-01-09"));
    await cancelBooking(booking.id);
    expect((await findBookingById(booking.id))?.status).toBe("cancelled");
    expect((await paymentOf(booking.id, "security_hold"))?.status).toBe("released");

    const later = await confirmedSetup("2028-02-10");
    await cancelBooking(later.id);
    stripeCalls = [];
    await runScheduledPayments(at("2028-02-09"));
    expect(creates().filter((call) => call.idempotency?.includes(later.id))).toHaveLength(0);
    await expect(retryPayment(later.id, "balance")).rejects.toThrow("Only confirmed");
  });

  it("keeps a cancelled booking cancelled if Stripe repeats a payment notice", async () => {
    const booking = await confirmedSetup("2028-02-20");
    await cancelBooking(booking.id);
    const { rows } = await (await getDb()).query<{ stripe_session_id: string }>(`SELECT stripe_session_id FROM bookings WHERE id = $1`, [booking.id]);
    await confirmPaidSession({ id: rows[0].stripe_session_id, amountTotal: booking.due_now_cents, paymentIntentId: "pi_first", customerId: "cus_1" });
    expect((await findBookingById(booking.id))?.status).toBe("cancelled");
  });
});

describe("emails", () => {
  it("sends one confirmation and one owner alert, even if Stripe notifies twice", async () => {
    const order = checkoutSchema.parse({ kind: "setup", mode: "date", packageSlug: "full-tea", date: "2028-03-10", slot: "11:00 am", address: "1 Main St", signature });
    const booking = await createPendingBooking(order, request);
    await attachStripeSession(booking.id, "cs_email");
    const paid = { id: "cs_email", amountTotal: booking.due_now_cents, paymentIntentId: "pi_first", customerId: "cus_1" };
    await confirmPaidSession(paid);
    await confirmPaidSession(paid);

    expect(sentEmails.filter((email) => email.subject.includes("confirmed"))).toHaveLength(1);
    expect(sentEmails.filter((email) => email.to[0] === "owner@example.com")).toHaveLength(1);
    const confirmation = sentEmails.find((email) => email.subject.includes("confirmed"));
    expect(confirmation?.to).toEqual(["renter@example.com"]);
    expect(confirmation?.text).toContain(booking.reference);
    expect(confirmation?.text).toContain("$72.50");
  });

  it("keeps an email and sends it later if the mail service is down", async () => {
    emailDown = true;
    const booking = await confirmedRentalKeepingEmails();
    expect((await findBookingById(booking.id))?.status).toBe("confirmed");
    expect(sentEmails).toHaveLength(0);
    emailDown = false;
    await deliverPendingEmails();
    expect(sentEmails.some((email) => email.subject.includes("confirmed"))).toBe(true);
  });

  async function confirmedRentalKeepingEmails() {
    const order = checkoutSchema.parse({ kind: "rental", lines: [{ slug: "heart-pan", quantity: 1 }], pickup: "2028-04-10", signature });
    const booking = await createPendingBooking(order, request);
    await attachStripeSession(booking.id, "cs_outage");
    await confirmPaidSession({ id: "cs_outage", amountTotal: booking.due_now_cents, paymentIntentId: "pi_first", customerId: "cus_1" });
    return booking;
  }

  it("makes customer text safe in emails", async () => {
    expect(escapeHtml(`<script>"x"&'y'</script>`)).toBe("&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;");
    await confirmedSetup("2028-05-10");
    const booking = await confirmedSetup("2028-05-11", "<b>Sneaky</b> Name");
    const db = await getDb();
    const { rows } = await db.query<{ html: string }>(`SELECT html FROM emails WHERE booking_id = $1 AND dedupe_key LIKE 'confirmed:%'`, [booking.id]);
    expect(rows[0].html).toContain("&lt;b&gt;Sneaky&lt;/b&gt;");
    expect(rows[0].html).not.toContain("<b>Sneaky");
  });
});

describe("access", () => {
  it("guards the scheduled job", async () => {
    const call = (authorization?: string) =>
      cronRoute(new Request("http://localhost/api/cron/payments", { headers: authorization ? { authorization } : {} }));
    expect((await call()).status).toBe(404);
    process.env.CRON_SECRET = "right-secret";
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong-secret")).status).toBe(401);
    expect((await call("Bearer right-secret")).status).toBe(200);
    delete process.env.CRON_SECRET;
  });

  it("refuses owner actions started on another website", async () => {
    const booking = await confirmedSetup("2028-06-10");
    const post = (origin: string | null) =>
      adminRoute(
        new Request("http://localhost:3000/admin/api/payments", {
          method: "POST",
          headers: origin ? { origin } : {},
          body: JSON.stringify({ action: "cancel", bookingId: booking.id }),
        }),
      );
    expect((await post("https://evil.example")).status).toBe(403);
    expect((await post(null)).status).toBe(403);
    expect((await findBookingById(booking.id))?.status).toBe("confirmed");
    expect((await post("http://localhost:3000")).status).toBe(200);
    expect((await findBookingById(booking.id))?.status).toBe("cancelled");
  });
});
