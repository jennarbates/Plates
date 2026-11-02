// One place for the things that will change before launch.
export const site = {
  name: "War and Peas", // Placeholder until the real name is picked.
  tagline: "Vintage tea setups and rentals",
  serviceArea: "Amherst and the Five College area",
  email: "[email to add]",
  instagram: "[Instagram to add]",
  pickupLocation: "[pickup location to add]",
  season: "galentines" as "galentines" | "spring",
  bookingsOpen: "2027-01-05", // Proposed target in the launch plan.
};

export const groupPage =
  site.season === "galentines"
    ? { name: "Galentine's", title: "Galentine's and Groups" }
    : { name: "Showers", title: "Showers and Brunches" };

export const timeSlots = ["11:00 am", "2:00 pm", "5:00 pm"]; // Draft slots.

export function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function formatDate(date: string, withWeekday = true) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: withWeekday ? "short" : undefined,
    month: "short",
    day: "numeric",
  });
}

// Payment schedules follow the calendar in Massachusetts, wherever the server runs.
export function localToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
}

export function money(amount: number) {
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

export function moneyFromCents(cents: number) {
  return money(cents / 100);
}
