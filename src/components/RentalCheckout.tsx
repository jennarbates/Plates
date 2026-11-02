"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AgreementSign, emptySignature, PaymentStep, signatureComplete } from "@/components/AgreementSign";
import { Photo } from "@/components/Photo";
import { findRental, photoKind } from "@/lib/catalog";
import { removeFromCart, setCartQuantity, useCart } from "@/lib/cart";
import { extraDayPerPan, quoteRental, standardRentalDays, usesPan, type RentalLine } from "@/lib/pricing";
import { addDays, formatDate, money, moneyFromCents, site } from "@/lib/site";

const steps = ["Cart", "Pickup and return", "Deposit and prices", "Damage waiver", "Sign", "Payment"];
export function RentalCheckout() {
  const cart = useCart();
  const [step, setStep] = useState(0);
  const [pickup, setPickup] = useState("");
  const [extraDays, setExtraDays] = useState(0);
  const [waiver, setWaiver] = useState(false);
  const [signature, setSignature] = useState(emptySignature);
  const [showErrors, setShowErrors] = useState(false);
  const [checkedFor, setCheckedFor] = useState("");
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [conflict, setConflict] = useState("");
  const latestCheck = useRef("");

  const lines = cart.flatMap((line) => {
    const item = findRental(line.slug);
    return item ? [{ item, quantity: line.quantity }] : [];
  });

  if (lines.length === 0) {
    return (
      <section className="container flow">
        <h1 className="title-small">Your cart is empty</h1>
        <p className="lead">Start with a kit or choose individual pieces.</p>
        <div className="button-row" style={{ marginTop: 20 }}>
          <Link className="button" href="/rentals/pieces">Browse all pieces</Link>
          <Link className="button button-secondary" href="/rentals/kits">See all kits</Link>
        </div>
      </section>
    );
  }

  const orderLines: RentalLine[] = lines.map(({ item, quantity }) => ({ slug: item.slug, quantity }));
  const quote = quoteRental({ lines: orderLines, extraDays, waiver });
  const panCount = lines.filter(({ item }) => usesPan(item)).reduce((sum, line) => sum + line.quantity, 0);
  const returnDate = pickup ? addDays(pickup, standardRentalDays + extraDays) : "";
  const checkKey = (date: string, extra: number) => JSON.stringify([date, extra, orderLines]);
  const checked = checkedFor === checkKey(pickup, extraDays);

  async function checkDates(date: string, extra: number) {
    const key = checkKey(date, extra);
    latestCheck.current = key;
    setCheckedFor("");
    setConflict("");
    if (!date || date < site.bookingsOpen) return;
    try {
      const response = await fetch("/api/availability/rental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: orderLines, pickup: date, extraDays: extra }),
      });
      const data = (await response.json()) as { unavailable?: string[] };
      if (latestCheck.current !== key) return;
      setUnavailable(data.unavailable ?? []);
      setCheckedFor(key);
    } catch {
      if (latestCheck.current === key) setConflict("We couldn't check availability. Please try again.");
    }
  }

  const dateError = !pickup
    ? "Please pick a pickup date."
    : pickup < site.bookingsOpen
      ? `Rentals open ${formatDate(site.bookingsOpen)}, 2027.`
      : checked && unavailable.length
        ? "Some of your items are out during those dates. Pick other dates or change your cart."
        : "";

  const canContinue = [true, !dateError && checked, true, true, signatureComplete(signature), false][step];

  function next() {
    if (!canContinue) {
      setShowErrors(true);
      return;
    }
    if (step === 0 && pickup) checkDates(pickup, extraDays);
    setShowErrors(false);
    setStep(step + 1);
    window.scrollTo({ top: 0 });
  }

  return (
    <section className="container flow">
      <h1 className="title-small">Rental checkout</h1>
      <div className="progress" aria-hidden="true">
        {steps.map((name, index) => (
          <span key={name} className={index <= step ? "done" : undefined} />
        ))}
      </div>
      <p className="step-label">
        Step {step + 1} of {steps.length}: {steps[step]}
      </p>

      <div className="flow-layout">
        <div className="panel">
          {step === 0 ? (
            <>
              <h2>Your cart</h2>
              <div>
                {lines.map(({ item, quantity }) => (
                  <div className="cart-line" key={item.slug}>
                    <Photo label={item.name} kind={photoKind(item)} />
                    <div>
                      <Link href={`/rentals/item/${item.slug}`}><strong>{item.name}</strong></Link>
                      <p className="small muted">{money(item.price ?? 0)} each</p>
                      <div className="cart-line-actions">
                        {item.quantity > 1 ? (
                          <label className="field">
                            Quantity
                            <select value={quantity} onChange={(event) => setCartQuantity(item.slug, Number(event.target.value))}>
                              {Array.from({ length: item.quantity }, (_, i) => i + 1).map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        <button
                          type="button"
                          className="link-button"
                          aria-label={`Remove ${item.name}`}
                          onClick={() => removeFromCart(item.slug)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <h2>Pick your dates</h2>
              <label className="field">
                Pickup date
                <input type="date" min={site.bookingsOpen} value={pickup} onChange={(event) => { setPickup(event.target.value); checkDates(event.target.value, extraDays); }} />
                <p className="field-hint">Pickup is at {site.pickupLocation}.</p>
              </label>
              {(pickup || showErrors) && dateError ? <p className="field-error" role="alert">{dateError}</p> : null}
              {conflict ? <p className="notice" role="alert">{conflict}</p> : null}
              {pickup && !dateError && !checked && !conflict ? <p className="small muted" role="status">Checking availability...</p> : null}
              {checked && unavailable.length ? (
                <ul className="plain-list">
                  {unavailable.map((slug) => (
                    <li key={slug}>{findRental(slug)?.name}</li>
                  ))}
                </ul>
              ) : null}
              {panCount > 0 ? (
                <label className="field">
                  Extra days
                  <select value={extraDays} onChange={(event) => { const extra = Number(event.target.value); setExtraDays(extra); checkDates(pickup, extra); }}>
                    {[0, 1, 2].map((days) => (
                      <option key={days} value={days}>
                        {days === 0 ? "None, standard 3 days" : `${days} (+${money(days * extraDayPerPan * panCount)})`}
                      </option>
                    ))}
                  </select>
                  <p className="field-hint">{money(extraDayPerPan)} per pan per day, if no one else has booked it.</p>
                </label>
              ) : null}
              {returnDate && !dateError ? <p className="notice">Return by {formatDate(returnDate)}.</p> : null}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h2>Deposit and replacement prices</h2>
              <p className="muted">If a piece breaks or goes missing, you pay its replacement price. We place the deposit as a card hold the day before pickup.</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col">If replaced</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map(({ item }) => (
                      <tr key={item.slug}>
                        <th scope="row">{item.name}</th>
                        <td>{item.replacement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h2>Damage waiver</h2>
              <label className="choice">
                <input type="checkbox" checked={waiver} onChange={(event) => setWaiver(event.target.checked)} />
                <span className="choice-main">
                  Add the damage waiver
                  <br />
                  <span className="small muted">Covers accidental damage to up to 2 Tier 1 or Tier 2 pieces. Doesn&apos;t cover Tier 3 or 4, lost items or misuse.</span>
                </span>
                <span className="choice-price">+{moneyFromCents(quoteRental({ lines: orderLines, extraDays, waiver: true }).waiverCents)}</span>
              </label>
            </>
          ) : null}

          {step === 4 ? <AgreementSign value={signature} onChange={setSignature} showErrors={showErrors} /> : null}
          {step === 5 ? (
            <PaymentStep
              amount={moneyFromCents(quote.dueNowCents)}
              order={{ kind: "rental", lines: orderLines, pickup, extraDays, waiver, signature }}
              onUnavailable={(message, items) => {
                setUnavailable(items);
                setCheckedFor(checkKey(pickup, extraDays));
                setConflict(message);
                setStep(1);
              }}
            />
          ) : null}

          <div className="flow-actions">
            {step > 0 ? (
              <button type="button" className="button button-secondary" onClick={() => { setShowErrors(false); setStep(step - 1); }}>
                Back
              </button>
            ) : null}
            {step < steps.length - 1 ? (
              <button type="button" className="button" onClick={next}>Continue</button>
            ) : null}
          </div>
        </div>

        <aside className="panel flow-summary" aria-label="Order summary">
          <h2>Your order</h2>
          <dl className="summary-lines">
            {quote.lines.map((line) => (
              <div key={line.label}>
                <dt>{line.label}</dt>
                <dd>{moneyFromCents(line.cents)}</dd>
              </div>
            ))}
            <div className="summary-total">
              <dt>Total before tax</dt>
              <dd>{moneyFromCents(quote.totalCents)}</dd>
            </div>
            <div>
              <dt>Due today</dt>
              <dd>{moneyFromCents(quote.dueNowCents)}</dd>
            </div>
            {quote.balanceCents ? (
              <div>
                <dt>Balance at pickup</dt>
                <dd>{moneyFromCents(quote.balanceCents)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Security hold, the day before</dt>
              <dd>{moneyFromCents(quote.securityHoldCents)}</dd>
            </div>
          </dl>
          <p className="small muted">Massachusetts sales tax is added where it applies.</p>
        </aside>
      </div>
    </section>
  );
}
