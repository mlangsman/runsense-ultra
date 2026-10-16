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
    return <main className="rs-muted p-4 text-sm">Loading workouts…</main>;
  }

  const { totals, workouts, days } = result;

  return (
    <main className="flex flex-col gap-3 p-1">
      <header className="flex items-baseline justify-between px-1">
        <h1 className="text-base font-semibold tracking-tight">
          Last {days} days
        </h1>
        <span className="rs-muted text-xs">{totals.count} workouts</span>
      </header>

      <section className="rs-card grid grid-cols-3 gap-2 p-3">
        <Stat label="Run" value={`${totals.runKm} km`} />
        <Stat label="Ride" value={`${totals.rideKm} km`} />
        <Stat label="Time" value={formatDuration(totals.movingSec)} />
      </section>

      <ul className="flex flex-col gap-2">
        {workouts.map((w) => (
          <li
            key={w.id}
            className="rs-card flex items-center gap-3 px-3 py-2.5"
          >
            <div className="w-10 shrink-0 text-center">
              <div className="rs-muted text-[10px] font-semibold tracking-wider uppercase">
                {w.day}
              </div>
              <div className="text-sm font-semibold leading-tight">
                {w.date.split(" ")[0]}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${BADGE[w.sport]}`}
                >
                  {LABEL[w.sport]}
                </span>
                <span className="truncate text-sm font-medium">{w.name}</span>
              </div>
              <div className="rs-muted truncate text-xs">{w.meta}</div>
            </div>
          </li>
        ))}
      </ul>

      {workouts.length === 0 && (
        <p className="rs-muted text-sm">No workouts in this period.</p>
      )}

      <p className="rs-faint px-1 text-[10px]">
        theme {host.theme ?? "unknown"} · host styles{" "}
        {host.hostStyles ? "provided" : "not provided"}
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="rs-muted text-[10px] font-semibold tracking-wider uppercase">
        {label}
      </div>
      <div className="text-lg font-semibold leading-tight">{value}</div>
    </div>
  );
}
