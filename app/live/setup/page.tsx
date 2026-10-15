"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/live/shell";
import { SetupContent } from "./SetupContent";

export default function SetupPage() {
  return (
    <Suspense fallback={<AppShell><p className="text-bone/50">Loading.</p></AppShell>}>
      <SetupContent />
    </Suspense>
  );
}
