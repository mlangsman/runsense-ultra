# runsense-ultra: product brief

Draft, 16 October 2026. Owner: Marc. This is the brief the code is built against; the plan is in [PLAN.md](PLAN.md) and the reasoning behind choices is in [DECISIONS.md](DECISIONS.md).

## What we are building

We are building a running and fitness coach inside of Claude.

It works more like a traditional coach than an app. It meets the user where they already are, evolves itself to meet their needs and can use a wider range of data: how the user is feeling, what's happening in their life, how fitness fits in with other goals. The user can ask for things outside the scope of a fixed UI, like planning runs when they're not following a training plan, or a run that draws a snowman on the map.

## Who it is for

Self-coached runners who wear a watch (Garmin, Coros, Suunto, Polar), have it connected to intervals.icu, and already use Claude. Version one coaches running. Rides and gym sessions are tracked and taken into account, not coached.

## How are we differentiating from Strava?

- Strava AI is quite basic and limited in scope.
- Strava's UI has not really adapted to benefit from agentic technologies.
- Building inside Claude lets us build something that works more like a traditional coach: it meets the user where they already are, evolves to meet their needs, and can use a wider range of data than a fitness app sees.
- The user can request things which are outside the scope of a fixed UI.
- Strava has no wellness data. We get sleep, resting heart rate, HRV and fitness, fatigue and form from the watch via intervals.icu.

## As a user

- When I complete a workout I can see it in Claude and it feeds back on my effort and progress.
- I can see performance metric charts so I can gauge my progress: weekly volume, pace at a given heart rate, PB progression, training load against fitness, and my watch's VO2max estimate.
- Claude will ask me about my workout, including how I felt, and this will get logged, including tracking any niggles, to prevent injuries.
- Claude will let me know if my volume is increasing too much.
- Claude will suggest ways to optimise my routine.
- Claude will show my workout log for a given week or month with a UI widget.
- Claude will intelligently help me plan routes. Instead of just using heatmaps like Strava it will offer interesting options such as paths I haven't explored before, or going via landmarks.
- Claude will be aware of other things happening in my life, such as stress and commitments, which it will use to help provide guidance.

Two of these need a mechanism, so here is how they work in practice:

- **The check-in.** Claude can't start a conversation. When a workout syncs, I get an email with the summary and a link. Tapping it opens Claude on that run, where Claude asks how it felt. The run widget also has a one-tap "log how it felt" so it works without the email.
- **Awareness of my life.** The coach can't read my other chats. It remembers what I tell it, and Claude's own memory carries context across chats when that's turned on. What I tell the coach is stored with my data, linked to the workout or the week it relates to, so it's there next time.

## Goals drive the coaching

The user says what they're trying to achieve: lose weight, feel better, hit a race time, get back from injury. The coach's advice, warnings and suggestions are shaped by that goal and can be changed at any time.

Principles the coach follows:

- Evidence-based and conservative. Volume warnings come from load trends over weeks, not a single number.
- Easy days easy, hard days with a purpose.
- Niggles and pain are logged and trended, never diagnosed. Persistent pain gets "see a physio", not a treatment plan.
- It explains its reasoning with the user's own numbers.

## Data the coach uses

- **From the watch via intervals.icu:** activities with distance, time, pace, heart rate, cadence, power, GPS route, laps and splits; wellness including sleep, resting heart rate, HRV, and fitness, fatigue and form.
- **From the user:** how a workout felt, effort, niggles and injuries, goals, and life context such as stress, travel or a race entry. All of this is stored by us and linked to the workout, week or goal it belongs to.

## Under the hood (not user facing)

- **Our own database holds the user's workouts.** It is the source of truth, kept in sync from intervals.icu, so anything the user tells us can be linked to a specific workout by id, and summaries and metrics are computed from our copy rather than re-fetched.
- **Tools the coach calls:** a summary of the last N workouts, the log for a week or month, one workout in detail, computed metrics and trends, personal bests, wellness for a period, and writes for check-ins, niggles, goals and notes.
- **Widgets:** workout detail with map, splits and laps; the weekly and monthly log; the progress charts; a check-in form.
- **Notifications:** email on new workout with an "open in Claude" link.

## Not in scope

- Recording activities. The watch records; we read.
- Social features, feeds, kudos, segments.
- Strava data in any form.
- Medical advice.

## How we'll know it's working

- The user comes back after workouts without being prompted, and logs how they felt.
- Advice gets followed: a flagged volume jump is followed by an easier week.
- Coaching quality holds up on the eval set in CI as prompts and tools change.

## Phasing

- **Version one:** the after-workout loop, the log and charts, goals, niggle tracking, volume warnings, routine suggestions.
- **Later:** route planning with exploration and landmarks, GPS art, deeper life context, more sports coached.

## Open questions

- Which load model to use for volume warnings, and how to explain it simply.
- How much of the wellness data to show versus use quietly.
- Route export to the watch: GPX download, or push via intervals.icu.
