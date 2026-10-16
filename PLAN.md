# runsense-ultra: build plan (v2, Claude connector)

## What we're building
A Claude connector that turns a runner's watch data into an interactive coach inside Claude: activity history, detail with map, splits and laps, a training log, personal bests and coaching, rendered as MCP App widgets on iPhone, web and desktop. Anyone with an intervals.icu account connected to their watch can install it. No native app. The product brief is in [PRODUCT.md](PRODUCT.md).

## Key decisions
- **Claude is the app.** Our MCP server supplies tools (data) and widgets (screens); Claude supplies chat, memory and voice. The Step 0 mocks become the widget designs.
- **Data: intervals.icu via OAuth.** Users connect their own account; scopes limited to reading activities and wellness. Covers Garmin, Coros, Suunto, Polar and Wahoo. Strava stays out because its API bans AI use.
- **Data we keep.** intervals.icu stays the source of truth. We store one summary row per workout, computed results such as best efforts, and what the user tells us. GPS, splits and laps are fetched on demand and cached with a time limit. The copy is rebuildable and dropped on disconnect.
- **Stack, all TypeScript.** Next.js on Vercel using Vercel's official MCP Apps starter (mcp-handler plus the MCP Apps SDK), Supabase Postgres with row-level security so every row is owned by a user, Supabase Auth as the OAuth 2.1 server Claude signs users in with, Resend for email, pg_cron for scheduled sync. One monorepo: `packages/domain` for the shared model and maths, `apps/server` for everything else.
- **One user first, multi-user data model from day one.** The spike and Phase 0 run on Marc's own key with no sign-in. But every table carries a user id with row-level security from the first migration, because that is cheap to do early and painful to retrofit. Accounts, per-user tokens encrypted at rest, rate limits, export and delete arrive in Phase 1.
- **Maps.** Real tiles if Claude honours the widget's allowed domains, otherwise a monochrome vector map drawn from server-supplied data. The spike decides.
- **Quality.** TDD in domain and server, with tools exercised in-process through an MCP client. Widgets tested as React components, plus manual passes in the MCP inspector and Claude. CI runs lint, typecheck, tests, audit, secret scan and SAST. OWASP ASVS for the server with a ZAP scan against previews.

## Steps
Each ends with something installable in Claude.

- **Step 0, mocks.** Done: https://claude.ai/artifact/JWjkuD3Wn4sMNKrRiAxK2Y
- **Spike, one to two days.** Vercel starter, one tool, the activity widget with a map, fixture data, single user, and an email with an "open in Claude" link. Answers four questions: widget on iPhone, map tiles or vector fallback, full-screen mode, and what the link does on a phone.
- **0. Foundations.** Public GitHub repo from the first commit, monorepo, CI, Vercel and Supabase projects, landing page skeleton. Done when the connector installs in Claude and a hello tool renders a widget.
- **1. Accounts and connections.** Sign-in, OAuth for Claude with dynamic registration, intervals.icu connect, onboarding page with the "add to Claude" steps, per-user ingestion with resumable backfill. Done when a second person installs it and sees only their own activities.
- **2. Core tools and widgets.** Activities list, activity detail with map, splits, laps and heart-rate chart, training log, stats and PBs. One tool and one widget each, built from the mocks.
- **3. Coaching and evals.** Goals, check-ins, niggle log and volume warnings; MCP prompts such as "weekly review" and "am I ready for a PB"; trend and PB tools; recommended project instructions; guardrails against medical advice. An eval harness in CI: a set of real coaching questions over fixture data, with deterministic checks that the numbers are right and a model-graded check on tone, so every change to a tool description or prompt is measured rather than eyeballed.
- **4. Notifications.** intervals.icu webhook or 15-minute sync per user, then an email with summary, static map, the coach's line and the link into Claude. Opt-in with unsubscribe.
- **5. Open it up.** Privacy policy and terms, export and delete, monitoring with a tool-call dashboard, Vercel Pro because Hobby is non-commercial, intervals.icu approval for all users, submission through Claude's developer portal and its usage analytics, a check that the same server renders in ChatGPT, and the portfolio package: README with architecture diagram, a thirty-second demo video, and an engineering write-up covering the decisions, the evals and how the AI tooling was directed.

Later: route generation, deeper analysis, Garmin direct, and a native app only if widgets prove limiting.

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
