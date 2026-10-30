"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Activity, ActivityType } from "@/types/activity";
import { Assessment } from "@/types/assessment";
import { ActivityEditor } from "@/components/builder/ActivityEditor";
import { ActivityList } from "@/components/builder/ActivityList";
import { LinkGenerator } from "@/components/builder/LinkGenerator";
import { BuilderShell } from "@/components/layout/BuilderShell";
import { Button, ButtonLink, Card, Field, inputClass } from "@/components/ritual-ui";
import { SaveIndicator } from "@/components/ritual-ui/SaveIndicator";
import { createBlankActivity } from "@/data/activity-presets";
import { detectAssessmentLocale } from "@/lib/i18n/detectAssessmentLocale";
import { useLocale } from "@/lib/i18n/useLocale";
import {
  deleteSupabaseAssessment,
  deleteSupabaseActivity,
  fetchAssessmentBundle,
  insertSupabaseActivity,
  reorderSupabaseActivities,
  setSupabaseAssessmentStatus,
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
  initialTemplateMode = false,
  initiallyOpenSchedulingActivity = false,
  embedded = false,
  onDismiss,
  onPublishSuccess
}: {
  assessmentId: string;
  ownerId: string;
  initialTemplateMode?: boolean;
  initiallyOpenSchedulingActivity?: boolean;
  embedded?: boolean;
  onDismiss?: () => void;
  onPublishSuccess?: (assessment: Assessment) => void | Promise<void>;
}) {
  const { messages } = useLocale();
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [justPublished, setJustPublished] = useState(false);
  const [isTemplate, setIsTemplate] = useState(initialTemplateMode);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const pendingSaves = useRef(0);
  const queuedAssessmentSaves = useRef(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activityPendingDeletion, setActivityPendingDeletion] = useState<Activity | null>(null);
  const [activityResponseCounts, setActivityResponseCounts] = useState<Record<string, number>>({});
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assessmentRef = useRef<Assessment | null>(null);
  const assessmentUpdateQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    async function loadAssessment() {
      setLoading(true);
      setError(null);
      try {
        const bundle = await fetchAssessmentBundle(assessmentId, ownerId);
        if (!active) return;
        assessmentRef.current = bundle?.assessment ?? null;
        setAssessment(bundle?.assessment ?? null);
        setActivityResponseCounts(() => {
          const counts: Record<string, number> = {};
          for (const response of bundle?.responses ?? []) {
            for (const activityResponse of response.activityResponses) {
              counts[activityResponse.activityId] = (counts[activityResponse.activityId] ?? 0) + 1;
            }
          }
          return counts;
        });
        const nextIsTemplate = initialTemplateMode || Boolean(bundle?.assessment && isTemplateAssessment(bundle.assessment.id, ownerId));
        setIsTemplate(nextIsTemplate);
        if (initialTemplateMode && bundle?.assessment) markAssessmentAsTemplate(bundle.assessment.id, ownerId);
        setSelectedActivityId(initiallyOpenSchedulingActivity
          ? bundle?.assessment?.activities.find((activity) => activity.type === "scheduling")?.id ?? null
          : null);
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
  }, [assessmentId, initialTemplateMode, initiallyOpenSchedulingActivity, messages.common.empty, ownerId]);

  useEffect(() => {
    assessmentRef.current = assessment;
  }, [assessment]);

  const activities = useMemo(() => reorderActivities(assessment?.activities ?? []), [assessment?.activities]);
  const isOwner = assessment?.ownerId === ownerId;
  const estimatedDurationRange = useMemo(
    () => durationRangeFromText(assessment?.estimatedDuration),
    [assessment?.estimatedDuration]
  );
  async function persist<T>(operation: () => Promise<T>, onSuccess?: (result: T) => void) {
    pendingSaves.current += 1;
    setSaving(true);
    setError(null);
    try {
      const result = await operation();
      onSuccess?.(result);
      window.dispatchEvent(new Event("ritual-assessment-storage"));
      return result;
    } catch (saveError) {
      setSaveFailed(true);
      setError(getErrorMessage(saveError, messages.auth.signInError));
      return null;
    } finally {
      pendingSaves.current -= 1;
      if (pendingSaves.current === 0 && queuedAssessmentSaves.current === 0) setSaving(false);
    }
  }

  function queueAssessmentSave(nextAssessment: Assessment) {
    queuedAssessmentSaves.current += 1;
    setSaving(true);
    assessmentUpdateQueue.current = assessmentUpdateQueue.current
      .catch(() => undefined)
      .then(async () => { await persist(() => updateSupabaseAssessment(nextAssessment)); })
      .finally(() => {
        queuedAssessmentSaves.current -= 1;
        if (queuedAssessmentSaves.current === 0 && pendingSaves.current === 0) setSaving(false);
      });
  }

  function updateAssessment(patch: Partial<Assessment>) {
    const currentAssessment = assessmentRef.current;
    if (!currentAssessment) return;
    const nextAssessment = { ...currentAssessment, ...patch };
    assessmentRef.current = nextAssessment;
    setAssessment(nextAssessment);
    queueAssessmentSave(nextAssessment);
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
    const nextActivity = createBlankActivity(type, ordered.length);
    void persist(
      () => insertSupabaseActivity(assessment.id, nextActivity),
      (insertedActivity) => {
        setAssessment((current) =>
          current && current.id === assessment.id
            ? { ...current, activities: reorderActivities([...current.activities, insertedActivity]) }
            : current
        );
        setSelectedActivityId(null);
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

  function requestActivityRemoval(activityId: string) {
    const activity = activities.find((item) => item.id === activityId);
    if (activity) setActivityPendingDeletion(activity);
  }

  function removeActivity(activityId: string) {
    if (!assessment) return;
    const nextActivities = orderedFromCurrentOrder(activities.filter((activity) => activity.id !== activityId));
    setAssessment({ ...assessment, activities: nextActivities });
    if (selectedActivityId === activityId) setSelectedActivityId(null);
    void persist(async () => {
      await deleteSupabaseActivity(activityId);
      await reorderSupabaseActivities(nextActivities);
    });
    setActivityResponseCounts((current) => {
      const next = { ...current };
      delete next[activityId];
      return next;
    });
    setActivityPendingDeletion(null);
  }

  function updateActivity(nextActivity: Activity) {
    if (!assessment) return;
    const nextActivities = activities.map((activity) => activity.id === nextActivity.id ? nextActivity : activity);
    const detectedLocale = detectAssessmentLocale(nextActivities);
    const nextAssessment = {
      ...assessment,
      activities: nextActivities,
      ...(detectedLocale ? { language: detectedLocale } : {})
    };
    assessmentRef.current = nextAssessment;
    setAssessment(nextAssessment);
    if (detectedLocale && detectedLocale !== assessment.language) {
      queueAssessmentSave(nextAssessment);
    }
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

  async function deleteDraft() {
    if (!assessment) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteSupabaseAssessment(assessment.id);
      window.dispatchEvent(new Event("ritual-assessment-storage"));
      if (embedded) onDismiss?.();
      else router.push("/dashboard");
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, messages.dashboard.deleteError));
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function pauseCollectionForEditing() {
    if (!assessment) return;
    await persist(
      () => setSupabaseAssessmentStatus(assessment, "paused"),
      (updatedAssessment) => {
        assessmentRef.current = updatedAssessment;
        setAssessment(updatedAssessment);
      }
    );
  }

  if (loading) {
    return (
      <BuilderFrame embedded={embedded}>
        <Card>
          <p className="text-bone/50">{messages.app.loading}</p>
        </Card>
      </BuilderFrame>
    );
  }

  if (!assessment) {
    return (
      <BuilderFrame embedded={embedded}>
        <Card>
          <p className="text-bone/50">{error ?? messages.common.empty}</p>
        </Card>
      </BuilderFrame>
    );
  }

  return (
    <BuilderFrame embedded={embedded}>
      <div className={embedded ? "mx-auto max-w-5xl route-page-fade" : undefined}>
        {embedded ? (
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-3xl font-semibold leading-tight text-bone md:text-4xl">{messages.builder.individualTitle}</h1>
              <SaveIndicator status={saveFailed ? "error" : saving ? "saving" : "saved"} savedLabel={messages.builder.savedAutomatically} savingLabel={messages.builder.saving} errorLabel={messages.builder.saveError} />
            </div>
            {assessment.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-bone/60">{assessment.description}</p> : null}
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="space-y-5">
          <ButtonLink href="/dashboard" variant="ghost" className="min-h-10 px-0 text-bone/70 hover:text-bone">
            <ArrowLeft size={17} />
            {messages.nav.dashboard}
          </ButtonLink>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-4xl font-semibold leading-tight text-bone md:text-5xl">{messages.builder.individualTitle}</h1>
              <SaveIndicator status={saveFailed ? "error" : saving ? "saving" : "saved"} savedLabel={messages.builder.savedAutomatically} savingLabel={messages.builder.saving} errorLabel={messages.builder.saveError} />
            </div>
            {assessment.description ? <p className="mt-4 max-w-2xl text-base leading-7 text-bone/62">{assessment.description}</p> : null}
          </div>
            </div>
          </div>
        )}
      {error ? <p className="mt-4 text-sm text-orange">{error}</p> : null}
      {assessment.status === "published" && !justPublished ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#020611]/[0.94] p-4 backdrop-blur-[64px]">
          <Card className="ritual-overlay-surface w-full max-w-md border">
            <h2 className="font-heading text-2xl font-semibold text-bone">{messages.builder.pauseToEditTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-bone/62">{messages.builder.pauseToEditBody}</p>
            <div className="mt-6 flex justify-end gap-3">
              <ButtonLink href="/dashboard" variant="ghost" className="min-h-11">
                {messages.builder.backToDashboard}
              </ButtonLink>
              <Button type="button" onClick={() => void pauseCollectionForEditing()} disabled={saving}>
                {saving ? messages.app.loading : messages.builder.pauseToEditConfirm}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/[0.94] p-4 backdrop-blur-[64px]">
          <Card className="ritual-overlay-surface w-full max-w-md border">
            <h2 className="font-heading text-2xl font-semibold text-bone">{messages.builder.deleteDraftTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-bone/62">{messages.builder.deleteDraftBody}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                {messages.common.cancel}
              </Button>
              <Button type="button" variant="danger" onClick={() => void deleteDraft()} disabled={deleting}>
                {deleting ? messages.app.loading : messages.builder.deleteDraft}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
      {activityPendingDeletion ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/[0.94] p-4 backdrop-blur-[64px]">
          <Card className="ritual-overlay-surface w-full max-w-md border">
            <h2 className="font-heading text-2xl font-semibold text-bone">{messages.builder.deleteActivityTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-bone/62">
              {(activityResponseCounts[activityPendingDeletion.id] ?? 0) > 0
                ? messages.builder.deleteActivityWithResponses.replace("{count}", String(activityResponseCounts[activityPendingDeletion.id]))
                : messages.builder.deleteActivityWithoutResponses}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setActivityPendingDeletion(null)} disabled={saving}>
                {messages.common.cancel}
              </Button>
              <Button type="button" variant="danger" onClick={() => removeActivity(activityPendingDeletion.id)} disabled={saving}>
                {messages.builder.deleteActivityConfirm}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      <div className={embedded ? "mt-5 sm:mt-7" : "mt-8"}>
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <LinkGenerator
              assessment={assessment}
              onPublish={(published) => {
                setJustPublished(true);
                setAssessment(published);
              }}
              onPublishedClose={() => {
                if (embedded) onDismiss?.();
                else router.replace("/dashboard");
              }}
              onPublishSuccess={onPublishSuccess ? (published) => void onPublishSuccess(published) : undefined}
              disabled={initialTemplateMode}
              compact
              className="w-full sm:order-2 sm:w-auto"
            />
            {isOwner ? (
              <div className="flex gap-2 sm:order-1">
                <Button
                  type="button"
                  variant={isTemplate ? "secondary" : "ghost"}
                  className="!min-h-10 flex-1 !px-3 text-xs sm:!min-h-11 sm:flex-none sm:!px-4 sm:text-sm"
                  onClick={() => updateTemplateMode(!isTemplate)}
                  disabled={saving || (assessment.status === "published" && !isTemplate)}
                  aria-pressed={isTemplate}
                >
                  {isTemplate ? messages.builder.template.saved : messages.builder.template.save}
                </Button>
                {assessment.status === "draft" ? (
                  <Button type="button" variant="danger" className="!min-h-10 flex-1 !px-3 text-xs sm:!min-h-11 sm:flex-none sm:!px-4 sm:text-sm" onClick={() => setDeleteOpen(true)} disabled={deleting}>
                    {messages.builder.deleteDraft}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          {assessment.status === "paused" ? (
            <p className="rounded-lg border border-mint/20 bg-mint/10 px-5 py-4 text-sm leading-6 text-bone/76">
              {messages.builder.collectionPausedNotice}
            </p>
          ) : null}
          <section className="space-y-5">
            <h2 className="font-heading text-2xl font-semibold text-bone">{messages.builder.assessmentDetails}</h2>
            <Field label={messages.builder.titleLabel}>
              <input className={inputClass} value={assessment.title} onChange={(event) => updateAssessment({ title: event.target.value })} />
            </Field>
            <Field label={messages.builder.descriptionLabel}>
              <textarea className={`${inputClass} min-h-28 resize-y`} value={assessment.description ?? ""} onChange={(event) => updateAssessment({ description: event.target.value })} />
            </Field>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2.5 py-1 text-sm font-semibold text-bone [&::-webkit-details-marker]:hidden">
                <ChevronRight size={16} className="shrink-0 text-bone/55 transition-transform group-open:rotate-90" aria-hidden="true" />
                {messages.builder.privacyDetailsTitle}
              </summary>
              <div className="pt-2">
                <p className="text-xs leading-4 text-bone/56">{messages.builder.privacyDetailsHelper}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label={messages.builder.dataControllerNameLabel}>
                    <input className={inputClass} value={assessment.dataControllerName ?? ""} onChange={(event) => updateAssessment({ dataControllerName: event.target.value })} />
                  </Field>
                  <Field label={messages.builder.dataControllerContactLabel}>
                    <input className={inputClass} type="email" value={assessment.dataControllerContact ?? ""} onChange={(event) => updateAssessment({ dataControllerContact: event.target.value })} />
                  </Field>
                </div>
              </div>
            </details>
            <div className="space-y-3">
              <label className="flex items-center gap-3 text-sm font-semibold text-bone/70">
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
            </div>
          </section>
          <section className="border-t border-bone/10 pt-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h2 className="font-heading text-2xl font-semibold text-bone">{messages.builder.assessmentFlow}</h2>
              </div>
            </div>
            <ActivityList
              activities={activities}
              selectedId={selectedActivityId}
              onSelect={setSelectedActivityId}
              onAdd={addActivity}
              onMove={moveActivity}
              onRemove={requestActivityRemoval}
              onUpdate={updateActivity}
              renderActivityEditor={(activity) => (
                <ActivityEditor activity={activity} activities={activities} onChange={updateActivity} embedded />
              )}
            />
          </section>
        </div>
      </div>
      </div>
    </BuilderFrame>
  );
}

function BuilderFrame({ children, embedded }: { children: React.ReactNode; embedded: boolean }) {
  return embedded ? <>{children}</> : <BuilderShell>{children}</BuilderShell>;
}
