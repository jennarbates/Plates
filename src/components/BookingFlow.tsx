"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { NextDates } from "@/components/availability-ui";
import { AgreementSign, emptySignature, PaymentStep, signatureComplete } from "@/components/AgreementSign";
import { addOns, extraHourPrice, feb14Surcharge, groupOptions, packageDetailsNote, packages } from "@/lib/catalog";
import { quoteSetup } from "@/lib/pricing";
import { formatDate, groupPage, money, moneyFromCents, site } from "@/lib/site";

export type BookingStart = {
  mode: "date" | "group";
  packageSlug?: string;
  guests?: number;
  pastries?: boolean;
  bakeBar?: boolean;
};

const steps = ["Your table", "Date and time", "Location", "Add-ons", "Sign", "Payment"];

export function BookingFromUrl() {
  const query = useSearchParams();
  const guests = Number(query.get("guests"));
  return (
    <BookingFlow
      start={{
        mode: query.get("group") ? "group" : "date",
        packageSlug: query.get("package") ?? undefined,
        guests: guests >= groupOptions.minGuests && guests <= groupOptions.maxGuests ? guests : undefined,
        pastries: query.get("pastries") === "1",
        bakeBar: query.get("bakeBar") === "1",
      }}
    />
  );
}

function BookingFlow({ start }: { start: BookingStart }) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState(start.mode);
  const [packageSlug, setPackageSlug] = useState(start.packageSlug ?? "full-tea");
  const [guests, setGuests] = useState(start.guests ?? 6);
  const [pastries, setPastries] = useState(start.pastries ?? false);
  const [bakeBar, setBakeBar] = useState(start.bakeBar ?? false);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [address, setAddress] = useState("");
  const [access, setAccess] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [extraHours, setExtraHours] = useState(0);
  const [waiver, setWaiver] = useState(false);
  const [signature, setSignature] = useState(emptySignature);
  const [showErrors, setShowErrors] = useState(false);
  const [openSlots, setOpenSlots] = useState<string[] | null>(null);
  const [conflict, setConflict] = useState("");
  const latestDate = useRef("");

  async function chooseDate(value: string) {
    latestDate.current = value;
    setDate(value);
    setSlot("");
    setConflict("");
    setOpenSlots(null);
    if (!value) return;
    try {
      const response = await fetch(`/api/availability/setups?date=${value}`);
      const data = (await response.json()) as { slots?: string[] };
      if (latestDate.current === value) setOpenSlots(data.slots ?? []);
    } catch {
      if (latestDate.current === value) setOpenSlots([]);
    }
  }

  const chosenPackage = packages.find((item) => item.slug === packageSlug) ?? packages[1];
  const visibleAddOns = addOns.filter((addOn) => mode === "date" || addOn.id !== "bake-together");
  const addOnIds = selected.filter((id) => visibleAddOns.some((addOn) => addOn.id === id));
  const selection = {
    mode,
    packageSlug: mode === "date" ? chosenPackage.slug : undefined,
    guests: mode === "group" ? guests : undefined,
    pastries: mode === "group" && pastries,
    bakeBar: mode === "group" && bakeBar,
    addOnIds,
    extraHours,
    waiver,
    date,
  };
  const quote = quoteSetup(selection);
  const feb14 = mode === "date" && date.endsWith("-02-14");

  const dateError = !date
    ? "Please pick a date."
    : date < site.bookingsOpen
      ? `Bookings open ${formatDate(site.bookingsOpen)}, 2027.`
      : openSlots?.length === 0
        ? "That date is full. Please pick another."
        : "";

  const canContinue = [
    true,
    !dateError && Boolean(slot) && Boolean(openSlots?.includes(slot)),
    address.trim().length > 3,
    true,
    signatureComplete(signature),
    false,
  ][step];

  function next() {
    if (!canContinue) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep(step + 1);
    window.scrollTo({ top: 0 });
  }

  return (
    <section className="container flow">
      <h1 className="title-small">Book a setup</h1>
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
              <h2>Choose your table</h2>
              <div className="category-bar" role="group" aria-label="Setup type">
                <button type="button" className="chip" aria-current={mode === "date" ? "page" : undefined} onClick={() => setMode("date")}>
                  Date for two
                </button>
                <button type="button" className="chip" aria-current={mode === "group" ? "page" : undefined} onClick={() => setMode("group")}>
                  {groupPage.name} or group
                </button>
              </div>
              {mode === "date" ? (
                <div className="choice-stack">
                  {packages.map((item) => (
                    <label className="choice" key={item.slug}>
                      <input type="radio" name="package" checked={packageSlug === item.slug} onChange={() => setPackageSlug(item.slug)} />
                      <span className="choice-main">{item.name}</span>
                      <span className="choice-price">{money(item.price)}</span>
                    </label>
                  ))}
                  <p className="placeholder-text">{packageDetailsNote}</p>
                </div>
              ) : (
                <>
                  <label className="field guest-slider">
                    Guests: {guests}
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
                      <input type="radio" name="group" checked={!pastries} onChange={() => setPastries(false)} />
                      <span className="choice-main">Setup only</span>
                      <span className="choice-price">{money(groupOptions.setupOnly)} per guest</span>
                    </label>
                    <label className="choice">
                      <input type="radio" name="group" checked={pastries} onChange={() => setPastries(true)} />
                      <span className="choice-main">Setup with pastries and tea</span>
                      <span className="choice-price">{money(groupOptions.withPastries)} per guest</span>
                    </label>
                  </div>
                </>
              )}
            </>
          ) : null}

          {step === 1 ? (
            <>
              <h2>Pick a date and time</h2>
              <label className="field">
                Date
                <input type="date" min={site.bookingsOpen} value={date} onChange={(event) => chooseDate(event.target.value)} />
              </label>
              <NextDates />
              {conflict ? <p className="notice" role="alert">{conflict}</p> : null}
              {date && dateError ? <p className="field-error" role="alert">{dateError}</p> : null}
              {feb14 ? <p className="notice small">February 14 adds {money(feb14Surcharge)}.</p> : null}
              <fieldset className="choice-stack" style={{ border: 0, padding: 0, margin: "16px 0 0" }}>
                <legend className="field" style={{ marginBottom: 6 }}>Time slot</legend>
                {date && !openSlots ? <p className="small muted" role="status">Checking times...</p> : null}
                {!date ? <p className="small muted">Pick a date to see open times.</p> : null}
                {(openSlots ?? []).map((time) => (
                  <label className="choice" key={time}>
                    <input type="radio" name="slot" checked={slot === time} onChange={() => setSlot(time)} />
                    <span className="choice-main">{time}</span>
                  </label>
                ))}
              </fieldset>
              {showErrors && !canContinue && (!date || !dateError) ? (
                <p className="field-error" role="alert">{dateError || "Please pick a time."}</p>
              ) : null}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h2>Where should we set up?</h2>
              <label className="field">
                Address or location
                <input autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} />
                <p className="field-hint">We serve {site.serviceArea}. You need permission for any park, campus or building.</p>
              </label>
              <label className="field">
                Access details
                <textarea rows={3} value={access} onChange={(event) => setAccess(event.target.value)} />
                <p className="field-hint">Tell us about stairs, long walks or limited parking.</p>
              </label>
              {showErrors && !canContinue ? <p className="field-error" role="alert">Please add a location.</p> : null}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h2>Add-ons and damage waiver</h2>
              <div className="choice-stack">
                {visibleAddOns.map((addOn) => (
                  <label className="choice" key={addOn.id}>
                    <input
                      type="checkbox"
                      checked={selected.includes(addOn.id)}
                      onChange={(event) =>
                        setSelected(event.target.checked ? [...selected, addOn.id] : selected.filter((id) => id !== addOn.id))
                      }
                    />
                    <span className="choice-main">{addOn.name}</span>
                    <span className="choice-price">+{money(addOn.price)}</span>
                  </label>
                ))}
                {mode === "group" ? (
                  <label className="choice">
                    <input type="checkbox" checked={bakeBar} onChange={(event) => setBakeBar(event.target.checked)} />
                    <span className="choice-main">Bake bar</span>
                    <span className="choice-price">+{money(groupOptions.bakeBar)} per guest</span>
                  </label>
                ) : null}
              </div>
              <label className="field">
                Extra hours
                <select value={extraHours} onChange={(event) => setExtraHours(Number(event.target.value))}>
                  {[0, 1, 2, 3].map((hours) => (
                    <option key={hours} value={hours}>
                      {hours === 0 ? "None" : `${hours} (+${money(hours * extraHourPrice)})`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="choice">
                <input type="checkbox" checked={waiver} onChange={(event) => setWaiver(event.target.checked)} />
                <span className="choice-main">
                  Damage waiver
                  <br />
                  <span className="small muted">Covers accidental damage to up to 2 Tier 1 or Tier 2 pieces. Doesn&apos;t cover Tier 3 or 4, lost items or misuse.</span>
                </span>
                <span className="choice-price">+{moneyFromCents(quoteSetup({ ...selection, waiver: true }).waiverCents)}</span>
              </label>
            </>
          ) : null}

          {step === 4 ? <AgreementSign value={signature} onChange={setSignature} showErrors={showErrors} /> : null}
          {step === 5 ? (
            <PaymentStep
              amount={moneyFromCents(quote.dueNowCents)}
              order={{ kind: "setup", ...selection, slot, address, access, signature }}
              onUnavailable={(message) => {
                chooseDate(date);
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
            {date && !dateError ? (
              <div>
                <dt>Date</dt>
                <dd>{formatDate(date)}{slot ? `, ${slot}` : ""}</dd>
              </div>
            ) : null}
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
              <dt>Due today, 50% of the setup price</dt>
              <dd>{moneyFromCents(quote.dueNowCents)}</dd>
            </div>
            <div>
              <dt>Balance, 48 hours before</dt>
              <dd>{moneyFromCents(quote.balanceCents)}</dd>
            </div>
            <div>
              <dt>Security hold, the day before</dt>
              <dd>{moneyFromCents(quote.securityHoldCents)}</dd>
            </div>
          </dl>
          <p className="small muted">The booking deposit is nonrefundable. Massachusetts sales tax is added where it applies.</p>
        </aside>
      </div>
    </section>
  );
}
