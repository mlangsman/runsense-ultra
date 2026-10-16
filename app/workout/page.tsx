"use client";

import { useEffect, useRef, useState } from "react";
import { useMcpApp } from "@/app/hooks/use-mcp-app";
import {
  formatDistanceKm,
  formatDuration,
  formatPace,
  paceSecPerKm,
  type Lap,
  type Workout,
} from "@/src/domain/workout";
import type { WorkoutRow } from "@/src/domain/summary";
import type { Split } from "@/src/domain/splits";
import { decodePolyline } from "@/src/domain/route";
import { layoutStaticMap, tileUrl } from "@/src/domain/map";

interface WorkoutDetailResult {
  workout: Workout;
  heading: WorkoutRow & { startTime: string };
  polyline: string | null;
  splits: Split[];
  laps: Lap[];
}

/**
 * CARTO has required a key on every raster tile since 25 Sep 2026; without one
 * the tiles come back as an "API KEY REQUIRED" watermark. Inlined at build
 * time; with no key the route draws on a plain card.
 */
const TILE_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY ?? "";

const LABEL: Record<Workout["sport"], string> = {
  run: "Run",
  ride: "Ride",
  strength: "Gym",
  swim: "Swim",
  walk: "Walk",
  other: "Other",
};

export default function WorkoutWidget() {
  const { app, toolResult, host } = useMcpApp();
  const result = toolResult as WorkoutDetailResult | null;
  const frame = {
    paddingTop: host.safeArea.top,
    paddingRight: host.safeArea.right,
    paddingBottom: host.safeArea.bottom,
    paddingLeft: host.safeArea.left,
  };
  const fullscreen = host.displayMode === "fullscreen";

  if (!result?.workout) return <Skeleton style={frame} />;

  const { workout: w, heading, polyline, splits, laps } = result;
  const canGoFullscreen =
    host.availableDisplayModes == null ||
    host.availableDisplayModes.includes("fullscreen");

  const setMode = async (mode: "inline" | "fullscreen") => {
    try {
      await app?.requestDisplayMode({ mode });
    } catch (err) {
      console.warn("[mcp-app] display mode request failed:", err);
    }
  };

  return (
    <main className="flex flex-col gap-3" style={frame}>
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="rs-pill">{LABEL[w.sport]}</span>
          <h1 className="rs-heading truncate">{w.name}</h1>
        </div>
        <span className="rs-caption">
          {heading.day} {heading.date} · {heading.startTime}
        </span>
      </header>

      {polyline && (
        <StaticMap
          polyline={polyline}
          height={fullscreen ? 360 : 200}
          theme={host.theme}
        />
      )}

      <section
        className={`rs-card grid gap-4 p-4 ${fullscreen ? "grid-cols-4" : "grid-cols-4"}`}
      >
        <Stat label="Distance" value={formatDistanceKm(w.distanceM)} />
        <Stat label="Time" value={formatDuration(w.movingSec)} />
        {w.sport === "ride" ? (
          <Stat label="Speed" value={speed(w)} />
        ) : (
          <Stat
            label="Pace"
            value={`${formatPace(paceSecPerKm(w.distanceM, w.movingSec))} /km`}
          />
        )}
        <Stat label="Avg HR" value={w.avgHr != null ? String(w.avgHr) : "–"} />
        {fullscreen && (
          <>
            <Stat
              label="Max HR"
              value={w.maxHr != null ? String(w.maxHr) : "–"}
            />
            <Stat
              label="Climb"
              value={
                w.elevationGainM != null
                  ? `${Math.round(w.elevationGainM)} m`
                  : "–"
              }
            />
            <Stat
              label="Cadence"
              value={w.cadenceSpm != null ? `${w.cadenceSpm} spm` : "–"}
            />
            <Stat
              label="Load"
              value={w.trainingLoad != null ? String(w.trainingLoad) : "–"}
            />
          </>
        )}
      </section>

      {splits.length > 0 && !fullscreen && <SplitsChart splits={splits} />}
      {fullscreen && splits.length > 0 && <SplitsTable splits={splits} />}
      {fullscreen && laps.length > 0 && <LapsTable laps={laps} />}

      {(splits.length > 0 || laps.length > 0) && canGoFullscreen && (
        <div className="flex justify-end">
          {fullscreen ? (
            <button className="rs-button" onClick={() => setMode("inline")}>
              Back to chat
            </button>
          ) : (
            <button className="rs-button" onClick={() => setMode("fullscreen")}>
              Splits and laps
            </button>
          )}
        </div>
      )}
    </main>
  );
}

function speed(w: Workout): string {
  if (!w.distanceM || !w.movingSec) return "–";
  return `${(w.distanceM / 1000 / (w.movingSec / 3600)).toFixed(1)} km/h`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="rs-caption">{label}</div>
      <div className="rs-heading truncate">{value}</div>
    </div>
  );
}

/**
 * Tiles behind an SVG route. The tile grid and the route's pixel path come
 * from the domain maths; this component only measures the frame and places
 * images. If there is no tile key, or a tile fails to load (for instance,
 * blocked by the host's content policy), the tiles are dropped and the route
 * stays on a plain card, so the widget degrades to a vector map rather than
 * breaking.
 */
function StaticMap({
  polyline,
  height,
  theme,
}: {
  polyline: string;
  height: number;
  /** The host's theme; null when it sends none (iPhone), so the tiles follow the OS like the rest of the widget. */
  theme: "light" | "dark" | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [retina, setRetina] = useState(false);
  const [osDark, setOsDark] = useState(false);
  const dark = theme ? theme === "dark" : osDark;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setRetina(window.devicePixelRatio > 1);
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    setOsDark(scheme.matches);
    const onScheme = (e: MediaQueryListEvent) => setOsDark(e.matches);
    scheme.addEventListener("change", onScheme);
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
      scheme.removeEventListener("change", onScheme);
    };
  }, []);

  const track = decodePolyline(polyline);
  const layout =
    width > 0 ? layoutStaticMap({ track, width, height, padding: 24 }) : null;
  const style = dark ? "dark_all" : "light_all";
  const showTiles = TILE_KEY !== "" && !tilesFailed;
  const start = layout?.path[0];
  const end = layout?.path[layout.path.length - 1];

  return (
    <div
      ref={ref}
      className="rs-card rs-map"
      style={{ height }}
      aria-label="Route map"
    >
      {layout &&
        showTiles &&
        layout.tiles.map((t) => (
          // Raw map tiles from the provider: next/image would proxy them through Vercel for nothing.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${t.z}/${t.x}/${t.y}`}
            alt=""
            src={tileUrl(t, { style, retina, key: TILE_KEY })}
            style={{ left: t.left, top: t.top }}
            onError={() => setTilesFailed(true)}
          />
        ))}
      {layout && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <polyline
            points={layout.path
              .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
              .join(" ")}
            fill="none"
            stroke="var(--rs-bg-tertiary)"
            strokeWidth={6}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polyline
            points={layout.path
              .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
              .join(" ")}
            fill="none"
            stroke="var(--rs-text)"
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {start && (
            <circle
              cx={start[0]}
              cy={start[1]}
              r={5}
              fill="var(--rs-text)"
              stroke="var(--rs-bg-tertiary)"
              strokeWidth={2}
            />
          )}
          {end && (
            <circle
              cx={end[0]}
              cy={end[1]}
              r={5}
              fill="var(--rs-bg-tertiary)"
              stroke="var(--rs-text)"
              strokeWidth={2}
            />
          )}
        </svg>
      )}
      {showTiles && (
        <span className="rs-map-attribution">© OpenStreetMap © CARTO</span>
      )}
      {tilesFailed && (
        <span className="rs-map-attribution">Map tiles unavailable</span>
      )}
    </div>
  );
}

/** One column per split; taller is faster. Pace on hover, full numbers in full screen. */
function SplitsChart({ splits }: { splits: Split[] }) {
  const paces = splits.map((s) => s.paceSecPerKm);
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);
  const spread = Math.max(slowest - fastest, 1);
  const labelEvery = splits.length > 12 ? 5 : splits.length > 6 ? 2 : 1;
  return (
    <section className="rs-card flex flex-col gap-2 p-4">
      <div className="flex items-baseline justify-between">
        <span className="rs-caption">Splits</span>
        <span className="rs-caption">
          Fastest {formatPace(fastest)}, slowest {formatPace(slowest)}
        </span>
      </div>
      <div className="rs-bars">
        {splits.map((s) => (
          <div
            key={s.index}
            className="rs-bar"
            data-fastest={s.paceSecPerKm === fastest}
            style={{
              height: `${30 + 70 * (1 - (s.paceSecPerKm - fastest) / spread)}%`,
            }}
            title={`${s.index} km · ${formatPace(s.paceSecPerKm)} /km${s.avgHr != null ? ` · HR ${s.avgHr}` : ""}`}
          />
        ))}
      </div>
      <div className="flex gap-[2px]">
        {splits.map((s) => (
          <span
            key={s.index}
            className="rs-caption flex-1 text-center"
            style={{ maxWidth: 24 }}
          >
            {s.index === 1 || s.index % labelEvery === 0 ? s.index : ""}
          </span>
        ))}
      </div>
    </section>
  );
}

function SplitsTable({ splits }: { splits: Split[] }) {
  const hasHr = splits.some((s) => s.avgHr != null);
  const hasClimb = splits.some((s) => s.elevationGainM != null);
  return (
    <section className="rs-card p-4">
      <table className="rs-table">
        <thead>
          <tr>
            <th>Split</th>
            <th>Pace</th>
            {hasHr && <th>HR</th>}
            {hasClimb && <th>Climb</th>}
          </tr>
        </thead>
        <tbody>
          {splits.map((s) => (
            <tr key={s.index}>
              <td>
                {s.distanceM >= 999.5
                  ? `${s.index} km`
                  : `${(s.distanceM / 1000).toFixed(2)} km`}
              </td>
              <td className="rs-emphasis">{formatPace(s.paceSecPerKm)}</td>
              {hasHr && <td>{s.avgHr ?? "–"}</td>}
              {hasClimb && (
                <td>
                  {s.elevationGainM != null
                    ? `${Math.round(s.elevationGainM)} m`
                    : "–"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function LapsTable({ laps }: { laps: Lap[] }) {
  const hasHr = laps.some((l) => l.avgHr != null);
  return (
    <section className="rs-card p-4">
      <table className="rs-table">
        <thead>
          <tr>
            <th>Lap</th>
            <th>Distance</th>
            <th>Time</th>
            <th>Pace</th>
            {hasHr && <th>HR</th>}
          </tr>
        </thead>
        <tbody>
          {laps.map((l) => (
            <tr key={l.index}>
              <td>
                {l.index}
                {l.name ? ` ${l.name}` : ""}
                {l.kind === "recovery" ? " (recovery)" : ""}
              </td>
              <td>{formatDistanceKm(l.distanceM)}</td>
              <td>{formatDuration(l.movingSec)}</td>
              <td className="rs-emphasis">
                {l.distanceM
                  ? formatPace(paceSecPerKm(l.distanceM, l.movingSec))
                  : "–"}
              </td>
              {hasHr && <td>{l.avgHr ?? "–"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Matches the final layout so the swap is smooth, per the host guidelines. */
function Skeleton({ style }: { style: React.CSSProperties }) {
  return (
    <main className="flex flex-col gap-3" style={style} aria-busy="true">
      <div className="flex flex-col gap-2">
        <div className="rs-skeleton h-5 w-40" />
        <div className="rs-skeleton h-3 w-24" />
      </div>
      <div className="rs-skeleton h-[200px] w-full" />
      <section className="rs-card grid grid-cols-4 gap-4 p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="rs-skeleton h-3 w-10" />
            <div className="rs-skeleton h-5 w-14" />
          </div>
        ))}
      </section>
      <div className="rs-skeleton h-[108px] w-full" />
    </main>
  );
}
