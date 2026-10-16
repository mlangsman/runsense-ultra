"use client";

import { useMcpApp } from "@/app/hooks/use-mcp-app";
import { openWorkoutMessage } from "@/src/domain/describe";
import { formatDuration } from "@/src/domain/workout";
import type { WorkoutRow } from "@/src/domain/summary";

interface RecentWorkoutsResult {
  days: number;
  range: { oldest: string; newest: string };
  totals: { count: number; runKm: number; rideKm: number; movingSec: number };
  workouts: WorkoutRow[];
}

const LABEL: Record<WorkoutRow["sport"], string> = {
  run: "Run",
  ride: "Ride",
  strength: "Gym",
  swim: "Swim",
  walk: "Walk",
  other: "Other",
};

export default function WorkoutsWidget() {
  const { app, toolResult, host } = useMcpApp();
  const result = toolResult as RecentWorkoutsResult | null;
  // The host asks us to keep these edges clear (16px each side on iPhone).
  const frame = {
    paddingTop: host.safeArea.top,
    paddingRight: host.safeArea.right,
    paddingBottom: host.safeArea.bottom,
    paddingLeft: host.safeArea.left,
  };

  if (!result?.workouts) {
    return <Skeleton style={frame} />;
  }

  const { totals, workouts, days } = result;

  // Tapping a row asks Claude for that workout; the detail widget follows.
  const open = async (row: WorkoutRow) => {
    try {
      const result = await app?.sendMessage({
        role: "user",
        content: [{ type: "text", text: openWorkoutMessage(row) }],
      });
      // The host can advertise the capability and still refuse the message; tell the host's log rather than fail silently.
      if (result?.isError) {
        void app?.sendLog({
          level: "warning",
          data: "host declined ui/message",
        });
      }
    } catch (err) {
      void app?.sendLog({
        level: "error",
        data: `ui/message failed: ${String(err)}`,
      });
    }
  };

  return (
    <main className="flex flex-col gap-3" style={frame}>
      <header className="flex items-baseline justify-between">
        <h1 className="rs-heading">Last {days} days</h1>
        <span className="rs-caption">
          {totals.count} {totals.count === 1 ? "workout" : "workouts"}
        </span>
      </header>

      <section className="rs-card grid grid-cols-3 gap-4 p-4">
        <Stat label="Run" value={`${totals.runKm} km`} />
        <Stat label="Ride" value={`${totals.rideKm} km`} />
        <Stat label="Time" value={formatDuration(totals.movingSec)} />
      </section>

      <ul className="rs-card flex flex-col">
        {workouts.map((w, i) => (
          <li key={w.id} className={i > 0 ? "rs-divider" : ""}>
            {host.canMessage ? (
              <button
                type="button"
                className="rs-row"
                onClick={() => open(w)}
                aria-label={`Open ${w.name}, ${w.day} ${w.date}`}
              >
                <Row w={w} />
                <span className="rs-caption" aria-hidden="true">
                  ›
                </span>
              </button>
            ) : (
              <div className="rs-row">
                <Row w={w} />
              </div>
            )}
          </li>
        ))}
        {workouts.length === 0 && (
          <li className="rs-secondary py-3">No workouts in this period.</li>
        )}
      </ul>
    </main>
  );
}

function Row({ w }: { w: WorkoutRow }) {
  return (
    <>
      <div className="w-10 shrink-0 text-center">
        <div className="rs-caption">{w.day}</div>
        <div className="rs-emphasis leading-tight">{w.date.split(" ")[0]}</div>
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="rs-pill">{LABEL[w.sport]}</span>
          <span className="truncate">{w.name}</span>
        </div>
        <div className="rs-small rs-caption-color truncate">{w.meta}</div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="rs-caption">{label}</div>
      <div className="rs-emphasis">{value}</div>
    </div>
  );
}

/** Matches the final layout so the swap is smooth, per the host guidelines. */
function Skeleton({ style }: { style: React.CSSProperties }) {
  return (
    <main className="flex flex-col gap-3" style={style} aria-busy="true">
      <div className="rs-skeleton h-5 w-28" />
      <section className="rs-card grid grid-cols-3 gap-4 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="rs-skeleton h-3 w-10" />
            <div className="rs-skeleton h-5 w-16" />
          </div>
        ))}
      </section>
      <ul className="rs-card flex flex-col px-4">
        {[0, 1, 2].map((i) => (
          <li key={i} className={i > 0 ? "rs-divider" : ""}>
            <div className="rs-row">
              <div className="rs-skeleton h-8 w-10" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="rs-skeleton h-3 w-40" />
                <div className="rs-skeleton h-3 w-56" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
