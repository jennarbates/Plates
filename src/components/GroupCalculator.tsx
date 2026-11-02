"use client";

import Link from "next/link";
import { useState } from "react";
import { groupOptions } from "@/lib/catalog";
import { money } from "@/lib/site";

export function GroupCalculator() {
  const [guests, setGuests] = useState(6);
  const [pastries, setPastries] = useState(false);
  const [bakeBar, setBakeBar] = useState(false);
  const perGuest =
    (pastries ? groupOptions.withPastries : groupOptions.setupOnly) + (bakeBar ? groupOptions.bakeBar : 0);
  const query = new URLSearchParams({
    group: "1",
    guests: String(guests),
    ...(pastries ? { pastries: "1" } : {}),
    ...(bakeBar ? { bakeBar: "1" } : {}),
  });

  return (
    <div className="panel">
      <label className="field guest-slider">
        How many guests?
        <span className="guest-count" style={{ display: "block" }}>{guests} guests</span>
        <input
          type="range"
          min={groupOptions.minGuests}
          max={groupOptions.maxGuests}
          value={guests}
          onChange={(event) => setGuests(Number(event.target.value))}
        />
      </label>
      <div className="choice-stack">
        <label className="choice">
          <input type="radio" name="group-option" checked={!pastries} onChange={() => setPastries(false)} />
          <span className="choice-main">Setup only</span>
          <span className="choice-price">{money(groupOptions.setupOnly)} per guest</span>
        </label>
        <label className="choice">
          <input type="radio" name="group-option" checked={pastries} onChange={() => setPastries(true)} />
          <span className="choice-main">Setup with pastries and tea</span>
          <span className="choice-price">{money(groupOptions.withPastries)} per guest</span>
        </label>
        <label className="choice">
          <input type="checkbox" checked={bakeBar} onChange={(event) => setBakeBar(event.target.checked)} />
          <span className="choice-main">Bake bar add-on</span>
          <span className="choice-price">+{money(groupOptions.bakeBar)} per guest</span>
        </label>
      </div>
      <p className="price-large" role="status">
        {money(perGuest * guests)} <small>total before tax</small>
      </p>
      <Link className="button button-full" href={`/book?${query}`}>
        Plan this table
      </Link>
    </div>
  );
}
