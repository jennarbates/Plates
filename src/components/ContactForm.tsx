"use client";

import { useState, type FormEvent } from "react";

export function ContactForm() {
  const [notConnected, setNotConnected] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    setNotConnected(true);
  }

  return (
    <form className="panel" onSubmit={submit}>
      <label className="field">
        Name
        <input name="name" autoComplete="name" required />
      </label>
      <label className="field">
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Date
        <input name="date" type="date" />
      </label>
      <label className="field">
        Event type
        <input name="event" />
      </label>
      <label className="field">
        Guest count
        <input name="guests" type="number" min={1} inputMode="numeric" />
      </label>
      <label className="field">
        Message
        <textarea name="message" rows={4} />
      </label>
      <button type="submit" className="button button-full">Send message</button>
      {notConnected ? (
        <p className="notice" role="status">This form isn&apos;t connected yet, so your message wasn&apos;t sent.</p>
      ) : null}
    </form>
  );
}
