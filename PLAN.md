# runsense-ultra: build plan (v2, Claude connector)

## What we're building
A Claude connector that turns a runner's watch data into an interactive coach inside Claude: activity history, detail with map, splits and laps, a training log, personal bests and coaching, rendered as MCP App widgets on iPhone, web and desktop. Anyone with an intervals.icu account connected to their watch can install it. No native app. The product brief is in [PRODUCT.md](PRODUCT.md).

## Key decisions
- **Claude is the app.** Our MCP server supplies tools (data) and widgets (screens); Claude supplies chat, memory and voice. The Step 0 mocks become the widget designs.
- **Data: intervals.icu via OAuth.** Users connect their own account; scopes limited to reading activities and wellness. Covers Garmin, Coros, Suunto, Polar and Wahoo. Strava stays out because its API bans AI use.
- **Data we keep.** intervals.icu stays the source of truth. We store one summary row per workout, computed results such as best efforts, and what the user tells us. GPS, splits and laps are fetched on demand and cached with a time limit. The copy is rebuildable and dropped on disconnect.
- **Stack, all TypeScript.** Next.js on Vercel using Vercel's official MCP Apps starter (mcp-handler plus the MCP Apps SDK), Supabase Postgres with row-level security so every row is owned by a user, Supabase Auth as the OAuth 2.1 server Claude signs users in with, Resend for email, pg_cron for scheduled sync. One Next.js package, with `src/domain` kept free of I/O as the seam for a shared package later (see DECISIONS.md, 16 Oct).
- **One user first, multi-user data model from day one.** The spike and Phase 0 run on Marc's own key with no sign-in. But every table carries a user id with row-level security from the first migration, because that is cheap to do early and painful to retrofit. Accounts, per-user tokens encrypted at rest, rate limits, export and delete arrive in Phase 1.
- **Maps.** Real tiles if Claude honours the widget's allowed domains, otherwise a monochrome vector map drawn from server-supplied data. The spike decides.
- **Quality.** TDD in domain and server, with tools exercised in-process through an MCP client. Widgets tested as React components, plus manual passes in the MCP inspector and Claude. CI runs lint, typecheck, tests, audit, secret scan and SAST. OWASP ASVS for the server with a ZAP scan against previews.

## Steps
Each ends with something installable in Claude.

- **Step 0, mocks.** Done: https://claude.ai/artifact/JWjkuD3Wn4sMNKrRiAxK2Y
- **Spike, one to two days.** Mostly done, see "Where we are". Vercel starter, two tools (history and detail), the detail widget with a map, real anonymised fixtures, single user behind a shared bearer token. Still to do: the email with an "open in Claude" link. Answers four questions: widget on iPhone (yes), map tiles or vector fallback, full-screen mode, and what the link does on a phone (the last three waiting on a check in Claude).
- **0. Foundations.** Public GitHub repo from the first commit, CI, Vercel and Supabase projects, landing page skeleton. Done when the connector installs in Claude and a hello tool renders a widget. Repo, CI, Vercel and the connector are done by the spike; the schema, first migration with row-level security, PGlite tests and landing page on 24 Oct. The Supabase project and first migration followed the same day. Done.
- **1. Accounts and connections.** Sign-in, OAuth for Claude with dynamic registration, intervals.icu connect, onboarding page with the "add to Claude" steps, per-user ingestion with resumable backfill. Done when a second person installs it and sees only their own activities.
- **1b. Peloton sync (single user).** Peloton rides reach intervals.icu through Strava today, and intervals.icu hides Strava activities from its API, so the coach cannot see them. A Vercel cron route polls Peloton's unofficial API with Marc's username and password (Vercel sensitive environment variables), converts each new ride to TCX with power, cadence and heart rate, and uploads it to intervals.icu, which replaces the Strava stub with a full activity. `src/sources/peloton` (client and TCX mapper, test-first), a `syncPeloton` service, a cron route locked by a secret, no new tables. Done when a Peloton ride taken after the deploy appears in `list_recent_workouts` with power and heart rate, without touching the phone. Daily on Vercel Hobby; hourly once pg_cron or Vercel Pro exists. Multi-user Peloton waits until there is a way to hold other people's passwords that we are comfortable with.
- **1c. Security audit.** A full review of everything built so far, written up as `docs/security-audit-<date>.md` with each finding fixed in the same pull request or ticketed with a date. Covers: OWASP ASVS level 2 walked control by control for the server, middleware and cron routes; OWASP Top 10 for LLM applications and the MCP-specific risks (prompt injection through tool results and workout names, tool description poisoning, widget CSP and what the iframe can reach, data leaving through widget calls); MITRE ATT&CK for SaaS and cloud mapped to Vercel, Supabase, GitHub and the proxy, and MITRE ATLAS for the AI surface; a threat model of who can reach the MCP endpoint, the cron route and the widgets, and what each could extract. Credential checks: gitleaks over the whole git history, not just the working tree; every Vercel variable reviewed for scope and sensitivity; a test that no error message, tool result, log line or widget payload can carry a token, password, cookie or API key; `npm audit` and Semgrep clean; CI proven to block a planted secret. Extractability: every tool result and resource is read as an attacker would, confirming nothing beyond the athlete's own workouts is reachable through the MCP endpoint, the cron route or any other route, with the shared token absent, wrong or replayed. Done when the report is merged with no open high or critical finding.
- **2. Core tools and widgets.** Activities list, activity detail with map, splits, laps and heart-rate chart, training log, stats and PBs. One tool and one widget each, built from the mocks.
- **3. Coaching and evals.** Goals, check-ins, niggle log and volume warnings; MCP prompts such as "weekly review" and "am I ready for a PB"; trend and PB tools; recommended project instructions; guardrails against medical advice. An eval harness in CI: a set of real coaching questions over fixture data, with deterministic checks that the numbers are right and a model-graded check on tone, so every change to a tool description or prompt is measured rather than eyeballed.
- **4. Notifications.** intervals.icu webhook or 15-minute sync per user, then an email with summary, static map, the coach's line and the link into Claude. Opt-in with unsubscribe.
- **5. Open it up.** Privacy policy and terms, export and delete, monitoring with a tool-call dashboard, Vercel Pro because Hobby is non-commercial, intervals.icu approval for all users, submission through Claude's developer portal and its usage analytics, a check that the same server renders in ChatGPT, and the portfolio package: README with architecture diagram, a thirty-second demo video, and an engineering write-up covering the decisions, the evals and how the AI tooling was directed.

Later: route generation, deeper analysis, Garmin direct, and a native app only if widgets prove limiting.

## Where we are (24 Oct 2026)

Merged to main and deployed: `list_recent_workouts` and `get_workout`, the history and detail widgets, the map drawn from real GPS data, and tap-to-open from a history row. Rendering lessons are in DECISIONS.md.

Step 1b, the Peloton sync, is live: the first production run on 24 Oct uploaded four rides to intervals.icu with power, cadence and heart rate, replacing their Strava stubs, and `list_recent_workouts` shows them. The daily cron takes it from here. Peloton retired its old login during the build, so the client uses the OAuth token endpoint (DECISIONS.md, 24 Oct).

Waiting on Marc, in Claude on desktop and iPhone:
1. Tiles: desktop shows them, so `resourceDomains` works, but CARTO now needs a key. Set `NEXT_PUBLIC_CARTO_API_KEY` in Vercel (free, carto.com/basemaps/apikey) and redeploy. iPhone still to check.
2. Does "Splits and laps" go full screen and "Back to chat" return?
3. Does tapping a history row open the detail?
Once both devices render, remove the four legacy widget alias URIs in `app/mcp/route.ts`.

Phase 0's code is done: the Drizzle schema and first migration (a `workouts` summary table with `user_id` and an owner-only row-level security policy), the queries that map rows to `Workout`, tests on PGlite that prove the policy, the landing page at `/`, and the Coach project instruction in [docs/claude-project-instructions.md](docs/claude-project-instructions.md). The Supabase project exists (eu-west-1), `DATABASE_URL` is in Vercel, and the first migration is applied, so Phase 0 is done. Still to do by hand: paste the project instruction into the Coach project.

Next session: Phase 1, accounts and connections. The spike's email is built on branch `feat/workout-email` (webhook route, Resend sender, the email with the coach's line and the Open in Claude link); to turn it on it needs a Resend key and a verified sending domain in Vercel, and an app on intervals.icu's developer settings page with the webhook URL, the secret as its authorization header and `ACTIVITY_UPLOADED` ticked. The form needs a privacy policy URL, so `/privacy` exists now. It can also be tested with a hand-made webhook call. The static map in the email arrives when `feat/apple-maps-snapshot` merges.

## How a run reaches a user
Watch to Garmin to intervals.icu, then a webhook or the scheduled sync pulls it per user. The server stores the summary, computes best efforts, and emails the summary with a link. The link opens Claude, Claude calls the tool, and the widget renders.

## Working method
Bootstrap and the spike run locally. Phases 1 to 5 run as cloud sessions, one phase per session with the done criteria above, each opening a pull request that is reviewed locally. Secrets live in Vercel, Supabase and the cloud environment's settings, never in this repo.

## Before we start (Marc)
1. Email intervals.icu to register the OAuth app: name, description, website, logo, privacy policy URL and redirect URIs. Your personal API key covers the spike meanwhile.
2. Vercel, Supabase, GitHub and Resend accounts, plus a domain for email and OAuth redirects.
3. Garmin data export for your own older history.

## Risks
- **Claude host behaviour** for map tiles and phone deep links. The spike settles it first.
- **intervals.icu dependency and app approval.** Community intervals.icu MCP servers already exist; ours stands apart on widgets, coaching tools and notifications.
- **Multi-user raises the bar** on security, support and cost: roughly $45 a month for Vercel Pro and Supabase Pro once there are real users.
- **Supabase registration quirk.** Each Claude reconnect registers a fresh client. Cosmetic, tracked upstream.
