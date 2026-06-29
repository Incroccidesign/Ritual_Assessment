"use client";

import { Download } from "lucide-react";
import { Assessment } from "@/types/assessment";
import { Participant } from "@/types/participant";
import { AssessmentResponse } from "@/types/response";
import { Button } from "@/components/ritual-ui";
import { exportAssessmentExcel } from "@/lib/exports/exportExcel";
import { useLocale } from "@/lib/i18n/useLocale";

export function ExportExcelButton({ assessment, participants, responses }: { assessment: Assessment; participants: Participant[]; responses: AssessmentResponse[] }) {
  const { messages } = useLocale();
  return (
    <Button type="button" onClick={() => void exportAssessmentExcel(assessment, participants, responses, messages)}>
      <Download size={16} /> {messages.common.exportExcel}
    </Button>
  );
}
