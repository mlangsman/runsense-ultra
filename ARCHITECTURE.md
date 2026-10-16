# Architecture

Two pictures: how the parts fit together, and what happens after a run. Both render on GitHub. Keep them current when a component or flow changes.

## The system

```mermaid
flowchart LR
  runner([Runner])
  watch[Watch<br/>Garmin, Coros, Suunto, Polar]
  vendor[Vendor cloud<br/>e.g. Garmin Connect]
  icu[intervals.icu<br/>source of truth]
  claude[Claude<br/>iPhone, web, desktop]
  inbox[Email inbox]

  subgraph server [runsense-ultra on Vercel]
    direction TB
    ingest[Ingestion<br/>webhook + 15-min sync]
    mcp[MCP server<br/>tools + widgets]
    mail[Email sender]
    auth[Supabase Auth<br/>OAuth 2.1 for Claude]
  end

  db[(Supabase Postgres<br/>workout summaries, computed results,<br/>check-ins, niggles, goals, notes<br/>row-level security)]

  runner --> watch --> vendor --> icu
  icu -- new workout --> ingest
  ingest --> db
  ingest --> mail --> inbox
  inbox -- "open in Claude" link --> claude
  runner <--> claude
  claude -- MCP over HTTPS --> mcp
  claude -- sign in --> auth
  mcp <--> db
  mcp -- detail on demand, cached --> icu
```

**Boundaries.** intervals.icu owns the raw data. The server owns summaries, computed results and what the user tells us, all keyed by user with row-level security. Claude owns the conversation, memory and voice. Secrets live only in Vercel and Supabase settings.

## After a run

```mermaid
sequenceDiagram
  actor R as Runner
  participant W as Watch
  participant I as intervals.icu
  participant S as Server
  participant C as Claude

  R->>W: finish run
  W->>I: sync (via vendor cloud)
  I->>S: webhook, or 15-min sync picks it up
  S->>S: store summary, compute best efforts, check volume trend
  S-->>R: email: summary, map, coach's line, link
  R->>C: tap link (prompt pre-filled)
  C->>S: get_workout(id)
  S-->>C: data + widget
  C-->>R: run widget: map, splits, laps, "how did it feel?"
  R->>C: "felt hard, left calf tight"
  C->>S: log_check_in(id, effort, niggle)
  C-->>R: coaching, shaped by the user's goal
```

## Code layout

```
packages/domain   model, maths, formatting; pure TypeScript, no I/O
apps/server       Next.js on Vercel: MCP endpoint and widgets, ingestion, email, onboarding pages, auth glue
```

Dependencies point one way: `apps/server` depends on `packages/domain`; nothing depends on `apps/server`. Routes and MCP tools stay thin; services and domain functions hold the logic.
