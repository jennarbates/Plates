import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import Stripe from "stripe";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { POST as checkoutRoute } from "@/app/api/checkout/route";
import { POST as webhookRoute } from "@/app/api/stripe/webhook/route";
import { findBookingBySession } from "@/lib/bookings";
import { getStripe, syncPaidSession } from "@/lib/checkout";

const signature = {
  fullName: "Test Renter",
  email: "test@example.com",
  phone: "4135550100",
  agreed: true,
  adult: true,
  initials: [true, true, true, true],
  noPhotos: false,
};
const webhookSecret = "whsec_local_test";

// A small stand-in for Stripe's API, so these tests never touch a real account.
let server: Server;
let requests: { method: string; path: string; body: URLSearchParams }[] = [];
let nextSession = 0;
let failNextCreate = false;

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      requests.push({ method: req.method ?? "", path: req.url ?? "", body: new URLSearchParams(raw) });
      res.setHeader("Content-Type", "application/json");
      if (req.method === "POST" && req.url === "/v1/checkout/sessions") {
        if (failNextCreate) {
          failNextCreate = false;
          res.statusCode = 400;
          res.end(JSON.stringify({ error: { message: "Stripe rejected this", type: "invalid_request_error" } }));
          return;
        }
        nextSession += 1;
        res.end(JSON.stringify({ id: `cs_test_${nextSession}`, object: "checkout.session", url: `https://stripe.test/pay/${nextSession}` }));
        return;
      }
      const id = req.url?.split("/").pop();
      res.end(JSON.stringify({ id, object: "checkout.session", status: "complete", payment_status: "paid", amount_total: 500, payment_intent: "pi_sync", customer: "cus_sync" }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  process.env.STRIPE_SECRET_KEY = "sk_test_local";
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
  process.env.STRIPE_API_BASE = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());
afterEach(() => {
  requests = [];
});

function order(pickup: string, slug = "heart-pan") {
  return { kind: "rental", lines: [{ slug, quantity: 1 }], pickup, signature };
}

function post(body: unknown) {
  return checkoutRoute(
    new Request("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1", "user-agent": "vitest" },
      body: JSON.stringify(body),
    }),
  );
}

function webhook(event: object, secret = webhookSecret) {
  const payload = JSON.stringify(event);
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return webhookRoute(
    new Request("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": header },
      body: payload,
    }),
  );
}

function completedEvent(sessionId: string, amount: number) {
  return {
    id: `evt_${sessionId}`,
    object: "event",
    type: "checkout.session.completed",
    data: { object: { id: sessionId, object: "checkout.session", payment_status: "paid", amount_total: amount, payment_intent: "pi_1", customer: "cus_1" } },
  };
}

describe("starting checkout", () => {
  it("charges the server's price, saves the card for later, and sends the customer to Stripe", async () => {
    const response = await post({ ...order("2028-01-10"), dueNowCents: 1 });
    expect(response.status).toBe(200);
    expect((await response.json()).url).toContain("https://stripe.test/pay/");

    const { body } = requests[0];
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("500");
    expect(body.get("payment_intent_data[setup_future_usage]")).toBe("off_session");
    expect(body.get("allowed_payment_method_types[0]")).toBe("card");
    expect(body.get("customer_email")).toBe("test@example.com");
  });

  it("refuses items that are already taken without calling Stripe", async () => {
    await post(order("2028-02-10", "madeleine-pan"));
    requests = [];
    const response = await post(order("2028-02-11", "madeleine-pan"));
    expect(response.status).toBe(409);
    expect((await response.json()).unavailable).toEqual(["madeleine-pan"]);
    expect(requests).toHaveLength(0);
  });

  it("rejects an unsigned order", async () => {
    const response = await post({ ...order("2028-03-10"), signature: { ...signature, agreed: false } });
    expect(response.status).toBe(400);
    expect(requests).toHaveLength(0);
  });

  it("puts items back if Stripe fails", async () => {
    failNextCreate = true;
    expect((await post(order("2028-04-10", "springform-pan"))).status).toBe(500);
    expect((await post(order("2028-04-10", "springform-pan"))).status).toBe(200);
  });

  it("books nothing when Stripe isn't connected", async () => {
    const key = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    const response = await post(order("2028-05-10", "fluted-tart-pan"));
    process.env.STRIPE_SECRET_KEY = key;
    expect(response.status).toBe(503);
    expect((await post(order("2028-05-10", "fluted-tart-pan"))).status).toBe(200);
  });

  it("won't use a live key until live payments are switched on", () => {
    const key = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_live_example";
    expect(getStripe()).toBeNull();
    process.env.ALLOW_LIVE_PAYMENTS = "true";
    expect(getStripe()).not.toBeNull();
    delete process.env.ALLOW_LIVE_PAYMENTS;
    process.env.STRIPE_SECRET_KEY = key;
  });
});

describe("Stripe's payment notices", () => {
  async function startSession(pickup: string, slug: string) {
    await post(order(pickup, slug));
    return `cs_test_${nextSession}`;
  }

  it("confirms the booking from a correctly signed notice", async () => {
    const session = await startSession("2028-06-10", "lamb-bunny-mold");
    expect((await webhook(completedEvent(session, 800))).status).toBe(200);
    expect((await findBookingBySession(session))?.status).toBe("confirmed");
  });

  it("ignores a forged notice", async () => {
    const session = await startSession("2028-07-10", "number-letter-pan");
    expect((await webhook(completedEvent(session, 500), "whsec_wrong")).status).toBe(400);
    expect((await findBookingBySession(session))?.status).toBe("pending_payment");
  });

  it("releases items when the Stripe session expires", async () => {
    const session = await startSession("2028-08-10", "tiered-round-set");
    await webhook({ id: "evt_expired", object: "event", type: "checkout.session.expired", data: { object: { id: session, object: "checkout.session" } } });
    expect((await findBookingBySession(session))?.status).toBe("expired");
  });

  it("confirms when the customer returns before the notice arrives", async () => {
    const session = await startSession("2028-09-10", "mini-muffin-pan");
    expect((await syncPaidSession(session))?.status).toBe("confirmed");
  });
});
