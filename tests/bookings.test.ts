import { describe, expect, it } from "vitest";
import {
  checkRentalAvailability,
  createPendingBooking,
  expireBooking,
  fullDaysForItem,
  nextOpenSetupDates,
  openSetupSlots,
  recordPayment,
  attachStripeSession,
  findBookingById,
  UnavailableError,
} from "@/lib/bookings";
import { getDb } from "@/lib/db";
import { checkoutSchema } from "@/lib/orders";

const signature = {
  fullName: "Test Renter",
  email: "test@example.com",
  phone: "4135550100",
  agreed: true,
  adult: true,
  initials: [true, true, true, true],
  noPhotos: true,
};
const request = { ip: "203.0.113.9", userAgent: "vitest" };

const rental = (pickup: string, lines: { slug: string; quantity: number }[], extraDays = 0) =>
  checkoutSchema.parse({ kind: "rental", lines, pickup, extraDays, signature });
const setup = (date: string, slot: string) =>
  checkoutSchema.parse({ kind: "setup", mode: "date", packageSlug: "full-tea", date, slot, address: "1 Main St", signature });

describe("setup slots", () => {
  it("allows one setup per slot and frees the slot if the booking expires", async () => {
    const first = await createPendingBooking(setup("2027-03-05", "2:00 pm"), request);
    expect(await openSetupSlots("2027-03-05")).toEqual(["11:00 am", "5:00 pm"]);
    await expect(createPendingBooking(setup("2027-03-05", "2:00 pm"), request)).rejects.toBeInstanceOf(UnavailableError);
    await createPendingBooking(setup("2027-03-05", "11:00 am"), request);

    await expireBooking(first.id);
    expect(await openSetupSlots("2027-03-05")).toContain("2:00 pm");
    await createPendingBooking(setup("2027-03-05", "2:00 pm"), request);
  });

  it("skips fully booked dates in the next open dates", async () => {
    const [firstOpen] = await nextOpenSetupDates(1);
    for (const slot of ["11:00 am", "2:00 pm", "5:00 pm"]) await createPendingBooking(setup(firstOpen, slot), request);
    expect(await nextOpenSetupDates(4)).not.toContain(firstOpen);
  });
});

describe("rental inventory", () => {
  it("never books more than exist, including the day blocked for washing", async () => {
    const glasses = (quantity: number) => [{ slug: "hexagonal-glasses", quantity }];
    await createPendingBooking(rental("2027-04-01", glasses(15)), request); // Out through Apr 4.

    await expect(createPendingBooking(rental("2027-04-02", glasses(6)), request)).rejects.toBeInstanceOf(UnavailableError);
    await createPendingBooking(rental("2027-04-02", glasses(5)), request);

    // Apr 4 return plus 1 washing day: Apr 5 still clashes, Apr 6 is clear.
    expect(await checkRentalAvailability(glasses(20), "2027-04-05", 0)).toEqual(["hexagonal-glasses"]);
    expect(await checkRentalAvailability(glasses(15), "2027-04-07", 0)).toEqual([]);
    // A Mar 28 pickup returns Mar 31 and needs Apr 1 for washing, so it clashes. Mar 27 doesn't.
    expect(await checkRentalAvailability(glasses(20), "2027-03-28", 0)).toEqual(["hexagonal-glasses"]);
    expect(await checkRentalAvailability(glasses(20), "2027-03-27", 0)).toEqual([]);
  });

  it("shares pieces between kits and individual rentals, both ways", async () => {
    await createPendingBooking(rental("2027-05-01", [{ slug: "heart-pan", quantity: 1 }]), request);
    expect(await checkRentalAvailability([{ slug: "galentines-heart", quantity: 1 }], "2027-05-02", 0)).toEqual(["galentines-heart"]);

    await createPendingBooking(rental("2027-06-01", [{ slug: "bud-vase-bar", quantity: 1 }]), request);
    expect(await checkRentalAvailability([{ slug: "pressed-glass-bud-vases", quantity: 1 }], "2027-06-02", 0)).toEqual(["pressed-glass-bud-vases"]);
  });

  it("rejects a cart that needs the same piece twice", async () => {
    const lines = [
      { slug: "heart-pan", quantity: 1 },
      { slug: "galentines-heart", quantity: 1 },
    ];
    await expect(createPendingBooking(rental("2027-07-01", lines), request)).rejects.toBeInstanceOf(UnavailableError);
  });

  it("lets only one of two simultaneous customers take the last piece", async () => {
    const order = rental("2027-08-01", [{ slug: "madeleine-pan", quantity: 1 }]);
    const results = await Promise.allSettled([createPendingBooking(order, request), createPendingBooking(order, request)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  });

  it("releases items when an unpaid hold runs out", async () => {
    const order = rental("2027-09-01", [{ slug: "vintage-bundt", quantity: 1 }]);
    const booking = await createPendingBooking(order, request);
    expect(await checkRentalAvailability(order.kind === "rental" ? order.lines : [], "2027-09-01", 0)).toEqual(["vintage-bundt"]);
    const db = await getDb();
    await db.query(`UPDATE bookings SET hold_expires_at = now() - interval '1 minute' WHERE id = $1`, [booking.id]);
    expect(await checkRentalAvailability([{ slug: "vintage-bundt", quantity: 1 }], "2027-09-01", 0)).toEqual([]);
    await createPendingBooking(order, request);
    expect((await findBookingById(booking.id))?.status).toBe("expired");
  });

  it("marks full days on the item calendar", async () => {
    await createPendingBooking(rental("2027-10-10", [{ slug: "fluted-tart-pan", quantity: 1 }]), request);
    const days = await fullDaysForItem("fluted-tart-pan", "2027-10");
    expect(days[0]).toBe("2027-10-09");
    expect(days.at(-1)).toBe("2027-10-14");
    expect(days).toHaveLength(6);
  });
});

describe("signatures and payments", () => {
  it("saves who signed which version, with their IP and photo choice", async () => {
    const booking = await createPendingBooking(rental("2027-11-01", [{ slug: "springform-pan", quantity: 1 }]), request);
    const db = await getDb();
    const { rows } = await db.query<Record<string, unknown>>(`SELECT * FROM signatures WHERE booking_id = $1`, [booking.id]);
    expect(rows[0]).toMatchObject({
      full_name: "Test Renter",
      agreement_version: "draft-2026-11-01",
      agreed: true,
      adult: true,
      no_photos: true,
      ip_address: "203.0.113.9",
    });
    expect(rows[0].addendum_initials).toEqual([true, true, true, true]);
  });

  async function paidBooking(date: string, slug: string) {
    const booking = await createPendingBooking(rental(date, [{ slug, quantity: 1 }]), request);
    await attachStripeSession(booking.id, `cs_${booking.id}`);
    return booking;
  }

  it("confirms on payment, and a repeated notice changes nothing", async () => {
    const booking = await paidBooking("2027-12-01", "mini-muffin-pan");
    const paid = { id: `cs_${booking.id}`, amountTotal: booking.due_now_cents, paymentIntentId: "pi_1", customerId: "cus_1" };
    expect(await recordPayment(paid)).toBe("confirmed");
    expect(await recordPayment(paid)).toBe("confirmed");
    expect((await findBookingById(booking.id))?.status).toBe("confirmed");
  });

  it("flags a payment for the wrong amount", async () => {
    const booking = await paidBooking("2027-12-05", "lamb-bunny-mold");
    const status = await recordPayment({ id: `cs_${booking.id}`, amountTotal: 1, paymentIntentId: "pi_2", customerId: "cus_2" });
    expect(status).toBe("needs_review");
  });

  it("flags a payment that arrives after its hold expired", async () => {
    const booking = await paidBooking("2027-12-10", "glass-gelatin-mold");
    await expireBooking(booking.id);
    const status = await recordPayment({ id: `cs_${booking.id}`, amountTotal: booking.due_now_cents, paymentIntentId: "pi_3", customerId: "cus_3" });
    expect(status).toBe("needs_review");
  });
});
