import { dictionaries } from "@/lib/live/i18n";
import { clampPriorityVotesPerParticipant, defaultActivityDuration, DEFAULT_PRIORITY_VOTES_PER_PARTICIPANT, PactStatementMode, ParticipantDetailsMode, LiveSessionSnapshot, SurfaceInputType } from "@/types/live";
import { cloneSurfaceInputTypes, defaultSurfaceInputTypes, normalizeSurfaceInputTypes } from "@/lib/live/surface-input-types";

const ritualFileVersion = "1.0";
const pendingStorageKey = "ritual-file-pending";

type RitualFileActivityType = "innesco" | "emersione" | "focus" | "priorita" | "patto";
const knownActivityTypes: RitualFileActivityType[] = ["innesco", "emersione", "focus", "priorita", "patto"];

export type RitualFileActivity = {
  type: RitualFileActivityType;
  custom_suffix_label: string | null;
  order: number;
  question_or_instruction: string;
  timer_enabled: boolean;
  timer_duration: number | null;
  show_live_responses: boolean;
  surface_input_types?: SurfaceInputType[];
  priority_source_type?: "previous_activity" | "manual" | null;
  source_activity_order?: number | null;
  manual_items?: string[];
  votesPerParticipant?: number;
  pactStatementMode?: PactStatementMode;
  pactProposal?: string | null;
  finalStatement?: string | null;
  facilitatorNote?: string | null;
};

export type RitualFile = {
  version: "1.0";
  ritual_name: string;
  facilitator_name: string | null;
  context: string | null;
  participantDetailsMode?: ParticipantDetailsMode;
  selected_roles: string[];
  custom_roles: string[];
  activities: RitualFileActivity[];
};

export type RitualSetupDraft = {
  ritualName: string;
  facilitatorName: string;
  contextId: string;
  participantDetailsMode: ParticipantDetailsMode;
  selectedRoles: string[];
  customRoles: string[];
  activities: Array<{
    activity_type: "innesco" | "traccia" | "focus" | "priorita" | "patto";
    instance_label: string;
    prompt: string;
    timer_enabled: boolean;
    timer_duration: number | null;
    show_live_results: boolean;
    surface_input_types?: SurfaceInputType[] | null;
    priority_source_type?: "previous_activity" | "manual" | null;
    priority_source_activity_order?: number | null;
    priority_manual_items?: string[];
    votes_per_participant?: number;
    pact_statement_mode?: PactStatementMode;
    facilitator_note?: string | null;
    pact_text?: string | null;
  }>;
};

function externalType(internalType: RitualSetupDraft["activities"][number]["activity_type"]): RitualFileActivityType {
  return internalType === "traccia" ? "emersione" : internalType;
}

function internalType(external: RitualFileActivityType): RitualSetupDraft["activities"][number]["activity_type"] {
  return external === "emersione" ? "traccia" : external;
}

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" ? input as Record<string, unknown> : {};
}

function stringValue(...values: unknown[]) {
  const value = values.find((item) => typeof item === "string");
  return typeof value === "string" ? value : "";
}

function nullableStringValue(...values: unknown[]) {
  const value = values.find((item) => typeof item === "string");
  return typeof value === "string" && value.trim().length ? value : null;
}

function numberValue(...values: unknown[]) {
  for (const item of values) {
    if (typeof item === "number" && Number.isFinite(item)) return item;
    if (typeof item === "string" && item.trim().length) {
      const parsed = Number(item);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function timerDurationOrDefault(type: RitualFileActivityType, value: unknown) {
  const parsed = numberValue(value);
  return parsed && parsed > 0 ? parsed : defaultActivityDuration(internalType(type));
}

function booleanValue(defaultValue: boolean, ...values: unknown[]) {
  for (const item of values) {
    if (typeof item === "boolean") return item;
    if (typeof item === "string") {
      const normalized = item.trim().toLowerCase();
      if (["true", "1", "yes"].includes(normalized)) return true;
      if (["false", "0", "no"].includes(normalized)) return false;
    }
  }
  return defaultValue;
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeSurfaceTypesForFile(input: unknown) {
  if (!Array.isArray(input)) return undefined;
  return normalizeSurfaceInputTypes(input.map((item, index) => {
    const record = asRecord(item);
    const labelRecord = asRecord(record.label);
    const it = stringValue(labelRecord.it, record.label_it, record.labelIt, record.name, record.title, record.id);
    const en = stringValue(labelRecord.en, record.label_en, record.labelEn, record.name, record.title, it);
    const id = stringValue(record.id, record.key) || `surface-${index + 1}-${(it || en || "category").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    return {
      id,
      label: { it, en },
      color: stringValue(record.color, record.color_key, record.colorKey)
    } as SurfaceInputType;
  }));
}

function normalizeRitualFileActivity(input: unknown, index: number): RitualFileActivity {
  const record = asRecord(input);
  const candidateType = stringValue(record.type, record.activity_type, record.activityType);
  const type = knownActivityTypes.includes(candidateType as RitualFileActivityType)
    ? candidateType as RitualFileActivityType
    : candidateType === "traccia"
      ? "emersione"
      : null;
  if (!type) throw new Error("invalid_ritual_file");

  const pactProposal = nullableStringValue(record.pactProposal, record.pact_proposal, record.pact_text, record.pactText, record.finalStatement, record.final_statement);
  const explicitPactMode = stringValue(record.pactStatementMode, record.pact_statement_mode);
  const pactStatementMode =
    explicitPactMode === "build_live" || explicitPactMode === "predefined"
      ? explicitPactMode
      : pactProposal
        ? "predefined"
        : "build_live";
  const timerEnabled = booleanValue(false, record.timer_enabled, record.timerEnabled);
  const timerDuration = timerDurationOrDefault(
    type,
    numberValue(record.timer_duration, record.timerDuration, record.duration, record.duration_minutes, record.durationMinutes)
  );

  return {
    type,
    custom_suffix_label: nullableStringValue(record.custom_suffix_label, record.instance_label, record.instanceLabel, record.customTitle, record.custom_title, record.title, record.name),
    order: numberValue(record.order, record.order_index, record.orderIndex) ?? index + 1,
    question_or_instruction: stringValue(record.question_or_instruction, record.prompt, record.question, record.instruction),
    timer_enabled: timerEnabled,
    timer_duration: timerEnabled ? timerDuration : null,
    show_live_responses: booleanValue(true, record.show_live_responses, record.showLiveResponses, record.show_live_results, record.showLiveResults),
    surface_input_types: type === "emersione" ? normalizeSurfaceTypesForFile(record.surface_input_types ?? record.surfaceInputTypes ?? record.categories) : undefined,
    priority_source_type:
      record.priority_source_type === "previous_activity" || record.prioritySourceType === "previous_activity"
        ? "previous_activity"
        : record.priority_source_type === "manual" || record.prioritySourceType === "manual"
          ? "manual"
          : null,
    source_activity_order: numberValue(record.source_activity_order, record.sourceActivityOrder, record.priority_source_activity_order, record.prioritySourceActivityOrder),
    manual_items: stringArrayValue(record.manual_items ?? record.manualItems ?? record.priority_manual_items ?? record.priorityManualItems),
    votesPerParticipant: clampPriorityVotesPerParticipant(record.votesPerParticipant ?? record.votes_per_participant),
    pactStatementMode,
    pactProposal,
    finalStatement: nullableStringValue(record.finalStatement, record.final_statement),
    facilitatorNote: nullableStringValue(record.facilitatorNote, record.facilitator_note)
  };
}

function contextCatalog() {
  const all = [...dictionaries.it.setup.contexts, ...dictionaries.en.setup.contexts];
  return Array.from(new Map(all.map((context) => [context.id, context])).values());
}

function findContextByLabel(label: string | null | undefined) {
  if (!label) return null;
  return contextCatalog().find((context) => context.label.toLowerCase() === label.toLowerCase()) ?? null;
}

export function buildRitualFileFromDraft(draft: RitualSetupDraft): RitualFile {
  const knownContextRoles: Set<string> | null = draft.contextId
    ? new Set<string>(contextCatalog().find((context) => context.id === draft.contextId)?.roles ?? [])
    : null;
  const selectedRoles = knownContextRoles ? draft.selectedRoles.filter((role) => knownContextRoles.has(role)) : [];
  const manualRoles = knownContextRoles
    ? Array.from(new Set([...draft.customRoles, ...draft.selectedRoles.filter((role) => !knownContextRoles.has(role))]))
    : Array.from(new Set([...draft.customRoles, ...draft.selectedRoles]));

  return {
    version: ritualFileVersion,
    ritual_name: draft.ritualName,
    facilitator_name: draft.facilitatorName.trim() || null,
    context: draft.contextId || null,
    participantDetailsMode: draft.participantDetailsMode ?? "nickname_only",
    selected_roles: selectedRoles,
    custom_roles: manualRoles,
    activities: draft.activities.map((activity, index) => ({
      type: externalType(activity.activity_type),
      custom_suffix_label: activity.instance_label.trim() || null,
      order: index + 1,
      question_or_instruction: activity.prompt,
      timer_enabled: activity.timer_enabled,
      timer_duration: activity.timer_enabled ? activity.timer_duration : null,
      show_live_responses: activity.show_live_results,
      surface_input_types: activity.activity_type === "traccia" ? cloneSurfaceInputTypes(activity.surface_input_types ?? defaultSurfaceInputTypes()) : undefined,
      priority_source_type: activity.activity_type === "priorita" ? activity.priority_source_type ?? "manual" : null,
      source_activity_order:
        activity.activity_type === "priorita" && typeof activity.priority_source_activity_order === "number"
          ? activity.priority_source_activity_order + 1
          : null,
      manual_items: activity.activity_type === "priorita" ? activity.priority_manual_items ?? [] : [],
      votesPerParticipant: activity.activity_type === "priorita" ? clampPriorityVotesPerParticipant(activity.votes_per_participant) : undefined,
      pactStatementMode: activity.activity_type === "patto" ? activity.pact_statement_mode ?? "build_live" : undefined,
      pactProposal: activity.activity_type === "patto" ? activity.pact_text ?? null : undefined,
      facilitatorNote: activity.activity_type === "patto" ? activity.facilitator_note ?? null : undefined
    }))
  };
}

export function buildRitualFileFromSnapshot(snapshot: LiveSessionSnapshot): RitualFile {
  const context = findContextByLabel(snapshot.session.context_label);
  const knownRoles = context ? new Set(context.roles) : new Set<string>();
  const selectedRoles = context ? snapshot.roles.map((role) => role.role_name).filter((role) => knownRoles.has(role)) : [];
  const customRoles = context ? snapshot.roles.map((role) => role.role_name).filter((role) => !knownRoles.has(role)) : snapshot.roles.map((role) => role.role_name);

  return {
    version: ritualFileVersion,
    ritual_name: snapshot.session.title,
    facilitator_name: snapshot.session.facilitator_name,
    context: context?.id ?? null,
    participantDetailsMode: snapshot.session.participant_details_mode ?? "nickname_only",
    selected_roles: selectedRoles,
    custom_roles: customRoles,
    activities: snapshot.activities
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((activity) => ({
        type: externalType(activity.activity_type),
        custom_suffix_label: activity.instance_label || `#${activity.instance_index}`,
        order: activity.order_index + 1,
        question_or_instruction: activity.prompt,
        timer_enabled: activity.timer_enabled,
        timer_duration: activity.timer_enabled ? activity.timer_duration : null,
        show_live_responses: activity.show_live_results,
        surface_input_types: activity.activity_type === "traccia" ? cloneSurfaceInputTypes(normalizeSurfaceInputTypes(activity.surface_input_types as SurfaceInputType[] | null)) : undefined,
        priority_source_type: activity.activity_type === "priorita" && activity.priority_source?.startsWith("previous:") ? "previous_activity" : activity.activity_type === "priorita" ? "manual" : null,
        source_activity_order: activity.activity_type === "priorita" && activity.priority_source?.startsWith("previous:") ? Number(activity.priority_source.slice("previous:".length)) + 1 : null,
        manual_items:
          activity.activity_type === "priorita"
            ? snapshot.priorityItems.filter((item) => item.live_activity_id === activity.id && item.source_type === "manual").map((item) => item.label)
            : [],
        votesPerParticipant: activity.activity_type === "priorita" ? clampPriorityVotesPerParticipant(activity.votes_per_participant) : undefined,
        pactStatementMode: activity.activity_type === "patto" ? activity.pact_statement_mode ?? "build_live" : undefined,
        pactProposal: activity.activity_type === "patto" ? activity.pact_text ?? null : undefined,
        facilitatorNote: activity.activity_type === "patto" ? activity.facilitator_note ?? null : undefined
      }))
  };
}

export function ritualFileToDraft(file: RitualFile): RitualSetupDraft {
  return {
    ritualName: file.ritual_name || "",
    facilitatorName: file.facilitator_name || "",
    contextId: file.context || "",
    participantDetailsMode: file.participantDetailsMode ?? "nickname_only",
    selectedRoles: file.selected_roles ?? [],
    customRoles: file.custom_roles ?? [],
    activities: [...file.activities]
      .sort((a, b) => a.order - b.order)
      .map((activity) => ({
        activity_type: internalType(activity.type),
        instance_label: activity.custom_suffix_label || `#${activity.order}`,
        prompt: activity.question_or_instruction || "",
        timer_enabled: Boolean(activity.timer_enabled),
        timer_duration: activity.timer_enabled ? activity.timer_duration ?? defaultActivityDuration(internalType(activity.type)) : null,
        show_live_results: activity.show_live_responses !== false,
        surface_input_types: internalType(activity.type) === "traccia" ? normalizeSurfaceInputTypes(activity.surface_input_types) : null,
        priority_source_type: internalType(activity.type) === "priorita" ? activity.priority_source_type ?? "manual" : null,
        priority_source_activity_order:
          internalType(activity.type) === "priorita" && typeof activity.source_activity_order === "number"
            ? Math.max(0, activity.source_activity_order - 1)
            : null,
        priority_manual_items: internalType(activity.type) === "priorita" ? activity.manual_items ?? [] : [],
        votes_per_participant:
          internalType(activity.type) === "priorita"
            ? clampPriorityVotesPerParticipant(activity.votesPerParticipant)
            : DEFAULT_PRIORITY_VOTES_PER_PARTICIPANT,
        pact_statement_mode:
          internalType(activity.type) === "patto"
            ? activity.pactStatementMode ?? (activity.finalStatement ? "predefined" : "build_live")
            : "build_live",
        facilitator_note: internalType(activity.type) === "patto" ? activity.facilitatorNote ?? null : null,
        pact_text:
          internalType(activity.type) === "patto"
            ? activity.pactProposal ?? activity.finalStatement ?? (activity.pactStatementMode ? null : activity.question_or_instruction || "")
            : null
      }))
  };
}

export function validateRitualFile(input: unknown): RitualFile {
  if (!input || typeof input !== "object") throw new Error("invalid_ritual_file");
  const candidate = asRecord(input);
  const version = candidate.version ?? candidate.schemaVersion;
  if (version && version !== ritualFileVersion && version !== 1) throw new Error("unsupported_ritual_file_version");
  if (!Array.isArray(candidate.activities)) throw new Error("invalid_ritual_file");
  const context = nullableStringValue(candidate.context, candidate.contextId, candidate.context_id);
  const participantDetailsMode = stringValue(candidate.participantDetailsMode, candidate.participant_details_mode) === "identified" ? "identified" : "nickname_only";
  return {
    version: ritualFileVersion,
    ritual_name: stringValue(candidate.ritual_name, candidate.ritualName, candidate.title),
    facilitator_name: nullableStringValue(candidate.facilitator_name, candidate.facilitatorName, candidate.organizer_name, candidate.organizerName),
    context,
    participantDetailsMode,
    selected_roles: stringArrayValue(candidate.selected_roles ?? candidate.selectedRoles),
    custom_roles: stringArrayValue(candidate.custom_roles ?? candidate.customRoles),
    activities: candidate.activities.map(normalizeRitualFileActivity)
  };
}

export function stashPendingRitualFile(file: RitualFile) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(pendingStorageKey, JSON.stringify(file));
}

export function consumePendingRitualFile() {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(pendingStorageKey);
  if (!raw) return null;
  window.sessionStorage.removeItem(pendingStorageKey);
  return validateRitualFile(JSON.parse(raw));
}

export function downloadRitualFile(file: RitualFile) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${(file.ritual_name || "ritual").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}.ritual.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
