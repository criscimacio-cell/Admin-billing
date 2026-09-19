import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// node-postgres's default DATE (OID 1082) parser builds a JS Date using
// the server process's LOCAL timezone, not UTC — so on any machine not
// running in UTC (e.g. a server set to Philippine time), a plain calendar
// date like '2026-09-16' comes back from a query shifted by a day once
// serialized to JSON. DATE columns have no time-of-day or timezone
// component at all, so the correct fix is to never turn them into a Date
// object in the first place — return the raw 'YYYY-MM-DD' string as-is.
// This must run before any query executes. (TIMESTAMPTZ columns like
// created_at are unaffected and keep their normal Date parsing.)
pg.types.setTypeParser(1082, (value) => value);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

export const query = (text, params) => pool.query(text, params);
