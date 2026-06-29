"use client";

import { Download } from "lucide-react";
import { Assessment } from "@/types/assessment";
import { Participant } from "@/types/participant";
import { AssessmentResponse } from "@/types/response";
import { Button } from "@/components/ritual-ui";
import { exportAssessmentJson } from "@/lib/exports/exportJson";
import { useLocale } from "@/lib/i18n/useLocale";

export function ExportJsonButton({ assessment, participants, responses }: { assessment: Assessment; participants: Participant[]; responses: AssessmentResponse[] }) {
  const { messages } = useLocale();
  return (
    <Button type="button" variant="secondary" onClick={() => exportAssessmentJson(assessment, participants, responses)}>
      <Download size={16} /> {messages.common.exportJson}
    </Button>
  );
}
