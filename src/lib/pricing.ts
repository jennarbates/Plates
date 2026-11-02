// Pure price math in whole cents. The browser uses it to show totals,
// and the server recalculates it, so a customer can never set their own price.
import {
  addOns,
  extraHourPrice,
  feb14Surcharge,
  findRental,
  groupOptions,
  orderDeposit,
  packages,
  setupSecurityDeposit,
  type RentalItem,
} from "@/lib/catalog";

export const extraDayPerPan = 2;
export const standardRentalDays = 3;
const waiverRate = 0.1;

export type QuoteLine = { label: string; cents: number };

export type Quote = {
  lines: QuoteLine[];
  rentalFeeCents: number;
  waiverCents: number;
  totalCents: number;
  dueNowCents: number;
  balanceCents: number;
  securityHoldCents: number;
};

export type SetupSelection = {
  mode: "date" | "group";
  packageSlug?: string;
  guests?: number;
  pastries?: boolean;
  bakeBar?: boolean;
  addOnIds: string[];
  extraHours: number;
  waiver: boolean;
  date?: string;
};

export type RentalLine = { slug: string; quantity: number };

export type RentalSelection = {
  lines: RentalLine[];
  extraDays: number;
  waiver: boolean;
};

const cents = (dollars: number) => Math.round(dollars * 100);

export function quoteSetup(selection: SetupSelection): Quote {
  const lines: QuoteLine[] = [];
  let rentalFeeCents: number;

  if (selection.mode === "date") {
    const chosen = packages.find((item) => item.slug === selection.packageSlug) ?? packages[1];
    rentalFeeCents = cents(chosen.price);
    lines.push({ label: chosen.name, cents: rentalFeeCents });
  } else {
    const guests = selection.guests ?? groupOptions.minGuests;
    const perGuest = selection.pastries ? groupOptions.withPastries : groupOptions.setupOnly;
    rentalFeeCents = cents(perGuest * guests);
    lines.push({ label: `${guests} guests at $${perGuest}`, cents: rentalFeeCents });
    if (selection.bakeBar) lines.push({ label: "Bake bar", cents: cents(groupOptions.bakeBar * guests) });
  }

  for (const addOn of addOns) {
    if (!selection.addOnIds.includes(addOn.id)) continue;
    if (addOn.id === "bake-together" && selection.mode === "group") continue;
    lines.push({ label: addOn.name, cents: cents(addOn.price) });
  }
  if (selection.extraHours > 0) {
    lines.push({ label: "Extra hours", cents: cents(selection.extraHours * extraHourPrice) });
  }
  if (selection.mode === "date" && selection.date?.endsWith("-02-14")) {
    lines.push({ label: "February 14", cents: cents(feb14Surcharge) });
  }

  const waiverCents = selection.waiver ? Math.round(rentalFeeCents * waiverRate) : 0;
  if (waiverCents) lines.push({ label: "Damage waiver", cents: waiverCents });

  const totalCents = lines.reduce((sum, line) => sum + line.cents, 0);
  const dueNowCents = Math.round(rentalFeeCents / 2);
  return {
    lines,
    rentalFeeCents,
    waiverCents,
    totalCents,
    dueNowCents,
    balanceCents: totalCents - dueNowCents,
    securityHoldCents: cents(setupSecurityDeposit),
  };
}

export function usesPan(item: RentalItem) {
  return item.kind === "pan" || (item.kind === "kit" && item.kitType === "bake");
}

export function quoteRental(selection: RentalSelection): Quote {
  const resolved = selection.lines.flatMap((line) => {
    const item = findRental(line.slug);
    return item ? [{ item, quantity: line.quantity }] : [];
  });
  const feeFor = (test: (item: RentalItem) => boolean) =>
    resolved
      .filter(({ item }) => test(item))
      .reduce((sum, { item, quantity }) => sum + cents(item.price ?? 0) * quantity, 0);

  const rentalFeeCents = feeFor(() => true);
  const pieceFeeCents = feeFor((item) => item.kind === "piece");
  const orderSizedFeeCents = feeFor((item) => item.deposit === null);
  const panCount = resolved.filter(({ item }) => usesPan(item)).reduce((sum, line) => sum + line.quantity, 0);
  const extraCents = cents(selection.extraDays * extraDayPerPan * panCount);
  const waiverCents = selection.waiver ? Math.round(rentalFeeCents * waiverRate) : 0;
  const count = resolved.reduce((sum, line) => sum + line.quantity, 0);

  const lines: QuoteLine[] = [{ label: `Rental, ${count} ${count === 1 ? "item" : "items"}`, cents: rentalFeeCents }];
  if (extraCents) lines.push({ label: "Extra days", cents: extraCents });
  if (waiverCents) lines.push({ label: "Damage waiver", cents: waiverCents });

  const totalCents = rentalFeeCents + extraCents + waiverCents;
  // Per the agreement: individual pieces pay 50% now and the rest at pickup.
  const balanceCents = Math.round(pieceFeeCents / 2);
  const fixedDepositCents = resolved.reduce((sum, { item, quantity }) => sum + cents(item.deposit ?? 0) * quantity, 0);
  return {
    lines,
    rentalFeeCents,
    waiverCents,
    totalCents,
    dueNowCents: totalCents - balanceCents,
    balanceCents,
    securityHoldCents: fixedDepositCents + cents(orderDeposit(orderSizedFeeCents / 100)),
  };
}
