import { Assessment } from "@/types/assessment";
import { Participant } from "@/types/participant";
import { AssessmentResponse } from "@/types/response";
import { safeFilename } from "@/lib/utils/text";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportAssessmentJson(assessment: Assessment, participants: Participant[], responses: AssessmentResponse[]) {
  const blob = new Blob([JSON.stringify({ assessment, participants, responses }, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  downloadBlob(blob, `${safeFilename(assessment.title)}-backup.json`);
}
