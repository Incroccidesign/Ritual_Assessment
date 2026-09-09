import { Assessment } from "@/types/assessment";
import { Locale } from "@/types/locale";
import { defaultLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/getMessages";
import { nowIso } from "@/lib/utils/dates";
import { uid } from "@/lib/utils/ids";

export function createAssessmentDraft(locale?: Locale): Assessment {
  const language = locale ?? defaultLocale;
  const timestamp = nowIso();

  return {
    id: uid("assessment"),
    title: getMessages(language).presets.assessment.draftTitle,
    language,
    status: "draft",
    activities: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}
