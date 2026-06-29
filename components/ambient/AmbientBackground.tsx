"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils/cn";
import { useReducedMotion } from "@/components/ambient/useReducedMotion";
import "@/components/ambient/ambient-background.css";

export type AmbientBackgroundIntensity = "subtle" | "medium" | "strong";

export function AmbientBackground({
  grain = true,
  intensity = "medium",
  className
}: {
  grain?: boolean;
  intensity?: AmbientBackgroundIntensity;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const style = {
    "--ambient-time-progress": 0,
    "--ambient-sunset-progress": 0
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn(
        "ambient-background ambient-background--homepage",
        `ambient-background--${intensity}`,
        reducedMotion && "ambient-background--reduced-motion",
        className
      )}
    >
      <div className="ambient-background__homepage-field">
        <span className="ambient-background__homepage-blob ambient-background__homepage-blob--violet" />
        <span className="ambient-background__homepage-blob ambient-background__homepage-blob--blue" />
        <span className="ambient-background__homepage-blob ambient-background__homepage-blob--cyan" />
        <span className="ambient-background__homepage-blob ambient-background__homepage-blob--orange" />
      </div>
      <div className="ambient-background__homepage-wow" />
      <div className="ambient-background__homepage-burst" />
      {grain && !reducedMotion ? <div className="ambient-background__grain" /> : null}
      <div className="ambient-background__wash" />
    </div>
  );
}
