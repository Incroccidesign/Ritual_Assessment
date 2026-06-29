"use client";

import { SubtlePanel } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

export function PlanningReportSummary() {
  const { messages } = useLocale();

  return (
    <SubtlePanel>
      <p className="font-heading text-2xl font-semibold text-bone">{messages.planningReport.summary}</p>
      <p className="mt-2 text-sm leading-6 text-bone/58">{messages.planningReport.participantDescription}</p>
    </SubtlePanel>
  );
}
