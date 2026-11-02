import Link from "next/link";

export default function NotFound() {
  return (
    <section className="narrow page-head page-end stack">
      <h1>This table isn&apos;t set</h1>
      <p className="lead">We couldn&apos;t find that page.</p>
      <div className="button-row">
        <Link className="button" href="/">Go home</Link>
        <Link className="button button-secondary" href="/rentals">Browse rentals</Link>
      </div>
    </section>
  );
}
