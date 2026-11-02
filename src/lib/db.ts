// Postgres when DATABASE_URL is set. Otherwise an embedded Postgres saved in .data/,
// so bookings work locally with no setup. Import this from server code only.
import { mkdirSync } from "node:fs";

export type Queryable = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

export type Db = Queryable & {
  transaction<T>(work: (tx: Queryable) => Promise<T>): Promise<T>;
};

const schema = `
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('setup', 'rental')),
  status text NOT NULL CHECK (status IN ('pending_payment', 'confirmed', 'expired', 'needs_review')),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  time_slot text,
  location text,
  access_notes text,
  order_details jsonb NOT NULL,
  quote jsonb NOT NULL,
  total_cents integer NOT NULL,
  due_now_cents integer NOT NULL,
  balance_cents integer NOT NULL,
  security_hold_cents integer NOT NULL,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  hold_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_setup_per_slot
  ON bookings (start_date, time_slot)
  WHERE kind = 'setup' AND status IN ('pending_payment', 'confirmed');

CREATE TABLE IF NOT EXISTS reservations (
  booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  slug text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  start_date date NOT NULL,
  end_date date NOT NULL,
  PRIMARY KEY (booking_id, slug)
);

CREATE INDEX IF NOT EXISTS reservations_by_item ON reservations (slug, start_date, end_date);

CREATE TABLE IF NOT EXISTS signatures (
  booking_id uuid PRIMARY KEY REFERENCES bookings (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  agreement_version text NOT NULL,
  agreed boolean NOT NULL,
  adult boolean NOT NULL,
  addendum_initials jsonb NOT NULL,
  no_photos boolean NOT NULL,
  ip_address text,
  user_agent text,
  signed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending_payment', 'confirmed', 'expired', 'needs_review', 'cancelled'));

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('balance', 'security_hold', 'extra')),
  status text NOT NULL CHECK (status IN ('processing', 'succeeded', 'failed', 'held', 'released', 'captured')),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  captured_cents integer,
  attempts integer NOT NULL DEFAULT 1,
  stripe_payment_intent_id text,
  failure_code text,
  note text,
  capture_before timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_once_per_booking
  ON payments (booking_id, kind)
  WHERE kind IN ('balance', 'security_hold');

CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE,
  booking_id uuid REFERENCES bookings (id) ON DELETE CASCADE,
  recipient text NOT NULL,
  subject text NOT NULL,
  html text NOT NULL,
  body_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
`;

function postgres(url: string): Db {
  // Loaded lazily so local development never needs a Postgres server.
  const pool = import("pg").then(({ default: pg }) => new pg.Pool({ connectionString: url }));
  return {
    async query<T>(sql: string, params?: unknown[]) {
      const { rows } = await (await pool).query(sql, params as unknown[]);
      return { rows: rows as T[] };
    },
    async transaction(work) {
      const client = await (await pool).connect();
      try {
        await client.query("BEGIN");
        const result = await work({
          async query<T>(sql: string, params?: unknown[]) {
            const { rows } = await client.query(sql, params as unknown[]);
            return { rows: rows as T[] };
          },
        });
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

async function embedded(path: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  if (!path.includes("://")) mkdirSync(path, { recursive: true });
  const db = await PGlite.create(path);
  return {
    async query<T>(sql: string, params?: unknown[]) {
      const { rows } = await db.query<T>(sql, params as unknown[]);
      return { rows };
    },
    async transaction<T>(work: (tx: Queryable) => Promise<T>) {
      return (await db.transaction((tx) =>
        work({
          async query<R>(sql: string, params?: unknown[]) {
            const { rows } = await tx.query<R>(sql, params as unknown[]);
            return { rows };
          },
        }),
      )) as T;
    },
  };
}

async function open(): Promise<Db> {
  const db = process.env.DATABASE_URL
    ? postgres(process.env.DATABASE_URL)
    : await embedded(process.env.PGLITE_PATH ?? ".data/pglite");
  for (const statement of schema.split(";").map((part) => part.trim()).filter(Boolean)) {
    await db.query(statement);
  }
  return db;
}

// Kept on globalThis so hot reloads in development reuse one connection.
const holder = globalThis as unknown as { warAndPeasDb?: Promise<Db> };

export function getDb() {
  holder.warAndPeasDb ??= open();
  return holder.warAndPeasDb;
}
