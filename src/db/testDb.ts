/**
 * An in-memory Postgres for tests: PGlite with the real migrations applied,
 * plus the two pieces of Supabase the policies lean on, the `authenticated`
 * role and `auth.uid()`. Nothing to install and nothing shared between runs.
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";
import type { Db } from "./client";

const migrationsFolder = fileURLToPath(
  new URL("./migrations", import.meta.url),
);

export interface TestDb {
  /** Connected as the superuser: sees everything, as the service role would. */
  admin: Db;
  /**
   * Run `fn` as Supabase would for a signed-in user (or an anonymous caller
   * when `userId` is null): the `authenticated` role with the JWT subject set,
   * so row-level security applies.
   */
  asUser<T>(userId: string | null, fn: (db: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema, casing: "snake_case" });
  await db.execute(sql`create schema if not exists auth`);
  // Supabase's auth.uid() reads the JWT; the shim reads the same setting.
  await db.execute(sql`
    create or replace function auth.uid() returns uuid
    language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$
  `);
  await db.execute(sql`create role authenticated nologin`);
  await migrate(db, { migrationsFolder });
  await db.execute(sql`grant usage on schema public to authenticated`);
  await db.execute(
    sql`grant select, insert, update, delete on all tables in schema public to authenticated`,
  );

  return {
    admin: db,
    asUser: (userId, fn) =>
      db.transaction(async (tx) => {
        await tx.execute(
          sql`select set_config('request.jwt.claim.sub', ${userId ?? ""}, true)`,
        );
        await tx.execute(sql`set local role authenticated`);
        return fn(tx);
      }),
    close: () => pglite.close(),
  };
}
