"use client";

import { FileText } from "lucide-react";
import { Assessment } from "@/types/assessment";
import { Participant } from "@/types/participant";
import { AssessmentResponse } from "@/types/response";
import { Button } from "@/components/ritual-ui";
import { exportAssessmentDocx } from "@/lib/exports/exportDocx";
import { useLocale } from "@/lib/i18n/useLocale";

export function ExportDocxButton({ assessment, participants, responses }: { assessment: Assessment; participants: Participant[]; responses: AssessmentResponse[] }) {
  const { messages } = useLocale();
  return (
    <Button type="button" variant="secondary" onClick={() => void exportAssessmentDocx(assessment, participants, responses, messages)}>
      <FileText size={16} /> {messages.common.exportDocx}
    </Button>
  );
}
