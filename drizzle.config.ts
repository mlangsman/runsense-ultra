import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  // Supabase owns the `authenticated` role; don't try to create it.
  entities: { roles: { provider: "supabase" } },
  strict: true,
  verbose: true,
});
