"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import { Assessment } from "@/types/assessment";
import { PlanningReportActivity } from "@/types/activity";
import { AssessmentResponse } from "@/types/response";
import { Button } from "@/components/ritual-ui";
import { downloadPlanningReportDocx } from "@/lib/planning-report/exportPlanningReportDocx";
import { generatePlanningReportModel } from "@/lib/planning-report/generatePlanningReport";
import { useLocale } from "@/lib/i18n/useLocale";

export function PlanningReportParticipant() {
  return null;
}

export function PlanningReportDownload({
  assessment,
  response,
  activity
}: {
  assessment: Assessment;
  response: AssessmentResponse;
  activity: PlanningReportActivity;
}) {
  const { messages } = useLocale();
  const model = useMemo(
    () => generatePlanningReportModel(assessment, response, activity, messages),
    [activity, assessment, messages, response]
  );

  async function downloadReport() {
    await downloadPlanningReportDocx(model);
  }

  return (
    <Button type="button" variant="secondary" className="mt-7 w-full min-h-14 text-base" onClick={() => void downloadReport()}>
      <Download size={18} /> {messages.planningReport.download}
    </Button>
  );
}
