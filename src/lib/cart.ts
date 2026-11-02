import { useSyncExternalStore } from "react";

export type CartLine = { slug: string; quantity: number };

const storageKey = "war-and-peas-cart";
const empty: CartLine[] = [];

let lines: CartLine[] | null = null;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  if (lines) return lines;
  try {
    lines = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as CartLine[];
  } catch {
    lines = [];
  }
  return lines;
}

function write(next: CartLine[]) {
  lines = next;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // The cart still works for this visit without storage.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCart() {
  return useSyncExternalStore(subscribe, read, () => empty);
}

export function addToCart(slug: string, quantity: number, max: number) {
  const current = read();
  const existing = current.find((line) => line.slug === slug);
  const total = Math.min((existing?.quantity ?? 0) + quantity, max);
  write(
    existing
      ? current.map((line) => (line.slug === slug ? { slug, quantity: total } : line))
      : [...current, { slug, quantity: total }],
  );
}

export function setCartQuantity(slug: string, quantity: number) {
  write(read().map((line) => (line.slug === slug ? { slug, quantity } : line)));
}

export function removeFromCart(slug: string) {
  write(read().filter((line) => line.slug !== slug));
}

export function clearCart() {
  write([]);
}
