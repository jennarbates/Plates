// What the browser may send when starting checkout. Everything is checked again here.
import { z } from "zod";
import { addOns, findRental, groupOptions, packages } from "@/lib/catalog";
import { addendumPoints } from "@/lib/policies";
import { timeSlots } from "@/lib/site";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}, "Invalid date");

const signatureSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(7).max(40),
  agreed: z.literal(true),
  adult: z.literal(true),
  initials: z.array(z.literal(true)).length(addendumPoints.length),
  noPhotos: z.boolean(),
});

const setupOrderSchema = z
  .object({
    kind: z.literal("setup"),
    mode: z.enum(["date", "group"]),
    packageSlug: z.string().optional(),
    guests: z.number().int().min(groupOptions.minGuests).max(groupOptions.maxGuests).optional(),
    pastries: z.boolean().default(false),
    bakeBar: z.boolean().default(false),
    addOnIds: z.array(z.string()).max(addOns.length).default([]),
    extraHours: z.number().int().min(0).max(3).default(0),
    waiver: z.boolean().default(false),
    date: isoDate,
    slot: z.enum(timeSlots as [string, ...string[]]),
    address: z.string().trim().min(4).max(500),
    access: z.string().trim().max(1000).default(""),
    signature: signatureSchema,
  })
  .refine((order) => order.addOnIds.every((id) => addOns.some((addOn) => addOn.id === id)), "Unknown add-on")
  .refine(
    (order) =>
      order.mode === "group"
        ? order.guests !== undefined
        : packages.some((item) => item.slug === order.packageSlug),
    "Choose a package or guest count",
  );

const rentalOrderSchema = z
  .object({
    kind: z.literal("rental"),
    lines: z
      .array(z.object({ slug: z.string().max(100), quantity: z.number().int().min(1).max(100) }))
      .min(1)
      .max(60),
    pickup: isoDate,
    extraDays: z.number().int().min(0).max(2).default(0),
    waiver: z.boolean().default(false),
    signature: signatureSchema,
  })
  .refine(
    (order) => new Set(order.lines.map((line) => line.slug)).size === order.lines.length,
    "Each item may appear once",
  )
  .refine(
    (order) =>
      order.lines.every((line) => {
        const item = findRental(line.slug);
        if (!item || item.price === null) return false;
        if (item.kind === "kit" && !item.available) return false;
        return line.quantity <= item.quantity;
      }),
    "An item in your cart can't be rented",
  );

export const checkoutSchema = z.discriminatedUnion("kind", [setupOrderSchema, rentalOrderSchema]);

export type CheckoutOrder = z.infer<typeof checkoutSchema>;
export type SetupOrder = Extract<CheckoutOrder, { kind: "setup" }>;
export type RentalOrder = Extract<CheckoutOrder, { kind: "rental" }>;
