"use client";

import { framePadding, useMcpApp } from "@/app/hooks/use-mcp-app";
import {
  WorkoutDetail,
  WorkoutDetailSkeleton,
  type WorkoutDetailResult,
} from "@/app/components/workout-detail";

export default function WorkoutWidget() {
  const { app, toolResult, host } = useMcpApp();
  const result = toolResult as WorkoutDetailResult | null;
  const frame = framePadding(host);

  if (!result?.workout) return <WorkoutDetailSkeleton style={frame} />;
  return <WorkoutDetail result={result} app={app} host={host} style={frame} />;
}
