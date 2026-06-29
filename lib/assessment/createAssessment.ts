import { Assessment } from "@/types/assessment";
import { Locale } from "@/types/locale";
import { demoAssessment } from "@/data/demo-assessments";

export function createAssessmentDraft(locale?: Locale): Assessment {
  return demoAssessment(locale);
}
