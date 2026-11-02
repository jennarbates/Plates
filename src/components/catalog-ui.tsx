"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Photo } from "@/components/Photo";
import { photoKind, priceLabel, type RentalItem } from "@/lib/catalog";
import { addToCart, useCart } from "@/lib/cart";

export function AddToCart({ item, compact = false }: { item: RentalItem; compact?: boolean }) {
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const inCart = cart.find((line) => line.slug === item.slug)?.quantity ?? 0;
  const left = item.quantity - inCart;

  if (item.price === null || (item.kind === "kit" && !item.available)) {
    return <p className="tag add-to-cart">Coming after launch</p>;
  }
  if (left <= 0) {
    return (
      <Link className="button button-secondary add-to-cart" href="/rentals/cart">
        {item.quantity === 1 ? "In your cart" : `All ${item.quantity} in cart`}
      </Link>
    );
  }

  const options = Array.from({ length: left }, (_, i) => i + 1);
  const chosen = Math.min(quantity, left);
  return (
    <div className="add-to-cart">
      <div className="quantity-row">
        {item.quantity > 1 ? (
          <label className="field">
            <span className={compact ? "sr-only" : undefined}>Quantity</span>
            <select value={chosen} onChange={(event) => setQuantity(Number(event.target.value))}>
              {options.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          className="button"
          onClick={() => {
            addToCart(item.slug, chosen, item.quantity);
            setAdded(true);
          }}
        >
          {compact ? <span className="sr-only">{item.name}: </span> : null}
          {compact ? "Add" : "Add to cart"}
        </button>
      </div>
      <p role="status" className="small added-note">
        {added ? (
          <>
            Added. <Link href="/rentals/cart">View cart</Link>
          </>
        ) : null}
      </p>
    </div>
  );
}

export function ItemCard({ item }: { item: RentalItem }) {
  const href = `/rentals/item/${item.slug}`;
  return (
    <article className="card">
      <Photo label={item.name} kind={photoKind(item)} />
      <div className="card-body">
        <h3>
          <Link href={href} className="card-title">{item.name}</Link>
        </h3>
        <p className="price">
          {priceLabel(item)} <small>for 3 days</small>
        </p>
        <p className="small muted">{item.quantity} available</p>
        <AddToCart item={item} compact />
      </div>
    </article>
  );
}

export function FilterGrid({ items, filterKeys }: { items: RentalItem[]; filterKeys: string[] }) {
  const [active, setActive] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeCount = Object.values(active).filter(Boolean).length;

  const options = useMemo(
    () =>
      filterKeys
        .map((key) => ({
          key,
          values: [...new Set(items.map((item) => item.filters[key]).filter(Boolean))].sort(),
        }))
        .filter((option) => option.values.length > 1),
    [items, filterKeys],
  );

  const visible = items.filter((item) =>
    Object.entries(active).every(([key, value]) => !value || item.filters[key] === value),
  );

  return (
    <>
      <div className="results-bar">
        <p className="results-note" role="status">
          {visible.length} {visible.length === 1 ? "item" : "items"}
        </p>
        {options.length > 0 ? (
          <button
            type="button"
            className="filter-toggle"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            {filtersOpen ? "Hide filters" : `Filters${activeCount ? ` (${activeCount})` : ""}`}
          </button>
        ) : null}
      </div>
      {options.length > 0 ? (
        <div className={`filter-row${filtersOpen ? " open" : ""}`}>
          {options.map((option) => (
            <label className="field" key={option.key}>
              {option.key}
              <select
                value={active[option.key] ?? ""}
                onChange={(event) => setActive({ ...active, [option.key]: event.target.value })}
              >
                <option value="">All</option>
                {option.values.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}
      {visible.length > 0 ? (
        <div className="item-card-grid">
          {visible.map((item) => (
            <ItemCard key={item.slug} item={item} />
          ))}
        </div>
      ) : (
        <p className="muted">
          Nothing matches those filters.{" "}
          <button type="button" className="link-button" onClick={() => setActive({})}>
            Clear filters
          </button>
        </p>
      )}
    </>
  );
}
