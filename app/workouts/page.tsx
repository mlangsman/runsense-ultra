"use client";

import { useState } from "react";
import { framePadding, useMcpApp } from "@/app/hooks/use-mcp-app";
import {
  SPORT_LABEL,
  WorkoutDetail,
  WorkoutDetailSkeleton,
  type WorkoutDetailResult,
} from "@/app/components/workout-detail";
import { openWorkoutMessage } from "@/src/domain/describe";
import { formatDuration } from "@/src/domain/workout";
import type { WorkoutRow } from "@/src/domain/summary";

interface RecentWorkoutsResult {
  days: number;
  range: { oldest: string; newest: string };
  totals: { count: number; runKm: number; rideKm: number; movingSec: number };
  workouts: WorkoutRow[];
}

/** The row the user tapped, and its detail once `get_workout` has answered. */
interface Opened {
  row: WorkoutRow;
  detail: WorkoutDetailResult | null;
}

export default function WorkoutsWidget() {
  const { app, toolResult, host } = useMcpApp();
  const result = toolResult as RecentWorkoutsResult | null;
  // 16px inset, or the host's safe-area inset where that is larger.
  const frame = framePadding(host);
  const [opened, setOpened] = useState<Opened | null>(null);

  if (!result?.workouts) {
    return <Skeleton style={frame} />;
  }

  // Drilled in: the detail takes the list's place until the user goes back.
  if (opened) {
    const back = () => setOpened(null);
    return opened.detail ? (
      <WorkoutDetail
        result={opened.detail}
        app={app}
        host={host}
        style={frame}
        onBack={back}
      />
    ) : (
      <WorkoutDetailSkeleton style={frame} onBack={back} />
    );
  }

  const { totals, workouts, days } = result;
  const interactive = host.canCallTools || host.canMessage;

  /**
   * Tapping a row opens the workout. Where the host lets the widget call the
   * server's tools, we fetch it ourselves and show it here, telling Claude
   * what is on screen. Otherwise, or if that fails, we fall back to asking
   * Claude in the chat, which the host puts in the composer for the user to
   * send.
   */
  const open = async (row: WorkoutRow) => {
    if (host.canCallTools && app) {
      setOpened({ row, detail: null });
      try {
        const res = await app.callServerTool({
          name: "get_workout",
          arguments: { id: row.id },
        });
        const detail = res.structuredContent as WorkoutDetailResult | undefined;
        if (res.isError || !detail?.workout) {
          throw new Error(res.isError ? "tool returned an error" : "no detail");
        }
        // Ignore a late answer if the user has already gone back.
        setOpened((cur) => (cur?.row.id === row.id ? { row, detail } : cur));
        if (host.canUpdateContext) {
          void app
            .updateModelContext({
              content: [
                {
                  type: "text",
                  text: `The user opened ${row.name} (${row.day} ${row.date}, workout ${row.id}) inside the workouts widget and can see its map, stats and splits.`,
                },
              ],
            })
            .catch(() => {});
        }
        return;
      } catch (err) {
        void app.sendLog({
          level: "error",
          data: `get_workout from the widget failed: ${String(err)}`,
        });
        setOpened(null);
      }
    }
    if (!host.canMessage) return;
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

      {/* Flat, per the Figma redesign: the host draws the one card; stats and rows sit straight on it. */}
      <section className="flex gap-6">
        <Stat label="Run" value={`${totals.runKm} km`} />
        <Stat label="Ride" value={`${totals.rideKm} km`} />
        <Stat label="Time" value={formatDuration(totals.movingSec)} />
      </section>

      <ul className="flex flex-col">
        {workouts.map((w, i) => (
          <li key={w.id} className={i > 0 ? "rs-divider" : ""}>
            {interactive ? (
              <button
                type="button"
                className="rs-row"
                onClick={() => open(w)}
                aria-label={`Open ${w.name}, ${w.day} ${w.date}`}
              >
                <Row w={w} />
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
      <div className="rs-date">
        <div className="rs-caption">{w.day}</div>
        <div className="rs-emphasis leading-[18px]">{w.date.split(" ")[0]}</div>
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="truncate">{w.name}</span>
          <span className="rs-pill" data-sport={w.sport}>
            {SPORT_LABEL[w.sport]}
          </span>
        </div>
        <div className="rs-small rs-caption-color truncate">{w.meta}</div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 last:flex-1">
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
      <section className="flex gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="rs-skeleton h-3 w-10" />
            <div className="rs-skeleton h-5 w-16" />
          </div>
        ))}
      </section>
      <ul className="flex flex-col">
        {[0, 1, 2].map((i) => (
          <li key={i} className={i > 0 ? "rs-divider" : ""}>
            <div className="rs-row">
              <div className="rs-skeleton h-[52px] w-[52px]" />
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
