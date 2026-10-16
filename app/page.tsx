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
    return <main className="rs-muted p-3">Loading workouts…</main>;
  }

  const { totals, workouts, days } = result;

  return (
    <main className="flex flex-col px-3 py-2">
      <header className="flex items-baseline justify-between py-1">
        <h1 className="rs-heading">Last {days} days</h1>
        <span className="rs-label">{totals.count} workouts</span>
      </header>

      <section className="rs-hairline grid grid-cols-3 gap-2 border-b py-3">
        <Stat label="Run" value={`${totals.runKm} km`} />
        <Stat label="Ride" value={`${totals.rideKm} km`} />
        <Stat label="Time" value={formatDuration(totals.movingSec)} />
      </section>

      <ul className="flex flex-col">
        {workouts.map((w) => (
          <li
            key={w.id}
            className="rs-hairline flex items-center gap-3 border-b py-2.5 last:border-b-0"
          >
            <div className="w-9 shrink-0 text-center">
              <div className="rs-label tracking-wider uppercase">{w.day}</div>
              <div className="rs-medium leading-tight">
                {w.date.split(" ")[0]}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`rs-xs px-1.5 py-0.5 font-semibold tracking-wider ${BADGE[w.sport]}`}
                >
                  {LABEL[w.sport]}
                </span>
                <span className="rs-medium truncate">{w.name}</span>
              </div>
              <div className="rs-label truncate">{w.meta}</div>
            </div>
          </li>
        ))}
      </ul>

      {workouts.length === 0 && (
        <p className="rs-muted py-2">No workouts in this period.</p>
      )}

      <details className="rs-faint rs-xs pt-2">
        <summary>
          theme {host.theme ?? "unknown"} · host styles{" "}
          {host.hostStyles ? "provided" : "not provided"}
        </summary>
        <pre className="overflow-x-auto whitespace-pre-wrap pt-1">
          {host.debug}
        </pre>
      </details>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="rs-label tracking-wider uppercase">{label}</div>
      <div className="rs-stat leading-tight">{value}</div>
    </div>
  );
}
