"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Activity, ActivityType } from "@/types/activity";
import { Assessment } from "@/types/assessment";
import { ActivityEditor } from "@/components/builder/ActivityEditor";
import { ActivityList } from "@/components/builder/ActivityList";
import { LinkGenerator } from "@/components/builder/LinkGenerator";
import { BuilderShell } from "@/components/layout/BuilderShell";
import { Button, Card, Field, inputClass, selectClass, StepHeader } from "@/components/ritual-ui";
import { createActivityPreset } from "@/data/activity-presets";
import { previousExplorationActivities, previousPrioritizationActivities } from "@/lib/activities/dependencies";
import { locales } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/useLocale";
import {
  deleteSupabaseActivity,
  fetchAssessmentBundle,
  insertSupabaseActivity,
  reorderSupabaseActivities,
  updateSupabaseActivity,
  updateSupabaseAssessment
} from "@/lib/supabase/assessmentRepository";
import { isTemplateAssessment, markAssessmentAsTemplate, unmarkAssessmentAsTemplate } from "@/lib/templates/templateStore";
import { getErrorMessage } from "@/lib/utils/errors";
import { Locale } from "@/types/locale";

function reorderActivities(activities: Activity[]) {
  return activities
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((activity, orderIndex) => ({ ...activity, orderIndex }) as Activity);
}

function orderedFromCurrentOrder(activities: Activity[]) {
  return activities.map((activity, orderIndex) => ({ ...activity, orderIndex }) as Activity);
}

function formatActivityCountLabel(count: number, singularLabel: string, pluralLabel: string) {
  const template = count === 1 ? singularLabel : pluralLabel;
  return template.replace("{count}", String(count));
}

function defaultEstimatedDuration(locale: Locale) {
  if (locale === "it") return "35–45 minuti";
  if (locale === "fr") return "35–45 minutes";
  return "35–45 minutes";
}

function durationRangeFromText(value?: string) {
  const matches = value?.match(/\d+/g)?.map(Number) ?? [];
  const min = Math.min(Math.max(matches[0] ?? 35, 1), 240);
  const max = Math.min(Math.max(matches[1] ?? matches[0] ?? 45, min), 240);
  return { min, max };
}

function formatEstimatedDuration(min: number, max: number, locale: Locale) {
  if (locale === "it") return `${min}–${max} minuti`;
  return `${min}–${max} minutes`;
}

export function AssessmentBuilder({
  assessmentId,
  ownerId,
  initialTemplateMode = false
}: {
  assessmentId: string;
  ownerId: string;
  initialTemplateMode?: boolean;
}) {
  const { messages, localeNames } = useLocale();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [isTemplate, setIsTemplate] = useState(initialTemplateMode);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadAssessment() {
      setLoading(true);
      setError(null);
      try {
        const bundle = await fetchAssessmentBundle(assessmentId, ownerId);
        if (!active) return;
        setAssessment(bundle?.assessment ?? null);
        const nextIsTemplate = initialTemplateMode || Boolean(bundle?.assessment && isTemplateAssessment(bundle.assessment.id, ownerId));
        setIsTemplate(nextIsTemplate);
        if (initialTemplateMode && bundle?.assessment) markAssessmentAsTemplate(bundle.assessment.id, ownerId);
        setSelectedActivityId(bundle?.assessment.activities[0]?.id ?? null);
      } catch (loadError) {
        if (!active) return;
        setError(getErrorMessage(loadError, messages.common.empty));
        setAssessment(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadAssessment();
    return () => {
      active = false;
    };
  }, [assessmentId, initialTemplateMode, messages.common.empty, ownerId]);

  const activities = useMemo(() => reorderActivities(assessment?.activities ?? []), [assessment?.activities]);
  const selectedActivity = activities.find((activity) => activity.id === selectedActivityId) ?? activities[0] ?? null;
  const estimatedDurationRange = useMemo(
    () => durationRangeFromText(assessment?.estimatedDuration),
    [assessment?.estimatedDuration]
  );
  const activityCountLabel = useMemo(
    () => formatActivityCountLabel(activities.length, messages.builder.activityAddedSingular, messages.builder.activitiesAddedPlural),
    [activities.length, messages.builder.activityAddedSingular, messages.builder.activitiesAddedPlural]
  );

  async function persist<T>(operation: () => Promise<T>, onSuccess?: (result: T) => void) {
    setSaving(true);
    setError(null);
    try {
      const result = await operation();
      onSuccess?.(result);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1200);
      window.dispatchEvent(new Event("ritual-assessment-storage"));
      return result;
    } catch (saveError) {
      setError(getErrorMessage(saveError, messages.auth.signInError));
      return null;
    } finally {
      setSaving(false);
    }
  }

  function updateAssessment(patch: Partial<Assessment>) {
    if (!assessment) return;
    const nextAssessment = { ...assessment, ...patch };
    setAssessment(nextAssessment);
    void persist(() => updateSupabaseAssessment(nextAssessment), setAssessment);
  }

  function updateTemplateMode(enabled: boolean) {
    if (!assessment) return;
    setIsTemplate(enabled);
    if (enabled) markAssessmentAsTemplate(assessment.id, ownerId);
    else unmarkAssessmentAsTemplate(assessment.id, ownerId);
  }

  function updateEstimatedDuration(min: number, max: number) {
    if (!assessment) return;
    updateAssessment({ estimatedDuration: formatEstimatedDuration(min, max, assessment.language) });
  }

  function addActivity(type: ActivityType) {
    if (!assessment) return;
    const ordered = reorderActivities(assessment.activities);
    const sourceActivityId =
      type === "prioritization"
        ? previousExplorationActivities(ordered, ordered.length)[0]?.id ?? ""
        : type === "framing"
          ? previousPrioritizationActivities(ordered, ordered.length)[0]?.id ?? ""
          : "";
    const nextActivity = createActivityPreset(type, ordered.length, sourceActivityId, assessment.language);
    void persist(
      () => insertSupabaseActivity(assessment.id, nextActivity),
      (insertedActivity) => {
        setAssessment((current) =>
          current && current.id === assessment.id
            ? { ...current, activities: reorderActivities([...current.activities, insertedActivity]) }
            : current
        );
        setSelectedActivityId(insertedActivity.id);
      }
    );
  }

  function moveActivity(activityId: string, direction: -1 | 1) {
    if (!assessment) return;
    const ordered = reorderActivities(activities);
    const index = ordered.findIndex((activity) => activity.id === activityId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
    const swapped = [...ordered];
    [swapped[index], swapped[nextIndex]] = [swapped[nextIndex], swapped[index]];
    const nextActivities = orderedFromCurrentOrder(swapped);
    setAssessment({ ...assessment, activities: nextActivities });
    void persist(() => reorderSupabaseActivities(nextActivities));
  }

  function removeActivity(activityId: string) {
    if (!assessment) return;
    const nextActivities = orderedFromCurrentOrder(activities.filter((activity) => activity.id !== activityId));
    setAssessment({ ...assessment, activities: nextActivities });
    if (selectedActivityId === activityId) setSelectedActivityId(nextActivities[0]?.id ?? null);
    void persist(async () => {
      await deleteSupabaseActivity(activityId);
      await reorderSupabaseActivities(nextActivities);
    });
  }

  function updateActivity(nextActivity: Activity) {
    if (!assessment) return;
    const nextActivities = activities.map((activity) => activity.id === nextActivity.id ? nextActivity : activity);
    setAssessment({ ...assessment, activities: nextActivities });
    void persist(
      () => updateSupabaseActivity(nextActivity),
      (savedActivity) => {
        setAssessment((current) =>
          current
            ? {
                ...current,
                activities: current.activities.map((activity) => activity.id === savedActivity.id ? savedActivity : activity)
              }
            : current
        );
      }
    );
  }

  if (loading) {
    return (
      <BuilderShell>
        <Card>
          <p className="text-bone/50">{messages.app.loading}</p>
        </Card>
      </BuilderShell>
    );
  }

  if (!assessment) {
    return (
      <BuilderShell>
        <Card>
          <p className="text-bone/50">{error ?? messages.common.empty}</p>
        </Card>
      </BuilderShell>
    );
  }

  return (
    <BuilderShell>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <StepHeader title={messages.builder.title} body={assessment.description} />
        <Button type="button" variant="secondary" disabled>
          <Save size={16} /> {saving ? messages.app.loading : saved ? messages.common.saved : isTemplate ? messages.builder.template.save : messages.common.save}
        </Button>
      </div>
      {error ? <p className="mt-4 text-sm text-orange">{error}</p> : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-6">
          <Card className="space-y-5">
            <h2 className="font-heading text-2xl font-semibold text-bone">{messages.builder.assessmentDetails}</h2>
            <Field label={messages.builder.titleLabel}>
              <input className={inputClass} value={assessment.title} onChange={(event) => updateAssessment({ title: event.target.value })} />
            </Field>
            <Field label={messages.builder.descriptionLabel}>
              <textarea className={`${inputClass} min-h-28 resize-y`} value={assessment.description ?? ""} onChange={(event) => updateAssessment({ description: event.target.value })} />
            </Field>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/58">{messages.builder.estimatedDurationLabel}</p>
              {assessment.estimatedDuration ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={messages.builder.estimatedDurationMin}>
                    <input
                      className={inputClass}
                      type="number"
                      min={1}
                      max={240}
                      step={5}
                      value={estimatedDurationRange.min}
                      onChange={(event) => {
                        const min = Number(event.target.value);
                        updateEstimatedDuration(min, Math.max(min, estimatedDurationRange.max));
                      }}
                    />
                  </Field>
                  <Field label={messages.builder.estimatedDurationMax}>
                    <input
                      className={inputClass}
                      type="number"
                      min={1}
                      max={240}
                      step={5}
                      value={estimatedDurationRange.max}
                      onChange={(event) => {
                        const max = Number(event.target.value);
                        updateEstimatedDuration(Math.min(estimatedDurationRange.min, max), max);
                      }}
                    />
                  </Field>
                </div>
              ) : null}
              <label className="inline-flex items-center gap-3 text-sm font-semibold text-bone/70">
                <input
                  type="checkbox"
                  checked={Boolean(assessment.estimatedDuration)}
                  onChange={(event) => {
                    if (event.target.checked) updateEstimatedDuration(estimatedDurationRange.min, estimatedDurationRange.max);
                    else updateAssessment({ estimatedDuration: undefined });
                  }}
                />
                {messages.builder.estimatedDurationToggle}
              </label>
            </div>
            <Field label={messages.builder.languageLabel}>
              <select className={selectClass} value={assessment.language} onChange={(event) => updateAssessment({ language: event.target.value as Locale })}>
                {locales.map((item) => (
                  <option key={item} value={item}>{localeNames[item]}</option>
                ))}
              </select>
            </Field>
            <label className="flex items-start gap-3 rounded-md border border-bone/10 bg-night/45 p-4">
              <input
                type="checkbox"
                className="mt-1"
                checked={isTemplate}
                disabled={assessment.status === "published" && !isTemplate}
                onChange={(event) => updateTemplateMode(event.target.checked)}
              />
              <span>
                <span className="block text-sm font-semibold text-bone">{messages.builder.templateToggle.label}</span>
                <span className="mt-1 block text-sm leading-6 text-bone/56">{messages.builder.templateToggle.helper}</span>
              </span>
            </label>
          </Card>
          <Card>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h2 className="font-heading text-2xl font-semibold text-bone">{messages.builder.assessmentFlow}</h2>
                <p className="max-w-2xl text-sm leading-6 text-bone/60">{messages.builder.assessmentFlowHelper}</p>
              </div>
              <span className="shrink-0 pt-1 text-sm text-bone/45">{activityCountLabel}</span>
            </div>
            <ActivityList
              activities={activities}
              selectedId={selectedActivity?.id ?? null}
              onSelect={setSelectedActivityId}
              onAdd={addActivity}
              onMove={moveActivity}
              onRemove={removeActivity}
            />
          </Card>
          <LinkGenerator assessment={assessment} onPublish={setAssessment} disabled={isTemplate} />
        </div>

        <div>
          <h2 className="mb-4 font-heading text-2xl font-semibold text-bone">{messages.builder.activitySettings}</h2>
          <ActivityEditor activity={selectedActivity} activities={activities} onChange={updateActivity} />
        </div>
      </div>
    </BuilderShell>
  );
}
