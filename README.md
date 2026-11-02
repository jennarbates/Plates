# War and Peas

The website for vintage tea setups and rentals. "War and Peas" is a placeholder name.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Where to change things

- `src/lib/site.ts`: name, contact details, season, booking open date and sample availability.
- `src/lib/catalog.ts`: packages, add-ons, pieces, pans and kits. Prices for individual pieces are drafts.
- `src/lib/policies.ts`: FAQ and plain language agreement summaries.

## Bookings and payments

Copy `.env.example` to `.env.local` and add your Stripe test keys. Without them the site runs, but checkout says payments aren't connected and books nothing.

To receive payment notices locally, install the Stripe CLI and run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

- Locally, bookings are saved in an embedded Postgres in `.data/`. Set `DATABASE_URL` in production.
- Live keys are refused until `ALLOW_LIVE_PAYMENTS=true`. Leave it off until the attorney signs off.
- Bookings are listed at `/admin/bookings` once `ADMIN_PASSWORD` is set.
- Run the tests with `npm test`.

## Scheduled payments and emails

Call `/api/cron/payments` once an hour with the header `Authorization: Bearer <CRON_SECRET>`. Each run:

- Charges setup balances 48 hours before, and rental balances on the pickup date.
- Places security holds the day before.
- Retries a declined card once a day, up to 3 tries, and emails the customer and owner.
- Warns the owner before a hold expires, and sends any waiting emails.

The owner can retry, release a hold, charge for damage or cancel at `/admin/bookings`. Cancelling stops future charges, but refunds are done by hand in Stripe.

Emails go through [Resend](https://resend.com) using `RESEND_API_KEY` and `EMAIL_FROM`. Without them, emails wait in the database and go out once they're set.

## Not built yet

Sales tax, refunds on the site, and reserving specific china for setups.
