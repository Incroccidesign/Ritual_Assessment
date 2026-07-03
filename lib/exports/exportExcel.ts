import { Assessment } from "@/types/assessment";
import { Activity, FramingQuestion, ProfilingField } from "@/types/activity";
import { Participant } from "@/types/participant";
import { AssessmentResponse } from "@/types/response";
import type { Messages } from "@/lib/i18n/getMessages";
import { findOptionGroupForValue } from "@/lib/activities/explorationOptionGroups";
import { displayProfilingAnswer, OTHER_OPTION_VALUE } from "@/lib/activities/otherOption";
import { safeFilename } from "@/lib/utils/text";

type RowValue = string | number | boolean | null;
type SheetRow = Record<string, RowValue>;
type XLSXModule = typeof import("xlsx");

const ORGANIZATION_NAME_ALIASES = new Set([
  "organizationname",
  "organisationname",
  "companyname",
  "organization",
  "organisation",
  "company",
  "orgname",
  "azienda",
  "nomeazienda",
  "nomedellorganizzazione",
  "nomedellazienda",
  "ragionesociale",
  "nomdelorganisation",
  "nomdelentreprise"
]);

const SECTION_HEADERS = [
  "participant_id",
  "organization_name",
  "submitted_at",
  "section_order",
  "section_title",
  "activity_order",
  "activity_title",
  "question_order",
  "question_key",
  "question_label",
  "question_prompt",
  "answer_type",
  "answer_value",
  "option_group",
  "option_order",
  "rank_position",
  "source",
  "response_id",
  "activity_id"
];

export async function exportAssessmentExcel(
  assessment: Assessment,
  participants: Participant[],
  responses: AssessmentResponse[],
  messages: Messages
) {
  void messages;
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const sortedActivities = [...assessment.activities].sort((a, b) => a.orderIndex - b.orderIndex);
  const submittedResponses = responses.filter((response) => response.status === "submitted");
  const submittedParticipantIds = new Set(submittedResponses.map((response) => response.participantId));
  const submittedParticipants = participants.filter((participant) => submittedParticipantIds.has(participant.id) || participant.status === "submitted");
  const participantById = new Map(submittedParticipants.map((participant) => [participant.id, participant]));
  const organizationNames = buildOrganizationNameMap(submittedParticipants, submittedResponses, sortedActivities);
  const sectionRows = buildSectionRows(submittedResponses, sortedActivities, participantById, organizationNames);

  appendSheet(XLSX, workbook, "00_Overview", buildOverviewRows(assessment, submittedParticipants, submittedResponses, sectionRows, organizationNames));
  appendSheet(
    XLSX,
    workbook,
    "01_Participants",
    buildParticipantRows(submittedParticipants, submittedResponses, sortedActivities, organizationNames),
    getParticipantHeaders(sortedActivities)
  );

  const usedNames = new Set(["00_Overview", "01_Participants"]);
  sortedActivities.forEach((activity, index) => {
    const rows = sectionRows.get(activity.id) ?? [];
    const sheetName = createUniqueSheetName(`${String(index + 2).padStart(2, "0")}_`, activity.title, usedNames);
    appendSheet(XLSX, workbook, sheetName, rows, SECTION_HEADERS);
  });

  appendSheet(XLSX, workbook, "99_Raw_json", buildRawJsonRows(submittedResponses, organizationNames), [
    "id",
    "participant_id",
    "organization_name",
    "status",
    "submitted_at",
    "answer_json"
  ]);

  XLSX.writeFileXLSX(workbook, `${safeFilename(assessment.title)}-report.xlsx`);
}

function buildOrganizationNameMap(
  participants: Participant[],
  responses: AssessmentResponse[],
  activities: Activity[]
) {
  const organizationNames = new Map<string, string>();

  participants.forEach((participant) => {
    const fallback = getParticipantOrganizationFallback(participant);
    if (fallback) organizationNames.set(participant.id, fallback);
  });

  responses.forEach((response) => {
    for (const activityResponse of response.activityResponses) {
      const activity = activities.find((candidate) => candidate.id === activityResponse.activityId);
      if (!activity || activity.type !== "profiling" || !("fields" in activityResponse.answer)) continue;

      for (const field of activity.fields) {
        if (!isOrganizationNameField(field)) continue;
        const value = getProfilingAnswerValue(field, activityResponse.answer);
        if (value) {
          organizationNames.set(response.participantId, value);
          return;
        }
      }
    }
  });

  return organizationNames;
}

function buildParticipantRows(
  participants: Participant[],
  responses: AssessmentResponse[],
  activities: Activity[],
  organizationNames: Map<string, string>
) {
  const profilingFields = collectProfilingFields(activities);
  const profilingValues = new Map<string, Record<string, string>>();

  responses.forEach((response) => {
    response.activityResponses.forEach((activityResponse) => {
      const activity = activities.find((candidate) => candidate.id === activityResponse.activityId);
      if (!activity || activity.type !== "profiling" || !isProfilingAnswer(activityResponse.answer)) return;
      const profilingAnswer = activityResponse.answer;

      const participantValues = profilingValues.get(response.participantId) ?? {};
      activity.fields.forEach((field) => {
        if (isOrganizationNameField(field)) return;
        participantValues[getProfilingColumnKey(field)] = getProfilingAnswerValue(field, profilingAnswer);
      });
      profilingValues.set(response.participantId, participantValues);
    });
  });

  const participantColumns = profilingFields
    .filter((field) => !isOrganizationNameField(field))
    .map((field) => getProfilingColumnKey(field));

  return participants.map((participant) => {
    const row: SheetRow = {
      participant_id: participant.id,
      organization_name: organizationNames.get(participant.id) ?? "",
      status: participant.status,
      contact_email: participant.contactEmail ?? "",
      started_at: participant.startedAt ?? "",
      submitted_at: participant.submittedAt ?? ""
    };

    participantColumns.forEach((column) => {
      row[column] = profilingValues.get(participant.id)?.[column] ?? "";
    });

    return row;
  });
}

function getParticipantHeaders(activities: Activity[]) {
  const profilingColumns = collectProfilingFields(activities)
    .filter((field) => !isOrganizationNameField(field))
    .map((field) => getProfilingColumnKey(field));

  return [
    "participant_id",
    "organization_name",
    "status",
    "contact_email",
    "started_at",
    "submitted_at",
    ...profilingColumns
  ];
}

function buildSectionRows(
  responses: AssessmentResponse[],
  activities: Activity[],
  participantById: Map<string, Participant>,
  organizationNames: Map<string, string>
) {
  const rowsByActivity = new Map<string, SheetRow[]>();
  activities.forEach((activity) => rowsByActivity.set(activity.id, []));

  responses.forEach((response) => {
    response.activityResponses.forEach((activityResponse) => {
      const activity = activities.find((candidate) => candidate.id === activityResponse.activityId);
      if (!activity) return;

      const base = getBaseSectionRow(response, activity, participantById, organizationNames);
      const rows = rowsByActivity.get(activity.id) ?? [];
      rows.push(...getRowsForActivity(activity, activityResponse.answer, base));
      rowsByActivity.set(activity.id, rows);
    });
  });

  return rowsByActivity;
}

function getRowsForActivity(activity: Activity, answer: unknown, base: SheetRow): SheetRow[] {
  if (activity.type === "profiling" && isProfilingAnswer(answer)) {
    return activity.fields.map((field, fieldIndex) => {
      const selectedValue = answer.fields[field.id] ?? "";
      const otherResponse = selectedValue === OTHER_OPTION_VALUE ? answer.otherText?.[field.id]?.trim() ?? "" : "";
      const answerValue = otherResponse || displayProfilingAnswer(field, answer, "");

      return {
        ...base,
        question_order: fieldIndex + 1,
        question_key: field.id,
        question_label: field.label,
        question_prompt: "",
        answer_type: getProfilingAnswerType(field),
        answer_value: answerValue,
        option_group: "",
        option_order: getOptionOrder(field.options, selectedValue),
        rank_position: "",
        source: otherResponse ? "other" : ""
      };
    });
  }

  if (activity.type === "exploration" && isExplorationAnswer(answer)) {
    return answer.items.map((item, itemIndex) => ({
      ...base,
      question_order: 1,
      question_key: `${activity.id}_selection`,
      question_label: activity.title,
      question_prompt: activity.prompt,
      answer_type: getExplorationAnswerType(activity.responseMode),
      answer_value: item.label,
      option_group: item.groupLabel ?? findOptionGroupForValue(activity, item.value ?? item.label) ?? "",
      option_order: getOptionOrder(activity.options, item.value ?? item.label) || itemIndex + 1,
      rank_position: "",
      source: item.source
    }));
  }

  if (activity.type === "prioritization" && isPrioritizationAnswer(answer)) {
    return answer.rankedItems.map((item, itemIndex) => ({
      ...base,
      question_order: 1,
      question_key: `${activity.id}_ranking`,
      question_label: activity.title,
      question_prompt: activity.prompt,
      answer_type: "ranking",
      answer_value: item.label,
      option_group: item.groupLabel ?? "",
      option_order: itemIndex + 1,
      rank_position: item.rank,
      source: item.sourceItemId
    }));
  }

  if (activity.type === "framing" && isFramingAnswer(answer)) {
    if (answer.questionAnswers && activity.questions.length) {
      return activity.questions.map((question, questionIndex) =>
        getFramingQuestionRow(base, question, questionIndex, answer.questionAnswers?.[question.id] ?? "", answer.sourceRanking)
      );
    }

    return [
      {
        ...base,
        question_order: 1,
        question_key: `${activity.id}_answer`,
        question_label: activity.title,
        question_prompt: activity.prompt,
        answer_type: "open_text",
        answer_value: answer.answer,
        option_group: "",
        option_order: "",
        rank_position: "",
        source: answer.sourceRanking.join(" | ")
      }
    ];
  }

  if (activity.type === "planning_report" && isPlanningReportAnswer(answer)) {
    return [
      {
        ...base,
        question_order: 1,
        question_key: `${activity.id}_viewed_at`,
        question_label: activity.title,
        question_prompt: activity.prompt,
        answer_type: "planning_report",
        answer_value: answer.viewedAt ?? "",
        option_group: "",
        option_order: "",
        rank_position: "",
        source: ""
      }
    ];
  }

  return [];
}

function buildOverviewRows(
  assessment: Assessment,
  participants: Participant[],
  responses: AssessmentResponse[],
  sectionRows: Map<string, SheetRow[]>,
  organizationNames: Map<string, string>
): SheetRow[] {
  const allSectionRows = Array.from(sectionRows.values()).flat();
  const submittedResponses = responses.filter((response) => response.status === "submitted");
  const submittedParticipants = participants.filter((participant) => participant.status === "submitted");
  const inProgressParticipants = participants.filter((participant) => participant.status === "started");
  const selectedOptionSummary = summarizeSelectedOptions(allSectionRows);
  const rankingSummary = summarizeRankings(allSectionRows);
  const profilingSummary = summarizeProfilingDistributions(allSectionRows);

  return [
    { section: "Assessment", metric: "assessment_title", value: assessment.title },
    { section: "Assessment", metric: "exported_at", value: new Date().toISOString() },
    { section: "Assessment", metric: "language", value: assessment.language },
    { section: "Assessment", metric: "status", value: assessment.status },
    { section: "Participants", metric: "total_participants", value: participants.length },
    { section: "Participants", metric: "completed_assessments", value: Math.max(submittedParticipants.length, submittedResponses.length) },
    { section: "Participants", metric: "in_progress_assessments", value: inProgressParticipants.length },
    { section: "Organizations", metric: "responding_organizations", value: listOrganizations(participants, organizationNames).join(" | ") },
    ...selectedOptionSummary.map((item) => ({
      section: "Recurring selected options",
      metric: item.question,
      value: item.answer,
      count: item.count
    })),
    ...rankingSummary.map((item) => ({
      section: "Ranking priorities",
      metric: item.answer,
      value: `average_rank: ${item.averageRank}`,
      count: item.count,
      best_rank: item.bestRank
    })),
    ...profilingSummary.map((item) => ({
      section: "Profiling distributions",
      metric: item.question,
      value: item.answer,
      count: item.count
    })),
    {
      section: "Notes",
      metric: "export_structure",
      value: "This workbook includes submitted responses only. Section sheets are generated dynamically from the assessment activity order. 99_Raw_json is a technical backup."
    }
  ];
}

function buildRawJsonRows(responses: AssessmentResponse[], organizationNames: Map<string, string>) {
  return responses.map((response) => ({
    id: response.id,
    participant_id: response.participantId,
    organization_name: organizationNames.get(response.participantId) ?? "",
    status: response.status,
    submitted_at: response.submittedAt ?? "",
    answer_json: JSON.stringify(response.activityResponses)
  }));
}

function getBaseSectionRow(
  response: AssessmentResponse,
  activity: Activity,
  participantById: Map<string, Participant>,
  organizationNames: Map<string, string>
): SheetRow {
  const participant = participantById.get(response.participantId);

  return {
    participant_id: response.participantId,
    organization_name: organizationNames.get(response.participantId) ?? getParticipantOrganizationFallback(participant) ?? "",
    submitted_at: response.submittedAt ?? participant?.submittedAt ?? "",
    section_order: activity.orderIndex + 1,
    section_title: activity.title,
    activity_order: activity.orderIndex + 1,
    activity_title: activity.title,
    question_order: "",
    question_key: "",
    question_label: "",
    question_prompt: "",
    answer_type: "",
    answer_value: "",
    option_group: "",
    option_order: "",
    rank_position: "",
    source: "",
    response_id: response.id,
    activity_id: activity.id
  };
}

function getFramingQuestionRow(
  base: SheetRow,
  question: FramingQuestion,
  questionIndex: number,
  answerValue: string,
  sourceRanking: string[]
): SheetRow {
  return {
    ...base,
    question_order: questionIndex + 1,
    question_key: question.id,
    question_label: question.title,
    question_prompt: question.prompt,
    answer_type: "open_text",
    answer_value: answerValue,
    option_group: "",
    option_order: "",
    rank_position: "",
    source: sourceRanking.join(" | ")
  };
}

function appendSheet(
  XLSX: XLSXModule,
  workbook: ReturnType<XLSXModule["utils"]["book_new"]>,
  name: string,
  rows: SheetRow[],
  header?: string[]
) {
  const headers = header ?? getHeaders(rows);
  const worksheetRows = [
    headers,
    ...rows.map((row) => headers.map((headerName) => normalizeCellValue(row[headerName])))
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetRows);

  worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: worksheetRows.length - 1, c: headers.length - 1 } }) };
  worksheet["!cols"] = headers.map((headerName) => ({
    wch: getColumnWidth(headerName, rows)
  }));

  XLSX.utils.book_append_sheet(workbook, worksheet, name);
}

function getHeaders(rows: SheetRow[]) {
  const headers = new Set<string>();
  rows.forEach((row) => Object.keys(row).forEach((key) => headers.add(key)));
  return Array.from(headers);
}

function normalizeCellValue(value: RowValue | undefined) {
  return value ?? "";
}

function getColumnWidth(header: string, rows: SheetRow[]) {
  if (["answer_json", "config_json"].includes(header)) return 80;
  if (["answer_value", "question_prompt", "question_label"].includes(header)) return 48;
  if (["organization_name", "activity_title", "section_title", "option_group"].includes(header)) return 32;
  if (header.endsWith("_id") || header === "participant_id" || header === "response_id") return 38;
  const maxValueLength = rows.reduce((max, row) => Math.max(max, String(row[header] ?? "").length), header.length);
  return Math.min(Math.max(maxValueLength + 2, 14), 42);
}

function collectProfilingFields(activities: Activity[]) {
  const fields = new Map<string, ProfilingField>();
  activities.forEach((activity) => {
    if (activity.type !== "profiling") return;
    activity.fields.forEach((field) => {
      fields.set(getProfilingColumnKey(field), field);
    });
  });
  return Array.from(fields.values());
}

function getProfilingColumnKey(field: ProfilingField) {
  return `profile_${toSnakeCase(field.label || field.id, field.id)}`;
}

function getProfilingAnswerValue(field: ProfilingField, answer: { fields: Record<string, string>; otherText?: Record<string, string> }) {
  const selectedValue = answer.fields[field.id] ?? "";
  if (selectedValue === OTHER_OPTION_VALUE) return answer.otherText?.[field.id]?.trim() ?? "";
  return displayProfilingAnswer(field, answer, "");
}

function getProfilingAnswerType(field: ProfilingField) {
  if (field.fieldType === "select") return "single_choice";
  if (field.fieldType === "email") return "email";
  if (field.fieldType === "number") return "number";
  return "open_text";
}

function getExplorationAnswerType(responseMode: string) {
  if (responseMode === "free_input") return "open_text";
  if (responseMode === "closed_list") return "multiple_choice";
  return "multiple_choice_with_custom";
}

function getOptionOrder(options: string[] | undefined, value: string) {
  if (!options?.length || !value) return "";
  const normalizedValue = normalizeKey(value);
  const index = options.findIndex((option) => normalizeKey(option) === normalizedValue);
  return index >= 0 ? index + 1 : "";
}

function isOrganizationNameField(field: ProfilingField) {
  return ORGANIZATION_NAME_ALIASES.has(normalizeKey(field.id)) || ORGANIZATION_NAME_ALIASES.has(normalizeKey(field.label));
}

function getParticipantOrganizationFallback(participant?: Participant) {
  if (!participant) return "";
  const extendedParticipant = participant as Participant & {
    organizationName?: string;
    organization_name?: string;
    company_name?: string;
  };

  return (
    extendedParticipant.organizationName?.trim() ||
    extendedParticipant.organization_name?.trim() ||
    extendedParticipant.companyName?.trim() ||
    extendedParticipant.company_name?.trim() ||
    ""
  );
}

function summarizeSelectedOptions(rows: SheetRow[]) {
  return summarizeRows(
    rows.filter((row) => ["single_choice", "multiple_choice", "multiple_choice_with_custom"].includes(String(row.answer_type)) && Boolean(row.answer_value)),
    (row) => `${row.question_label}:::${row.answer_value}`
  )
    .map(({ key, count }) => {
      const [question, answer] = key.split(":::");
      return { question, answer, count };
    })
    .slice(0, 25);
}

function summarizeRankings(rows: SheetRow[]) {
  const grouped = new Map<string, number[]>();
  rows
    .filter((row) => row.answer_type === "ranking" && Boolean(row.answer_value))
    .forEach((row) => {
      const key = String(row.answer_value);
      const ranks = grouped.get(key) ?? [];
      const rank = Number(row.rank_position);
      if (Number.isFinite(rank)) ranks.push(rank);
      grouped.set(key, ranks);
    });

  return Array.from(grouped.entries())
    .map(([answer, ranks]) => ({
      answer,
      count: ranks.length,
      bestRank: ranks.length ? Math.min(...ranks) : "",
      averageRank: ranks.length ? Number((ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length).toFixed(2)) : ""
    }))
    .sort((a, b) => Number(a.averageRank) - Number(b.averageRank) || b.count - a.count)
    .slice(0, 25);
}

function summarizeProfilingDistributions(rows: SheetRow[]) {
  return summarizeRows(
    rows.filter((row) => row.activity_title && row.answer_value && row.answer_type !== "open_text"),
    (row) => `${row.question_label}:::${row.answer_value}`
  )
    .map(({ key, count }) => {
      const [question, answer] = key.split(":::");
      return { question, answer, count };
    })
    .slice(0, 25);
}

function summarizeRows(rows: SheetRow[], keyGetter: (row: SheetRow) => string) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const key = keyGetter(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function listOrganizations(participants: Participant[], organizationNames: Map<string, string>) {
  const names = participants.map((participant) => organizationNames.get(participant.id)).filter((name): name is string => Boolean(name));
  return Array.from(new Set(names));
}

function createUniqueSheetName(prefix: string, rawTitle: string, usedNames: Set<string>) {
  const baseMaxLength = 31 - prefix.length;
  const fallback = "Section";
  const cleanTitle = sanitizeSheetTitle(rawTitle) || fallback;
  let baseName = `${prefix}${cleanTitle.slice(0, baseMaxLength)}`;
  let candidate = baseName;
  let index = 2;

  while (usedNames.has(candidate)) {
    const suffix = `_${index}`;
    baseName = `${prefix}${cleanTitle.slice(0, Math.max(1, baseMaxLength - suffix.length))}`;
    candidate = `${baseName}${suffix}`;
    index += 1;
  }

  usedNames.add(candidate);
  return candidate;
}

function sanitizeSheetTitle(value: string) {
  return value
    .replace(/[\[\]\*?:/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSnakeCase(value: string, fallback: string) {
  const normalized = normalizeKey(value)
    .replace(/([a-z])([0-9])/g, "$1_$2")
    .replace(/([0-9])([a-z])/g, "$1_$2");
  return normalized || normalizeKey(fallback) || "field";
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function isProfilingAnswer(answer: unknown): answer is { fields: Record<string, string>; otherText?: Record<string, string> } {
  return Boolean(answer && typeof answer === "object" && "fields" in answer);
}

function isExplorationAnswer(answer: unknown): answer is {
  items: { id: string; label: string; source: "predefined" | "custom" | "other"; value?: string; groupId?: string; groupLabel?: string }[];
  otherText?: string;
} {
  return Boolean(answer && typeof answer === "object" && "items" in answer);
}

function isPrioritizationAnswer(answer: unknown): answer is { rankedItems: { sourceItemId: string; label: string; rank: number; groupId?: string; groupLabel?: string }[] } {
  return Boolean(answer && typeof answer === "object" && "rankedItems" in answer);
}

function isFramingAnswer(answer: unknown): answer is { sourceRanking: string[]; answer: string; questionAnswers?: Record<string, string> } {
  return Boolean(answer && typeof answer === "object" && "answer" in answer && "sourceRanking" in answer);
}

function isPlanningReportAnswer(answer: unknown): answer is { viewedAt?: string } {
  return Boolean(answer && typeof answer === "object" && "viewedAt" in answer);
}
