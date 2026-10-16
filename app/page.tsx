"use client";

import { useMcpApp } from "@/app/hooks/use-mcp-app";
import { formatDuration } from "@/src/domain/workout";
import type { WorkoutRow } from "@/src/domain/summary";

interface RecentWorkoutsResult {
  days: number;
  range: { oldest: string; newest: string };
  totals: { count: number; runKm: number; rideKm: number; movingSec: number };
  workouts: WorkoutRow[];
}

const BADGE: Record<WorkoutRow["sport"], string> = {
  run: "rs-badge",
  ride: "rs-badge-outline",
  strength: "rs-badge-soft",
  swim: "rs-badge-soft",
  walk: "rs-badge-soft",
  other: "rs-badge-soft",
};

const LABEL: Record<WorkoutRow["sport"], string> = {
  run: "RUN",
  ride: "RIDE",
  strength: "GYM",
  swim: "SWIM",
  walk: "WALK",
  other: "OTHER",
};

export default function WorkoutsWidget() {
  const { toolResult, host } = useMcpApp();
  const result = toolResult as RecentWorkoutsResult | null;

  if (!result?.workouts) {
    return <Skeleton />;
  }

  const { totals, workouts, days } = result;

  return (
    <main className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between">
        <h1 className="rs-heading">Last {days} days</h1>
        <span className="rs-caption">{totals.count} workouts</span>
      </header>

      <section className="rs-card grid grid-cols-3 gap-3 px-4 py-3">
        <Stat label="Run" value={`${totals.runKm} km`} />
        <Stat label="Ride" value={`${totals.rideKm} km`} />
        <Stat label="Time" value={formatDuration(totals.movingSec)} />
      </section>

      <ul className="rs-card flex flex-col px-4">
        {workouts.map((w) => (
          <li
            key={w.id}
            className="rs-hairline flex min-h-11 items-center gap-3 border-b py-2.5 last:border-b-0"
          >
            <div className="w-9 shrink-0 text-center">
              <div className="rs-caption tracking-wide uppercase">{w.day}</div>
              <div className="rs-emphasis leading-tight">
                {w.date.split(" ")[0]}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 tracking-wide ${BADGE[w.sport]}`}
                >
                  {LABEL[w.sport]}
                </span>
                <span className="rs-emphasis truncate">{w.name}</span>
              </div>
              <div className="rs-caption truncate">{w.meta}</div>
            </div>
          </li>
        ))}
        {workouts.length === 0 && (
          <li className="rs-secondary py-3">No workouts in this period.</li>
        )}
      </ul>

      <details className="rs-caption">
        <summary>
          theme {host.theme ?? "unknown"} · host styles{" "}
          {host.hostStyles ? "provided" : "not provided"}
        </summary>
        <pre className="overflow-x-auto pt-1 whitespace-pre-wrap">
          {host.debug}
        </pre>
      </details>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="rs-caption tracking-wide uppercase">{label}</div>
      <div className="rs-heading">{value}</div>
    </div>
  );
}

/** Matches the final layout so the swap is smooth, per the host guidelines. */
function Skeleton() {
  const bar = "rounded animate-pulse";
  const tone = { background: "var(--rs-bg-tertiary)" } as const;
  return (
    <main className="flex flex-col gap-3" aria-busy="true">
      <div className={`${bar} h-5 w-28`} style={tone} />
      <section className="rs-card grid grid-cols-3 gap-3 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className={`${bar} h-3 w-10`} style={tone} />
            <div className={`${bar} h-5 w-16`} style={tone} />
          </div>
        ))}
      </section>
      <ul className="rs-card flex flex-col px-4">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="rs-hairline flex items-center gap-3 border-b py-3 last:border-b-0"
          >
            <div className={`${bar} h-8 w-9`} style={tone} />
            <div className="flex flex-1 flex-col gap-2">
              <div className={`${bar} h-3 w-40`} style={tone} />
              <div className={`${bar} h-3 w-56`} style={tone} />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
