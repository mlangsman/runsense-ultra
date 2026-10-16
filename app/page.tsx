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
  run: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
  ride: "border border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100",
  strength: "bg-zinc-300 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100",
  swim: "bg-zinc-300 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100",
  walk: "bg-zinc-300 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100",
  other: "bg-zinc-300 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100",
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
  const { toolResult } = useMcpApp();
  const result = toolResult as RecentWorkoutsResult | null;

  if (!result?.workouts) {
    return (
      <main className="p-5 font-sans text-sm text-zinc-500">
        Waiting for workouts…
      </main>
    );
  }

  const { totals, workouts, days } = result;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-3 p-4 font-sans text-zinc-900 dark:text-zinc-100">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold tracking-tight">
          Last {days} days
        </h1>
        <span className="text-xs text-zinc-500">{totals.count} workouts</span>
      </header>

      <section className="grid grid-cols-3 gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <Stat label="Run" value={`${totals.runKm} km`} />
        <Stat label="Ride" value={`${totals.rideKm} km`} />
        <Stat label="Time" value={formatDuration(totals.movingSec)} />
      </section>

      <ul className="flex flex-col gap-2">
        {workouts.map((w) => (
          <li
            key={w.id}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="w-10 shrink-0 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {w.day}
              </div>
              <div className="text-sm font-semibold leading-tight">
                {w.date.split(" ")[0]}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${BADGE[w.sport]}`}
                >
                  {LABEL[w.sport]}
                </span>
                <span className="truncate text-sm font-medium">{w.name}</span>
              </div>
              <div className="truncate text-xs text-zinc-500">{w.meta}</div>
            </div>
          </li>
        ))}
      </ul>

      {workouts.length === 0 && (
        <p className="text-sm text-zinc-500">No workouts in this period.</p>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="text-lg font-semibold leading-tight">{value}</div>
    </div>
  );
}
