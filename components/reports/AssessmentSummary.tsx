"use client";

import { Assessment } from "@/types/assessment";
import { Participant } from "@/types/participant";
import { AssessmentResponse } from "@/types/response";
import { SubtlePanel } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

export function AssessmentSummary({
  assessment,
  participants,
  responses
}: {
  assessment: Assessment;
  participants: Participant[];
  responses: AssessmentResponse[];
}) {
  const { messages } = useLocale();
  const submitted = responses.filter((response) => response.status === "submitted").length;
  const inProgress = responses.filter((response) => response.status === "in_progress").length;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SubtlePanel>
        <p className="text-xs uppercase tracking-[0.16em] text-bone/40">{messages.dashboard.people}</p>
        <p className="mt-2 text-3xl font-semibold text-bone">{participants.length}</p>
      </SubtlePanel>
      <SubtlePanel>
        <p className="text-xs uppercase tracking-[0.16em] text-bone/40">{messages.dashboard.completed}</p>
        <p className="mt-2 text-3xl font-semibold text-bone">{submitted}</p>
      </SubtlePanel>
      <SubtlePanel>
        <p className="text-xs uppercase tracking-[0.16em] text-bone/40">{messages.reports.inProgress}</p>
        <p className="mt-2 text-3xl font-semibold text-bone">{inProgress}</p>
      </SubtlePanel>
      <SubtlePanel>
        <p className="text-xs uppercase tracking-[0.16em] text-bone/40">{messages.dashboard.stepsCompleted}</p>
        <p className="mt-2 text-3xl font-semibold text-bone">{assessment.activities.length}</p>
      </SubtlePanel>
    </div>
  );
}
