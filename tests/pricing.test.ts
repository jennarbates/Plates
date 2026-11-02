import { describe, expect, it } from "vitest";
import { checkoutSchema } from "@/lib/orders";
import { quoteRental, quoteSetup } from "@/lib/pricing";

const signature = {
  fullName: "Test Renter",
  email: "test@example.com",
  phone: "4135550100",
  agreed: true,
  adult: true,
  initials: [true, true, true, true],
  noPhotos: false,
};

describe("setup prices", () => {
  it("adds add-ons, the Feb 14 fee and the waiver, and takes 50% of the setup price today", () => {
    const quote = quoteSetup({
      mode: "date",
      packageSlug: "showstopper",
      addOnIds: ["bouquet"],
      extraHours: 1,
      waiver: true,
      date: "2027-02-14",
    });
    expect(quote.totalCents).toBe(33250);
    expect(quote.dueNowCents).toBe(11250);
    expect(quote.balanceCents).toBe(22000);
    expect(quote.securityHoldCents).toBe(10000);
  });

  it("prices groups per guest and ignores the date-only add-on", () => {
    const quote = quoteSetup({
      mode: "group",
      guests: 8,
      pastries: true,
      bakeBar: true,
      addOnIds: ["bake-together"],
      extraHours: 0,
      waiver: false,
    });
    expect(quote.totalCents).toBe(42400);
    expect(quote.dueNowCents).toBe(18000);
  });
});

describe("rental prices", () => {
  it("charges kits in full, pieces 50%, and adds both kinds of deposit", () => {
    const quote = quoteRental({
      lines: [
        { slug: "hexagonal-glasses", quantity: 5 },
        { slug: "galentines-heart", quantity: 1 },
      ],
      extraDays: 1,
      waiver: true,
    });
    expect(quote.totalCents).toBe(2950);
    expect(quote.dueNowCents).toBe(2700);
    expect(quote.balanceCents).toBe(250);
    expect(quote.securityHoldCents).toBe(11000);
  });
});

describe("what the browser may send", () => {
  const rental = { kind: "rental", lines: [{ slug: "heart-pan", quantity: 1 }], pickup: "2027-01-08", signature };

  it("accepts a complete order and ignores any price it sends", () => {
    const parsed = checkoutSchema.parse({ ...rental, totalCents: 1, dueNowCents: 1 });
    expect(parsed).not.toHaveProperty("totalCents");
  });

  it.each([
    ["an unknown item", { lines: [{ slug: "nope", quantity: 1 }] }],
    ["more than exist", { lines: [{ slug: "heart-pan", quantity: 2 }] }],
    ["a kit not offered yet", { lines: [{ slug: "seaside-supper", quantity: 1 }] }],
    ["an impossible date", { pickup: "2027-02-31" }],
    ["a missing Addendum B confirmation", { signature: { ...signature, initials: [true, true, true, false] } }],
    ["an unsigned agreement", { signature: { ...signature, agreed: false } }],
    ["a duplicate item", { lines: [{ slug: "hexagonal-glasses", quantity: 1 }, { slug: "hexagonal-glasses", quantity: 1 }] }],
  ])("rejects %s", (_name, change) => {
    expect(checkoutSchema.safeParse({ ...rental, ...change }).success).toBe(false);
  });

  it("rejects a time slot that doesn't exist", () => {
    const setup = { kind: "setup", mode: "date", packageSlug: "full-tea", date: "2027-01-08", address: "1 Main St", signature };
    expect(checkoutSchema.safeParse({ ...setup, slot: "2:00 pm" }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...setup, slot: "3:33 am" }).success).toBe(false);
  });
});
