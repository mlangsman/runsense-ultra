# Decision log

One line per decision, oldest first. Kept concise for the engineering write-up. This file is the master copy and is updated in the same commit as the change it records; see CLAUDE.md.

| Date | Decision | Why | Instead of |
| --- | --- | --- | --- |
| 25 Sep 2026 | Build a private Strava-style app for my own Garmin data, incrementally and test-first | Each slice is testable on its own; ground rules are DRY, KISS, YAGNI, SOLID, linting, OWASP, the test pyramid and TDD | A big-bang build |
| 25 Sep 2026 | Rule out the Strava API | Its June 2026 policy bans any AI use of the data, including a model's context window, and needs a paid subscription | Strava as the data source |
| 25 Sep 2026 | Rule out HealthKit as the main source | Garmin writes workouts to Apple Health without the GPS track, with only high and low heart rate and no laps | HealthKit only |
| 25 Sep 2026 | Park Garmin's own API | Push-only to a server you host, 30-day backfill, business-only, and frozen to new applicants since spring 2026 | Garmin direct from day one |
| 25 Sep 2026 | Use intervals.icu as the data source | Approved Garmin partner, free, direct watch connection, full streams and laps, API terms that allow AI use, one year of backfill plus FIT upload for older history | Strava, HealthKit, Garmin direct |
| 25 Sep 2026 | iOS only on Expo | HealthKit was iOS-only anyway and Expo kept Android open. Superseded on 16 Oct | iOS and Android |
| 26 Sep 2026 | A thin backend from day one | Webhooks need a public endpoint, secrets stay off the phone, the coach and stats run server-side, and OWASP ASVS applies properly | A local-first app with no server, my first draft |
| 26 Sep 2026 | Host on Vercel | Free tier, deploys on push, streams responses. Daily-only cron and time-limited functions shaped the sync design | Railway, Fly.io, Cloudflare Workers |
| 26 Sep 2026 | Next.js route handlers in TypeScript | Already familiar, Vercel-native, and one shared domain package across app and API. The analysis is arithmetic, not data science | Hono, Express, Python with FastAPI |
| 26 Sep 2026 | Supabase Postgres with Drizzle, tests on PGlite | Mainstream database, PostGIS for routes later, pg_cron for a 15-minute sync, a dashboard. In-memory Postgres keeps tests fast | Turso, Neon |
| 26 Sep 2026 | Mocks before code | A grayscale clickable prototype of six screens and three coach concepts settled chat-first versus classic before anything became code. HTML first, Figma after | Designing in Figma first, or building screens straight into the app |
| 16 Oct 2026 | Build inside Claude as an MCP App, no native app | Claude supplies chat, memory and voice; widgets render inline or full-screen on iPhone, web and desktop; same backend; a stronger portfolio piece. Trade-off: no push, no offline, the conversation is the navigation | An Expo native app, or a Claude-hosted page |
| 16 Oct 2026 | Notify by email with an "open in Claude" link | Connectors cannot push. The email carries the summary and a map; the link opens Claude on the run. Desktop link is documented, iPhone to be tested | Native push notifications |
| 16 Oct 2026 | Multi-user: anyone can install it | intervals.icu OAuth per user, Supabase Auth as the OAuth 2.1 server Claude signs in with, row-level security from the first migration. Single user until Phase 1 | Single user only |
| 16 Oct 2026 | Aim the portfolio piece at AI-lab and tech recruiters | Adds an eval harness in CI, a public repo from the first commit, a ChatGPT cross-host check, and a write-up on the decisions and how the AI tooling was directed | Chasing download counts |
| 16 Oct 2026 | Build phases in the cloud, bootstrap and spike locally | Nothing needs the Mac now. One cloud session per phase opens a pull request while I am away; secrets never enter the repo | Everything local |
| 16 Oct 2026 | Keep a light, rebuildable copy: workout summaries, computed results and user notes, with detail fetched on demand | Summaries make the log, charts, trends and volume checks instant and let notes link by workout id; streams are rarely needed twice and holding them makes privacy and deletion heavier; intervals.icu stays the source of truth and already computes fitness, fatigue and form | Storing ids only and fetching everything live (slow, rate-limited, no cross-workout maths), or a full copy as source of truth |
| 16 Oct 2026 | One package, not a monorepo, with domain code in `src/domain` kept free of I/O | A single Next.js app keeps Vercel zero-config and avoids workspace tooling; the domain folder is the seam for a package later if a second app ever appears | The `packages/domain` + `apps/server` monorepo in PLAN.md (superseded on 16 Oct) |
| 16 Oct 2026 | npm, and the MCP 2.x packages (mcp-handler 2, ext-apps 2, @modelcontextprotocol/server 2) rather than the starter's pinned 1.x versions | npm needs no install for a single package. The 1.x line no longer resolves: ext-apps 1.7 needs SDK 1.29+ while mcp-handler 1.1 pins SDK 1.26. The 2.x line matches the 2026-07-28 spec the plan targets | pnpm; forcing the 1.x install with legacy peer resolution |
| 16 Oct 2026 | Goals set the coaching | The user states what they want (lose weight, feel better, a race time) and advice is shaped by it; evidence-based and conservative; niggles logged and trended, never diagnosed | A fixed coaching style |

## Still open

- [ ] Maps in the widget: real tiles if Claude honours the allowed domains, otherwise a monochrome vector map drawn from server data. The spike decides.
- [ ] Phone deep link: whether an email link pre-fills a Claude chat on iPhone. The spike decides.
- [ ] Coach concept: leaning towards rich answers (concept 3) with the coach thread's proactive comments (concept 1). Waiting on Marc's review of the mocks.
- [ ] intervals.icu webhooks for OAuth apps: unverified. Fallback is the 15-minute scheduled sync.
- [ ] Which training-load model drives volume warnings.
