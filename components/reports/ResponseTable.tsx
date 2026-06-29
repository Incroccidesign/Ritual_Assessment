"use client";

import { AssessmentResponse } from "@/types/response";
import { SubtlePanel } from "@/components/ritual-ui";
import { formatDateTime } from "@/lib/utils/dates";
import { useLocale } from "@/lib/i18n/useLocale";

export function ResponseTable({ responses }: { responses: AssessmentResponse[] }) {
  const { messages } = useLocale();

  return (
    <SubtlePanel className="overflow-x-auto">
      <table className="w-full min-w-[38rem] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.16em] text-bone/38">
          <tr>
            <th className="py-3 pe-4">{messages.reports.participants}</th>
            <th className="py-3 pe-4">{messages.dashboard.status}</th>
            <th className="py-3 pe-4">{messages.builder.activityFlow}</th>
            <th className="py-3 pe-4">{messages.reports.submitted}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bone/10 text-bone/72">
          {responses.map((response) => (
            <tr key={response.id}>
              <td className="py-3 pe-4">{response.participantId}</td>
              <td className="py-3 pe-4">{response.status}</td>
              <td className="py-3 pe-4">{response.activityResponses.length}</td>
              <td className="py-3 pe-4">{formatDateTime(response.submittedAt) || messages.common.empty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SubtlePanel>
  );
}
