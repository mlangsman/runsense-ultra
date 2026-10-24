# runsense-ultra

A running coach inside Claude: an MCP server with interactive widgets, fed by the user's watch via intervals.icu. Read [PRODUCT.md](PRODUCT.md) for what we're building, [PLAN.md](PLAN.md) for the phases and done criteria, and [DECISIONS.md](DECISIONS.md) before proposing a change of direction.

## How we work

- Small, incremental, testable slices. One phase per session, one pull request per phase, with the phase's done criteria from PLAN.md as the acceptance test.
- Test-first in `src/domain`, `src/sources` and `src/services`, and in the tools. Screens and widgets get tests after. Test pyramid: many unit, few integration, very few end-to-end.
- DRY, KISS, YAGNI, SOLID, separation of concerns. Thin route handlers and thin MCP tools; logic lives in services and domain functions. Don't build ahead of the phase.
- Mainstream tools over clever ones. If you're reaching for something unusual, note why in DECISIONS.md.
- Plain language in docs and commit messages. Keep documents short.

## Decision log, kept as you go

Whenever a choice is made that someone could reasonably have made differently, add one row to [DECISIONS.md](DECISIONS.md) in the same commit: date, decision, why, instead of. That includes libraries, data model shapes, trade-offs accepted, and anything that reverses an earlier row (mark the old row "superseded on <date>"). Open questions go in its "Still open" list and are ticked and turned into rows when settled. Do this without being asked; the pull request template has a checkbox for it. Keep [ARCHITECTURE.md](ARCHITECTURE.md) current when a component or data flow changes. Widgets follow [docs/widget-design-rules.md](docs/widget-design-rules.md), distilled from Anthropic's MCP Apps design guidelines.

## MCP Apps plugin

The [MCP Apps plugin](https://github.com/modelcontextprotocol/ext-apps/tree/main/plugins/mcp-apps) is enabled for this repo in `.claude/settings.json`, so its skills (`create-mcp-app`, `add-app-to-server`, `convert-web-app`) load in every session. Follow them for anything touching `app/mcp` or the widgets: text fallback in every tool result, CSP on the resource contents, handlers registered before connect, the SDK's React hooks (`useApp`, `useHostStyleVariables`, `useHostFonts`) rather than a hand-rolled bridge, host variables for every style, `sendLog` for anything the host should see.

## Stack

TypeScript everywhere, npm, one Next.js app on Vercel. `src/domain` holds the model, maths and formatting with no I/O; `src/sources` the data-source clients and mappers; `src/services` the use cases; `app/mcp` the MCP endpoint via mcp-handler and the MCP Apps SDK; `app/` the widgets and pages. Supabase Postgres with Drizzle, row-level security on every table, tests on PGlite. Supabase Auth as the OAuth 2.1 server for Claude. intervals.icu via OAuth. Resend for email. Target the MCP 2026-07-28 spec.

## Security

- Secrets only in environment settings (Vercel, Supabase, the cloud session). Never in this repo, never in logs. `.env.example` lists names only.
- Every table has a `user_id` and an RLS policy from its first migration. Per-user tokens encrypted at rest.
- Validate all inputs with zod. Bearer or OAuth on every route except health and webhooks; webhooks verify a secret.
- OWASP ASVS for the server. CI runs lint, typecheck, tests, `npm audit`, gitleaks, Semgrep and CodeQL; Dependabot opens weekly update pull requests.
- The coach never gives medical advice; see the principles in PRODUCT.md.

## Commands

`npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check`, `npm run dev`. Database: `npm run db:generate` after changing `src/db/schema.ts` (commit the SQL it writes), apply it to Supabase through the Supabase connector's `apply_migration` with the same SQL plus a row in `drizzle.__drizzle_migrations` (hash is the SHA-256 of the file, `created_at` the `when` from the journal), or `npm run db:migrate` where `DATABASE_URL` is set. Tests run the same migrations on PGlite, so no database is needed to run them.
