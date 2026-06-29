import { Activity, ActivityType } from "@/types/activity";
import type { Locale } from "@/types/locale";
import { locales } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/getMessages";

const legacyDefaults = {
  profiling: {
    title: ["Organization profile"],
    prompt: ["Share a few details about your organization."],
    organizationName: [],
    sector: [],
    country: [],
    respondentRole: []
  },
  exploration: {
    title: ["Short-term challenges"],
    prompt: [],
    energyCosts: [],
    staffTurnover: [],
    trainingNeeds: [],
    digitalizationGaps: []
  },
  prioritization: {
    title: ["Challenge priorities"],
    prompt: ["Tap the selected challenges in order of priority."]
  },
  framing: {
    title: ["Needs emerging from priorities"],
    prompt: []
  },
  planning_report: {
    title: ["Planning report"],
    prompt: ["This report organizes your answers into a structured planning output."]
  }
} satisfies Record<ActivityType, Record<string, string[]>>;

function knownPresetValues(type: ActivityType, key: string) {
  if (type === "planning_report") {
    return locales
      .flatMap((locale) => {
        const messages = getMessages(locale).planningReport;
        return [
          messages.activity.label,
          messages.participantDescription,
          messages.title.default,
          messages.subtitle.default,
          ...Object.values(messages.sections)
        ];
      })
      .filter(Boolean);
  }

  const values = locales
    .map((locale) => {
      const preset = getMessages(locale).presets.activities[type] as Record<string, string>;
      return preset[key];
    })
    .filter((value): value is string => Boolean(value));

  const legacy = legacyDefaults[type] as Record<string, string[]>;
  return [...values, ...(legacy[key] ?? [])];
}

function replacePresetValue(value: string, type: ActivityType, key: string, targetValue: string) {
  return knownPresetValues(type, key).includes(value) ? targetValue : value;
}

function replaceFromPresetKeys(value: string, type: ActivityType, replacements: Array<{ key: string; value: string }>) {
  const replacement = replacements.find((item) => knownPresetValues(type, item.key).includes(value));
  return replacement?.value ?? value;
}

export function localizeActivityContent(activity: Activity, locale: Locale): Activity {
  if (activity.type === "profiling") {
    const target = getMessages(locale).presets.activities.profiling;
    return {
      ...activity,
      title: replacePresetValue(activity.title, activity.type, "title", target.title),
      prompt: replacePresetValue(activity.prompt, activity.type, "prompt", target.prompt),
      fields: activity.fields.map((field) => {
        const nextLabel = replaceFromPresetKeys(field.label, activity.type, [
          { key: "organizationName", value: target.organizationName },
          { key: "sector", value: target.sector },
          { key: "country", value: target.country },
          { key: "respondentRole", value: target.respondentRole }
        ]);
        return { ...field, label: nextLabel };
      })
    };
  }

  if (activity.type === "exploration") {
    const target = getMessages(locale).presets.activities.exploration;
    return {
      ...activity,
      title: replacePresetValue(activity.title, activity.type, "title", target.title),
      prompt: replacePresetValue(activity.prompt, activity.type, "prompt", target.prompt),
      options: activity.options.map((option) => {
        const nextOption = replaceFromPresetKeys(option, activity.type, [
          { key: "energyCosts", value: target.energyCosts },
          { key: "staffTurnover", value: target.staffTurnover },
          { key: "trainingNeeds", value: target.trainingNeeds },
          { key: "digitalizationGaps", value: target.digitalizationGaps }
        ]);
        return nextOption;
      })
    };
  }

  if (activity.type === "prioritization") {
    const target = getMessages(locale).presets.activities.prioritization;
    return {
      ...activity,
      title: replacePresetValue(activity.title, activity.type, "title", target.title),
      prompt: replacePresetValue(activity.prompt, activity.type, "prompt", target.prompt)
    };
  }

  if (activity.type === "planning_report") {
    const target = getMessages(locale).planningReport;
    return {
      ...activity,
      title: replacePresetValue(activity.title, activity.type, "title", target.activity.label),
      prompt: replacePresetValue(activity.prompt, activity.type, "prompt", target.participantDescription),
      reportTitle: replacePresetValue(activity.reportTitle, activity.type, "reportTitle", target.title.default),
      reportSubtitle: replacePresetValue(activity.reportSubtitle, activity.type, "reportSubtitle", target.subtitle.default),
      sections: activity.sections.map((section) => ({
        ...section,
        title: replacePresetValue(
          section.title,
          activity.type,
          section.key,
          target.sections[section.key as keyof typeof target.sections] ?? section.title
        )
      }))
    };
  }

  const target = getMessages(locale).presets.activities.framing;
  return {
    ...activity,
    title: replacePresetValue(activity.title, activity.type, "title", target.title),
    prompt: replacePresetValue(activity.prompt, activity.type, "prompt", target.prompt)
  };
}
