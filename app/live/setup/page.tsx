"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUp, ChevronDown, ChevronUp, Download, Flame, Focus, Handshake, Layers, ListChecks, TimerReset, Trash2, X } from "lucide-react";
import { Button } from "@/components/live/button";
import { Field, inputClass, panelClass, selectClass } from "@/components/live/field";
import { buildRitualFileFromDraft, consumePendingRitualFile, downloadRitualFile, ritualFileToDraft } from "@/lib/live/ritual-file";
import { AppShell } from "@/components/live/shell";
import { activityPrompt } from "@/lib/live/i18n";
import { createLiveSession, enterLiveLobby } from "@/lib/live/repository";
import { ActivityType, activities, clampPriorityVotesPerParticipant, CreateRitualActivityInput, defaultActivityDuration, ParticipantDetailsMode, SurfaceColorKey, SurfaceInputType } from "@/types/live";
import { toLiveActivityInputs } from "@/lib/live/setup-adapter";
import { defaultSurfaceInputTypes, normalizeSurfaceInputTypes, surfaceColorClasses, surfaceColorName, surfaceColorPalette } from "@/lib/live/surface-input-types";
import { useLanguage } from "@/lib/live/use-language";
import { cn, uid } from "@/lib/live/utils";

type SetupActivity = CreateRitualActivityInput & {
  local_id: string;
  instance_label: string;
  priority_source_activity_local_id?: string | null;
};

const activityIcons: Record<ActivityType, typeof Flame> = {
  innesco: Flame,
  traccia: Layers,
  focus: Focus,
  priorita: ListChecks,
  patto: Handshake
};

function ActivityIcon({ type, className, size = 22 }: { type: ActivityType; className?: string; size?: number }) {
  const Icon = activityIcons[type];
  return <Icon aria-hidden="true" className={cn("shrink-0", className)} size={size} strokeWidth={1.7} />;
}
function SetupSectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-heading text-xl font-semibold text-bone">{children}</h3>;
}

export default function SetupPage() {
  return (
    <Suspense fallback={<AppShell><p className="text-bone/50">Caricamento.</p></AppShell>}>
      <SetupContent />
    </Suspense>
  );
}

function SetupContent() {
  const router = useRouter();
  const { language, messages, href } = useLanguage();
  const [title, setTitle] = useState<string>(messages.setup.defaultTitle);
  const [facilitatorName, setFacilitatorName] = useState("");
  const [contextId, setContextId] = useState<string>("");
  const [participantDetailsMode, setParticipantDetailsMode] = useState<ParticipantDetailsMode>("nickname_only");
  const [roles, setRoles] = useState<string[]>([]);
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [customRole, setCustomRole] = useState("");
  const [selectedActivities, setSelectedActivities] = useState<SetupActivity[]>([]);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [surfaceNotice, setSurfaceNotice] = useState<{ activityId: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedContext = useMemo(() => messages.setup.contexts.find((context) => context.id === contextId), [contextId, messages.setup.contexts]);
  const availableRoles = useMemo(
    () => Array.from(new Set([...(selectedContext?.roles ?? []), ...customRoles])),
    [selectedContext, customRoles]
  );
  const hasActivities = selectedActivities.length > 0;
  const estimatedDuration = useMemo(() => {
    const total = selectedActivities.reduce((sum, activity) => {
      if (!activity.timer_enabled) return sum;
      const duration = Number(activity.timer_duration);
      return Number.isFinite(duration) && duration > 0 ? sum + duration : sum;
    }, 0);
    return total > 0 ? total : null;
  }, [selectedActivities]);
  const configuredActivities = useMemo(() => toLiveActivityInputs(selectedActivities.map((activity) => ({
    ...activity,
    priority_source_activity_order: activity.priority_source_activity_local_id
      ? selectedActivities.findIndex((item) => item.local_id === activity.priority_source_activity_local_id)
      : null
  }))), [selectedActivities]);
  const canOpenLobby =
    hasActivities &&
    title.trim().length > 0 &&
    configuredActivities.every((activity) => {
      if (!activity.prompt) return false;
      if (activity.activity_type === "patto") {
        return activity.pact_statement_mode === "predefined" ? Boolean(activity.pact_text) : true;
      }
      return true;
    });

  useEffect(() => {
    try {
      const pending = consumePendingRitualFile();
      if (!pending) return;
      const draft = ritualFileToDraft(pending);
      queueMicrotask(() => {
      setTitle(draft.ritualName || messages.setup.defaultTitle);
      setFacilitatorName(draft.facilitatorName);
      setContextId(draft.contextId);
      setParticipantDetailsMode(draft.participantDetailsMode ?? "nickname_only");
      setRoles(draft.selectedRoles);
      setCustomRoles(draft.customRoles);
      const loadedActivities = draft.activities.map((activity, index) => ({
          local_id: uid(`loaded_activity_${index + 1}`),
          activity_type: activity.activity_type,
          instance_label: activity.instance_label,
          prompt: activity.prompt || activityPrompt(activity.activity_type, language),
          timer_enabled: activity.timer_enabled,
          timer_duration: activity.timer_duration,
          show_live_results: activity.show_live_results,
          surface_input_types: activity.activity_type === "traccia" ? normalizeSurfaceInputTypes(activity.surface_input_types) : null,
          priority_source_type: activity.priority_source_type ?? "manual",
          priority_source_activity_order: activity.priority_source_activity_order ?? null,
          priority_source_activity_local_id: null,
          priority_manual_items: activity.priority_manual_items ?? [],
          votes_per_participant: clampPriorityVotesPerParticipant(activity.votes_per_participant),
          pact_statement_mode: activity.pact_statement_mode ?? (activity.pact_text ? "predefined" : "build_live"),
          facilitator_note: activity.facilitator_note ?? null,
          pact_text: activity.pact_text ?? null
        }));
      setSelectedActivities(
        loadedActivities.map((activity) => ({
          ...activity,
          priority_source_activity_local_id:
            activity.activity_type === "priorita" &&
            activity.priority_source_type === "previous_activity" &&
            typeof activity.priority_source_activity_order === "number"
              ? loadedActivities[activity.priority_source_activity_order]?.local_id ?? null
              : null
        }))
      );
      setExpandedActivityId(null);
      });
    } catch {
      queueMicrotask(() => setSubmitError(`${messages.home.invalidRitualFile}. ${messages.home.unableToLoadRitualFile}.`));
    }
  }, [language, messages.home.invalidRitualFile, messages.home.unableToLoadRitualFile, messages.setup.defaultTitle]);

  function addActivity(type: ActivityType) {
    setSelectedActivities((current) => [
      ...current,
      {
        local_id: uid("local_activity"),
        activity_type: type,
        prompt: activityPrompt(type, language),
        timer_enabled: true,
        timer_duration: defaultActivityDuration(type),
        show_live_results: true,
        surface_input_types: type === "traccia" ? defaultSurfaceInputTypes() : null,
        priority_source_type: "manual",
        priority_source_activity_order: null,
        priority_source_activity_local_id: null,
        priority_manual_items: [],
        votes_per_participant: 1,
        pact_statement_mode: type === "patto" ? "build_live" : undefined,
        facilitator_note: null,
        pact_text: null,
        instance_label: `#${current.filter((item) => item.activity_type === type).length + 1}`
      }
    ]);
    setExpandedActivityId(null);
  }

  function updateActivity(localId: string, patch: Partial<SetupActivity>) {
    setSelectedActivities((current) => current.map((activity) => (activity.local_id === localId ? { ...activity, ...patch } : activity)));
  }

  function removeActivity(localId: string) {
    setSelectedActivities((current) => current.filter((activity) => activity.local_id !== localId));
    setExpandedActivityId((current) => (current === localId ? null : current));
  }

  function moveActivity(localId: string, direction: -1 | 1) {
    setSelectedActivities((current) => {
      const index = current.findIndex((activity) => activity.local_id === localId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function isActivityConfigured(activity: SetupActivity) {
    if (!activity.prompt.trim()) return false;
    if (activity.activity_type === "patto") {
      return (activity.pact_statement_mode ?? "build_live") === "predefined" ? Boolean(activity.pact_text?.trim()) : true;
    }
    if (activity.activity_type === "priorita") {
      if (activity.priority_source_type === "previous_activity") {
        return Boolean(activity.priority_source_activity_local_id);
      }
      return (activity.priority_manual_items ?? []).some((item) => item.trim().length > 0);
    }
    return true;
  }

  function durationLabel(activity: SetupActivity) {
    if (!activity.timer_enabled) return null;
    const duration = Number(activity.timer_duration);
    if (!Number.isFinite(duration) || duration <= 0) return "-";
    return `${duration} ${messages.common.minutesShort}`;
  }

  function selectContext(nextContextId: string) {
    setContextId(nextContextId);
  }

  function toggleRole(role: string) {
    setRoles((current) => (current.includes(role) ? current.filter((item) => item !== role) : [...current, role]));
  }

  function addCustomRole() {
    const nextRole = customRole.trim();
    if (!nextRole || availableRoles.includes(nextRole)) return;
    setCustomRoles((current) => [...current, nextRole]);
    setRoles((current) => [...current, nextRole]);
    setCustomRole("");
  }

  function removeCustomRole(role: string) {
    setCustomRoles((current) => current.filter((item) => item !== role));
    setRoles((current) => current.filter((item) => item !== role));
  }

  function addPriorityManualItem(localId: string, value: string) {
    const nextItem = value.trim();
    if (!nextItem) return false;
    const target = selectedActivities.find((activity) => activity.local_id === localId);
    const nextItems = [...(target?.priority_manual_items ?? []), nextItem];
    updateActivity(localId, { priority_manual_items: nextItems });
    return true;
  }

  function removePriorityManualItem(localId: string, itemIndex: number) {
    const target = selectedActivities.find((activity) => activity.local_id === localId);
    if (!target) return;
    updateActivity(localId, {
      priority_manual_items: (target.priority_manual_items ?? []).filter((_, index) => index !== itemIndex)
    });
  }

  function priorityVotesSummary(value: number) {
    return `${value} ${value === 1 ? messages.setup.priorityVotePerParticipantSingular : messages.setup.priorityVotePerParticipantPlural}`;
  }

  function updateSurfaceInputType(localId: string, categoryId: string, patch: Partial<SurfaceInputType>) {
    const target = selectedActivities.find((activity) => activity.local_id === localId);
    if (!target || target.activity_type !== "traccia") return;
    setSurfaceNotice((current) => (current?.activityId === localId ? null : current));
    updateActivity(localId, {
      surface_input_types: normalizeSurfaceInputTypes(target.surface_input_types).map((item) => {
        if (item.id !== categoryId) return item;
        return {
          ...item,
          ...patch,
          label: {
            it: patch.label?.it ?? item.label.it,
            en: patch.label?.en ?? item.label.en
          }
        };
      })
    });
  }

  function addSurfaceInputType(localId: string) {
    const target = selectedActivities.find((activity) => activity.local_id === localId);
    if (!target || target.activity_type !== "traccia") return;
    const currentTypes = normalizeSurfaceInputTypes(target.surface_input_types);
    if (currentTypes.length >= 6) {
      setSurfaceNotice({ activityId: localId, message: messages.setup.surfaceMaxCategories });
      return;
    }
    const nextIndex = currentTypes.length + 1;
    updateActivity(localId, {
      surface_input_types: [
        ...currentTypes,
        {
          id: uid("surface_type"),
          label: {
            it: `Categoria ${nextIndex}`,
            en: `Category ${nextIndex}`
          },
          color: surfaceColorPalette[nextIndex % surfaceColorPalette.length].key
        }
      ]
    });
    setSurfaceNotice((current) => (current?.activityId === localId ? null : current));
  }

  function removeSurfaceInputType(localId: string, categoryId: string) {
    const target = selectedActivities.find((activity) => activity.local_id === localId);
    if (!target || target.activity_type !== "traccia") return;
    const currentTypes = normalizeSurfaceInputTypes(target.surface_input_types);
    if (currentTypes.length <= 1) {
      setSurfaceNotice({ activityId: localId, message: messages.setup.surfaceKeepOne });
      return;
    }
    updateActivity(localId, {
      surface_input_types: currentTypes.filter((item) => item.id !== categoryId)
    });
    setSurfaceNotice((current) => (current?.activityId === localId ? null : current));
  }

  async function openLobby() {
    if (!canOpenLobby) return;
    setSubmitError(null);
    setSaving(true);
    try {
      const { id: sessionId } = await createLiveSession({
        title: title.trim(),
        facilitator_name: facilitatorName.trim() || null,
        context_label: selectedContext?.label ?? null,
        participant_details_mode: participantDetailsMode,
        roles,
        activities: configuredActivities
      });
      if (!sessionId) {
        throw new Error("missing_session_id");
      }
      await enterLiveLobby(sessionId);
      router.push(href(`/live/lobby?id=${sessionId}`));
    } catch (error) {
      console.error("Failed to open lobby for multi-activity ritual", error);
      const detail = error instanceof Error ? error.message : String(error);
      setSubmitError(detail);
    } finally {
      setSaving(false);
    }
  }

  function saveRitualFile() {
    const file = buildRitualFileFromDraft({
      ritualName: title.trim(),
      facilitatorName,
      contextId,
      participantDetailsMode,
      selectedRoles: roles,
      customRoles,
      activities: selectedActivities
    });
    downloadRitualFile(file);
  }

  return (
    <AppShell claim={messages.setup.claim} homeHref={href("/")}>
      <div className="mx-auto max-w-6xl">
        <aside className="mx-auto max-w-3xl pt-2 text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-mint">{messages.setup.eyebrow}</p>
          <h1 className="mt-4 font-heading text-5xl font-semibold leading-none text-bone md:text-6xl">{messages.setup.title}</h1>
          <p className="mx-auto mt-5 max-w-2xl leading-7 text-bone/58">{messages.setup.body}</p>
        </aside>

        <form
          className={cn(panelClass, "mx-auto mt-10 max-w-4xl space-y-9")}
          onSubmit={(event) => {
            event.preventDefault();
            openLobby();
          }}
        >
          <section>
            <div className="space-y-8">
              <section className="space-y-6">
              <SetupSectionTitle>{messages.setup.sections.ritualSettings}</SetupSectionTitle>
              <Field label={messages.setup.labels.ritualName}>
                <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} required />
              </Field>

              <Field label={messages.setup.labels.facilitatorName}>
                <input className={inputClass} value={facilitatorName} onChange={(event) => setFacilitatorName(event.target.value)} placeholder={messages.common.optional} />
              </Field>

              <Field label={messages.setup.labels.context} hint={messages.setup.contextHint}>
                <div className="relative">
                  <select
                    className={cn(
                      selectClass,
                      "appearance-none pr-16"
                    )}
                    value={contextId}
                    onChange={(event) => selectContext(event.target.value)}
                  >
                    <option value="">{messages.setup.noContextSelected}</option>
                    {messages.setup.contexts.map((context) => (
                      <option key={context.id} value={context.id}>
                        {context.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-bone/55" size={18} />
                </div>
              </Field>
              </section>

              <section className="space-y-6 border-t border-bone/10 pt-8">
              <SetupSectionTitle>{messages.setup.sections.participants}</SetupSectionTitle>
              <Field label={messages.setup.labels.roles} hint={selectedContext ? messages.setup.rolesHintWithContext : messages.setup.rolesHintWithoutContext}>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {availableRoles.map((role) => (
                    <button
                      type="button"
                      key={role}
                      onClick={() => toggleRole(role)}
                      className={cn(
                        "rounded-md border px-3 py-3 text-left text-sm transition",
                        roles.includes(role) ? "border-mint bg-mint/12 text-bone" : "border-bone/10 bg-night/60 text-bone/55"
                      )}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <input
                    className={inputClass}
                    value={customRole}
                    onChange={(event) => setCustomRole(event.target.value)}
                    placeholder={messages.setup.customRolePlaceholder}
                  />
                  <Button type="button" variant="secondary" onClick={addCustomRole}>
                    {messages.setup.addRole}
                  </Button>
                </div>
                {customRoles.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {customRoles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => removeCustomRole(role)}
                        className="inline-flex items-center gap-2 rounded-full border border-bone/10 bg-night/70 px-3 py-2 text-xs text-bone/70"
                      >
                        {role}
                        <X size={13} />
                      </button>
                    ))}
                  </div>
                ) : null}
              </Field>

              <div className="space-y-3">
                <div>
                  <p className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-bone/58">{messages.setup.participantDetailsTitle}</p>
                  <p className="text-[13px] leading-5 text-bone/56">{messages.setup.participantDetailsHint}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={participantDetailsMode === "nickname_only"}
                    onClick={() => setParticipantDetailsMode("nickname_only")}
                    className={cn(
                      "rounded-lg border p-4 text-left transition",
                      participantDetailsMode === "nickname_only" ? "border-mint bg-mint/12 text-bone" : "border-bone/10 bg-night/60 text-bone/60"
                    )}
                  >
                    <span className="block font-heading text-lg font-semibold">{messages.setup.nicknameOnlyTitle}</span>
                    <span className="mt-2 block text-sm leading-6 text-bone/58">{messages.setup.nicknameOnlyHint}</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={participantDetailsMode === "identified"}
                    onClick={() => setParticipantDetailsMode("identified")}
                    className={cn(
                      "rounded-lg border p-4 text-left transition",
                      participantDetailsMode === "identified" ? "border-mint bg-mint/12 text-bone" : "border-bone/10 bg-night/60 text-bone/60"
                    )}
                  >
                    <span className="block font-heading text-lg font-semibold">{messages.setup.identifiedParticipationTitle}</span>
                    <span className="mt-2 block text-sm leading-6 text-bone/58">{messages.setup.identifiedParticipationHint}</span>
                  </button>
                </div>
              </div>
              </section>
            </div>
          </section>

          <section className="space-y-4 border-t border-bone/10 pt-8">
            <SetupSectionTitle>{messages.setup.sections.activities}</SetupSectionTitle>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-mint">{messages.setup.labels.activity}</p>
              <p className="text-[13px] leading-5 text-bone/56">{messages.setup.lockedHelper}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {activities.map((item) => {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addActivity(item.id)}
                    aria-label={`${messages.setup.addActivityCta} ${messages.activities[item.id].name}`}
                    className="flex min-h-64 flex-col rounded-lg border border-bone/10 bg-night/55 p-5 text-left text-bone/62 transition hover:border-violet/70 hover:text-bone focus:outline-none focus:ring-2 focus:ring-mint"
                  >
                    <ActivityIcon type={item.id} className="mb-6 text-violet" size={48} />
                    <span className="block font-heading text-lg font-semibold">{messages.activities[item.id].name}</span>
                    <span className="mt-3 block text-[15px] leading-6 text-bone/64">{messages.activities[item.id].setupDescription}</span>
                    <span className="mt-auto inline-flex pt-5 text-sm font-medium text-mint">{messages.setup.addActivityCta}</span>
                  </button>
                );
              })}
            </div>
            {hasActivities ? (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-bone/10 bg-night/35 px-4 py-3">
                <p className="text-sm text-bone/62">{messages.setup.estimatedTotalDuration}</p>
                <p className="font-heading text-lg text-bone">{estimatedDuration ? `${estimatedDuration} ${messages.common.minutesShort}` : "-"}</p>
              </div>
            ) : null}
          </section>

          {hasActivities ? (
            <>
              <section className="space-y-5 border-t border-bone/10 pt-8">
                <SetupSectionTitle>{messages.setup.sections.activityConfiguration}</SetupSectionTitle>
                {selectedActivities.map((activity, index) => {
                  const description = messages.activities[activity.activity_type];
                  const supportsLiveVisibility = ["innesco", "traccia", "focus"].includes(activity.activity_type);
                  const surfaceInputTypes = activity.activity_type === "traccia" ? normalizeSurfaceInputTypes(activity.surface_input_types) : [];
                  const previousTextActivities = selectedActivities
                    .slice(0, index)
                    .filter((item) => ["innesco", "traccia", "focus"].includes(item.activity_type));
                  const isExpanded = expandedActivityId === activity.local_id;
                  const needsPrioritySetup = activity.activity_type === "priorita" && !isActivityConfigured(activity);
                  return (
                    <article
                      key={activity.local_id}
                      className="rounded-lg border border-bone/10 bg-night/50 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <ActivityIcon type={activity.activity_type} className="text-violet" size={20} />
                            <h3 className="font-heading text-xl font-semibold text-bone">{description.name} /</h3>
                            <input
                              aria-label={`${description.name} instance label`}
                              className="min-w-20 border-b border-bone/20 bg-transparent px-1 py-1 text-lg font-semibold text-bone outline-none transition focus:border-mint"
                              value={activity.instance_label}
                              onChange={(event) => updateActivity(activity.local_id, { instance_label: event.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1.5 text-sm text-bone/68">
                          {durationLabel(activity) ? (
                            <span className="inline-flex items-center gap-2 whitespace-nowrap px-1 py-1">
                              <TimerReset size={14} />
                              {durationLabel(activity)}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            aria-label={`Move ${description.name} up`}
                            onClick={() => moveActivity(activity.local_id, -1)}
                            className="rounded-md border border-bone/10 p-2 text-bone/58"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Move ${description.name} down`}
                            onClick={() => moveActivity(activity.local_id, 1)}
                            className="rounded-md border border-bone/10 p-2 text-bone/58"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${description.name}`}
                            onClick={() => removeActivity(activity.local_id)}
                            className="rounded-md border border-orange/20 p-2 text-orange"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {needsPrioritySetup ? (
                        <div className="mt-3">
                          <span className="inline-flex rounded-full border border-orange/30 bg-orange/10 px-3 py-1.5 text-sm text-orange">
                            {messages.setup.needsSetup}
                          </span>
                        </div>
                      ) : null}

                      {isExpanded ? (
                        <div className="mt-6 space-y-6 border-t border-bone/10 pt-6">
                          <section className="border-l border-mint/35 py-1 pl-4 pr-2">
                            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/58">
                              {messages.setup.labels.howToUse}
                            </h4>
                            <p className="mt-2 max-w-4xl text-[15px] leading-7 text-bone/64">{description.guidance}</p>
                          </section>

                          <Field label={messages.setup.labels.instruction}>
                            <textarea
                              className={cn(inputClass, "min-h-24 resize-y")}
                              value={activity.prompt}
                              onChange={(event) => updateActivity(activity.local_id, { prompt: event.target.value })}
                            />
                          </Field>

                          {activity.activity_type === "traccia" ? (
                            <div className="space-y-4 rounded-lg border border-bone/10 bg-night/45 p-4">
                              <div>
                                <p className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-bone/58">{messages.setup.surfaceInputTypesTitle}</p>
                                <p className="text-sm text-bone/55">{messages.setup.surfaceInputTypesHint}</p>
                                <p className="mt-2 text-[13px] leading-5 text-bone/50">{messages.setup.surfaceInputTypesRecommendation}</p>
                              </div>
                              <div className="space-y-3">
                                {surfaceInputTypes.map((surfaceType, categoryIndex) => {
                                  const colorStyle = surfaceColorClasses(surfaceType.color);
                                  return (
                                    <div key={surfaceType.id} className="rounded-lg border border-bone/10 bg-night/55 p-3">
                                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0 flex-1">
                                          <input
                                            aria-label={`${messages.setup.surfaceCategoryNamePlaceholder} ${categoryIndex + 1}`}
                                            className={inputClass}
                                            value={surfaceType.label[language]}
                                            placeholder={messages.setup.surfaceCategoryNamePlaceholder}
                                            onChange={(event) =>
                                              updateSurfaceInputType(activity.local_id, surfaceType.id, {
                                                label: {
                                                  ...surfaceType.label,
                                                  [language]: event.target.value,
                                                  [language === "it" ? "en" : "it"]:
                                                    surfaceType.label[language === "it" ? "en" : "it"] || event.target.value
                                                }
                                              })
                                            }
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removeSurfaceInputType(activity.local_id, surfaceType.id)}
                                          disabled={surfaceInputTypes.length <= 1}
                                          className={cn(
                                            "inline-flex items-center justify-center rounded-md border p-2 text-orange transition",
                                            surfaceInputTypes.length <= 1 ? "cursor-not-allowed border-bone/8 text-bone/22" : "border-orange/20"
                                          )}
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                      <div className="mt-3 flex flex-wrap items-center gap-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/45">{messages.setup.surfaceColorLabel}</p>
                                        <div className="flex flex-wrap gap-2">
                                          {surfaceColorPalette.map((color) => {
                                            const selected = surfaceType.color === color.key;
                                            return (
                                              <button
                                                key={color.key}
                                                type="button"
                                                title={`${messages.setup.surfaceColorLabel}: ${surfaceColorName(color.key, language)}`}
                                                aria-label={`${messages.setup.surfaceColorLabel}: ${surfaceColorName(color.key, language)}`}
                                                onClick={() => updateSurfaceInputType(activity.local_id, surfaceType.id, { color: color.key as SurfaceColorKey })}
                                                className={cn(
                                                  "inline-flex h-8 w-8 items-center justify-center rounded-full border transition",
                                                  selected ? "border-bone bg-bone/10" : "border-bone/10 bg-night/70"
                                                )}
                                              >
                                                <span className={cn("h-3 w-3 rounded-full", color.dotClass)} />
                                              </button>
                                            );
                                          })}
                                        </div>
                                        <span className={cn("text-sm font-medium", colorStyle.textClass)}>{surfaceType.label[language] || messages.setup.surfaceCategoryNamePlaceholder}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {surfaceNotice?.activityId === activity.local_id ? <p className="text-sm text-orange">{surfaceNotice.message}</p> : null}
                              <Button type="button" variant="secondary" onClick={() => addSurfaceInputType(activity.local_id)}>
                                {messages.setup.surfaceAddCategory}
                              </Button>
                            </div>
                          ) : null}

                          <div className="space-y-4 rounded-lg border border-bone/10 bg-night/45 p-4">
                            <div>
                              <p className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-bone/58">{messages.setup.timerTitle}</p>
                              <p className="text-sm text-bone/55">{messages.setup.timerHint}</p>
                            </div>
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
                              <label className="flex items-center gap-3 text-sm font-medium text-bone">
                                <input
                                  aria-label={messages.setup.timerToggleLabel}
                                  type="checkbox"
                                  checked={activity.timer_enabled}
                                  onChange={(event) => updateActivity(activity.local_id, { timer_enabled: event.target.checked })}
                                />
                                <span>{messages.setup.timerToggleLabel}</span>
                              </label>
                              {activity.timer_enabled ? (
                                <div className="flex flex-wrap items-center gap-3 md:flex-none">
                                  <div className="relative w-[132px]">
                                    <input
                                      aria-label={messages.setup.labels.durationAriaLabel}
                                      className={cn(inputClass, "w-full pr-12")}
                                      type="number"
                                      min={1}
                                      max={120}
                                      value={activity.timer_duration ?? defaultActivityDuration(activity.activity_type)}
                                      onChange={(event) => updateActivity(activity.local_id, { timer_duration: Number(event.target.value) })}
                                    />
                                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-bone/62">
                                      {messages.common.minutesShort}
                                    </span>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {supportsLiveVisibility ? (
                            <div className="space-y-3">
                              <div>
                                <p className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-bone/58">{messages.setup.responseVisibilityTitle}</p>
                                <p className="mt-1 text-sm text-bone/55">{messages.setup.responseVisibilityHint}</p>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                                {[
                                  {
                                    value: true,
                                    title: messages.setup.liveTitle,
                                    helper: messages.setup.liveHelper
                                  },
                                  {
                                    value: false,
                                    title: messages.setup.collectThenRevealTitle,
                                    helper: messages.setup.collectThenRevealHelper
                                  }
                                ].map((option) => {
                                  const checked = activity.show_live_results === option.value;
                                  return (
                                    <label
                                      key={option.title}
                                      className={cn(
                                        "block cursor-pointer rounded-lg border p-4 transition",
                                        checked
                                          ? "border-mint bg-mint/10 text-bone"
                                          : "border-bone/10 bg-night/45 text-bone/70 hover:border-violet/45"
                                      )}
                                    >
                                      <input
                                        type="radio"
                                        name={`response-visibility-${activity.local_id}`}
                                        className="sr-only"
                                        checked={checked}
                                        onChange={() => updateActivity(activity.local_id, { show_live_results: option.value })}
                                      />
                                      <div aria-hidden className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="text-sm font-semibold text-bone">{option.title}</p>
                                          <p className="mt-2 text-sm leading-6 text-bone/60">{option.helper}</p>
                                        </div>
                                        <span
                                          className={cn(
                                            "mt-0.5 h-4 w-4 rounded-full border",
                                            checked ? "border-mint bg-mint" : "border-bone/30 bg-transparent"
                                          )}
                                        />
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}

                          {activity.activity_type === "priorita" ? (
                            <div className="space-y-4 rounded-lg border border-violet/25 bg-violet/8 p-4">
                              <Field label={messages.setup.labels.priorityWhat}>
                                <select
                                  className={selectClass}
                                  value={activity.priority_source_type ?? "manual"}
                                  onChange={(event) =>
                                    updateActivity(activity.local_id, {
                                      priority_source_type: event.target.value as "previous_activity" | "manual",
                                      priority_source_activity_local_id:
                                        event.target.value === "previous_activity"
                                          ? previousTextActivities[0]?.local_id ?? null
                                          : null
                                    })
                                  }
                                >
                                  <option value="previous_activity">{messages.setup.priorityPreviousActivity}</option>
                                  <option value="manual">{messages.setup.priorityManualInput}</option>
                                </select>
                              </Field>
                              {activity.priority_source_type === "previous_activity" ? (
                                <Field label={messages.setup.labels.prioritySourceActivity} hint={messages.setup.priorityPreviousHint}>
                                  {previousTextActivities.length ? (
                                    <select
                                      className={selectClass}
                                      value={activity.priority_source_activity_local_id ?? previousTextActivities[0]?.local_id ?? ""}
                                      onChange={(event) => updateActivity(activity.local_id, { priority_source_activity_local_id: event.target.value })}
                                    >
                                      {previousTextActivities.map((item) => (
                                        <option key={item.local_id} value={item.local_id}>
                                          {messages.activities[item.activity_type].name} / {item.instance_label}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <p className="rounded-md border border-bone/10 bg-night/55 p-4 text-[13px] leading-5 text-bone/56">{messages.setup.noPreviousActivities}</p>
                                  )}
                                </Field>
                              ) : (
                                <Field label={messages.setup.labels.priorityItemsManual} hint={messages.setup.priorityManualHint}>
                                  <PriorityManualItemsEditor
                                    inputClass={inputClass}
                                    placeholder={messages.setup.priorityManualPlaceholder}
                                    buttonLabel={messages.setup.addRole}
                                    items={activity.priority_manual_items ?? []}
                                    onAdd={(value) => addPriorityManualItem(activity.local_id, value)}
                                    onRemove={(itemIndex) => removePriorityManualItem(activity.local_id, itemIndex)}
                                  />
                                </Field>
                              )}
                              <div className="space-y-3 rounded-lg border border-bone/10 bg-night/45 p-4">
                                <div>
                                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-bone/58">
                                    {messages.setup.labels.numberOfVotes}
                                  </span>
                                  <p className="text-[13px] leading-5 text-bone/56">{messages.setup.priorityVotesHint}</p>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <p className="text-lg font-medium text-bone">
                                      {priorityVotesSummary(clampPriorityVotesPerParticipant(activity.votes_per_participant))}
                                    </p>
                                    <p className="mt-1 text-[13px] leading-5 text-bone/56">{messages.setup.priorityVotesHelper}</p>
                                  </div>
                                  <div className="inline-flex items-center rounded-md border border-bone/10 bg-night/65">
                                    <button
                                      type="button"
                                      aria-label={messages.setup.decreasePriorityVotes}
                                      className="min-h-12 min-w-12 px-4 text-lg text-bone transition hover:bg-bone/6 disabled:text-bone/30"
                                      onClick={() =>
                                        updateActivity(activity.local_id, {
                                          votes_per_participant: clampPriorityVotesPerParticipant((activity.votes_per_participant ?? 1) - 1)
                                        })
                                      }
                                      disabled={clampPriorityVotesPerParticipant(activity.votes_per_participant) <= 1}
                                    >
                                      -
                                    </button>
                                    <div
                                      className="min-h-12 min-w-16 border-x border-bone/10 px-4 text-center text-lg font-semibold leading-[3rem] text-bone"
                                      aria-label={messages.setup.priorityVotesAriaLabel}
                                    >
                                      {clampPriorityVotesPerParticipant(activity.votes_per_participant)}
                                    </div>
                                    <button
                                      type="button"
                                      aria-label={messages.setup.increasePriorityVotes}
                                      className="min-h-12 min-w-12 px-4 text-lg text-bone transition hover:bg-bone/6 disabled:text-bone/30"
                                      onClick={() =>
                                        updateActivity(activity.local_id, {
                                          votes_per_participant: clampPriorityVotesPerParticipant((activity.votes_per_participant ?? 1) + 1)
                                        })
                                      }
                                      disabled={clampPriorityVotesPerParticipant(activity.votes_per_participant) >= 10}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {activity.activity_type === "patto" ? (
                            <div className="space-y-4">
                              <div>
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-bone/58">
                                  {messages.setup.labels.pactStatementMode}
                                </span>
                                <p className="text-[13px] leading-5 text-bone/56">{messages.setup.pactStatementModeHint}</p>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                                {(["build_live", "predefined"] as const).map((mode) => {
                                  const selected = (activity.pact_statement_mode ?? "build_live") === mode;
                                  return (
                                    <button
                                      key={mode}
                                      type="button"
                                      aria-pressed={selected}
                                      onClick={() => updateActivity(activity.local_id, { pact_statement_mode: mode })}
                                      className={cn(
                                        "rounded-lg border p-4 text-left transition",
                                        selected ? "border-mint bg-mint/10 text-bone" : "border-bone/10 bg-night/50 text-bone/72 hover:border-bone/25"
                                      )}
                                    >
                                      <p className="font-medium text-bone">
                                        {mode === "build_live" ? messages.setup.pactBuildLiveTitle : messages.setup.pactPredefinedTitle}
                                      </p>
                                      <p className="mt-2 text-sm leading-6 text-bone/60">
                                        {mode === "build_live" ? messages.setup.pactBuildLiveHint : messages.setup.pactPredefinedHint}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>

                              {(activity.pact_statement_mode ?? "build_live") === "predefined" ? (
                                <Field label={messages.setup.labels.finalStatement}>
                                  <textarea
                                    className={cn(inputClass, "min-h-24 resize-y")}
                                    value={activity.pact_text ?? ""}
                                    placeholder={messages.setup.pactProposalPlaceholder}
                                    onChange={(event) => updateActivity(activity.local_id, { pact_text: event.target.value })}
                                  />
                                </Field>
                              ) : (
                                <Field label={messages.setup.labels.facilitatorNote} hint={messages.setup.facilitatorNoteHint}>
                                  <textarea
                                    className={cn(inputClass, "min-h-24 resize-y")}
                                    value={activity.facilitator_note ?? ""}
                                    placeholder={messages.setup.facilitatorNotePlaceholder}
                                    onChange={(event) => updateActivity(activity.local_id, { facilitator_note: event.target.value })}
                                  />
                                </Field>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-5 flex justify-center border-t border-bone/10 pt-4">
                        <button
                          type="button"
                          aria-label={isExpanded ? messages.setup.collapseActivity : messages.setup.configureActivity}
                          onClick={() => setExpandedActivityId((current) => (current === activity.local_id ? null : activity.local_id))}
                          className="inline-flex items-center gap-2 text-sm font-medium text-bone/72 transition hover:text-bone"
                        >
                          {isExpanded ? messages.setup.collapseActivity : messages.setup.configureActivity}
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>

              {submitError ? <p className="text-sm text-orange">{submitError}</p> : null}
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="secondary" onClick={saveRitualFile} title={messages.setup.saveRitualFileHelp}>
                  {messages.setup.saveRitualFile} <Download size={17} />
                </Button>
                <Button type="submit" disabled={saving || !canOpenLobby}>
                  {messages.setup.openLobby} <ArrowRight size={17} />
                </Button>
              </div>
            </>
          ) : null}
        </form>
      </div>
    </AppShell>
  );
}

function PriorityManualItemsEditor({
  inputClass,
  placeholder,
  buttonLabel,
  items,
  onAdd,
  onRemove
}: {
  inputClass: string;
  placeholder: string;
  buttonLabel: string;
  items: string[];
  onAdd: (value: string) => boolean;
  onRemove: (index: number) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (onAdd(value)) setValue("");
          }}
        >
          {buttonLabel}
        </Button>
      </div>
      {items.length ? (
        <div className="grid gap-2 md:grid-cols-2">
          {items.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-start justify-between gap-3 rounded-md border border-bone/10 bg-night/55 px-4 py-3">
              <p className="text-sm leading-6 text-bone">{item}</p>
              <button type="button" onClick={() => onRemove(index)} className="mt-0.5 text-bone/45 transition hover:text-orange">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
