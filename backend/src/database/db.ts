import "dotenv/config";

import { Pool, types } from "pg";

// node-postgres returns NUMERIC and BIGINT as strings to avoid precision loss.
// Financial figures in this app fit comfortably in a JS number (the validator
// caps them at 1e18), so parse them to numbers for consistent API types.
const PG_NUMERIC_OID = 1700;
const PG_INT8_OID = 20;
const PG_DATE_OID = 1082;

types.setTypeParser(PG_NUMERIC_OID, value => Number(value));
types.setTypeParser(PG_INT8_OID, value => Number(value));
// Keep DATE columns as plain YYYY-MM-DD strings instead of converting them to
// a JS Date at local midnight, which can shift the day across time zones.
types.setTypeParser(PG_DATE_OID, value => value);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

pool.on("error", error => {
  console.error("[database] idle client error", error);
});

export { pool, pool as db };
