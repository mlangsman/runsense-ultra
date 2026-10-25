/**
 * The production database connection: Supabase Postgres through its
 * transaction pooler, which is what a serverless function should use.
 * `DATABASE_URL` is the pooler URL from the Supabase dashboard.
 *
 * Code that touches the database takes a `Db` so tests can hand it PGlite.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let cached: Db | undefined;

export function getDb(): Db {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // The transaction pooler does not support prepared statements.
  const client = postgres(url, { prepare: false, max: 1 });
  cached = drizzle(client, { schema, casing: "snake_case" });
  return cached;
}
