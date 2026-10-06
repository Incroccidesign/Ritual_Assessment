import { en } from "@/lib/live/locales/en";
import { it } from "@/lib/live/locales/it";
import { ActivityType } from "@/types/live";

export const dictionaries = { it, en } as const;
export type Language = keyof typeof dictionaries;
export type Messages = (typeof dictionaries)[Language];

export const defaultLanguage: Language = "it";
export const languages = Object.keys(dictionaries) as Language[];

export function normalizeLanguage(value: string | null | undefined): Language {
  return value === "en" || value === "it" ? value : defaultLanguage;
}

export function getMessages(language: Language) {
  return dictionaries[language];
}

export function withLang(href: string, language: Language) {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("lang", language);
  const nextQuery = params.toString();
  return nextQuery ? `${path}?${nextQuery}` : path;
}

export function activityName(type: ActivityType, language: Language) {
  return dictionaries[language].activities[type].name;
}

export function activityPurpose(type: ActivityType, language: Language) {
  return dictionaries[language].activities[type].purpose;
}

export function activityPrompt(type: ActivityType, language: Language) {
  return dictionaries[language].activities[type].defaultPrompt;
}
