"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CopyPlus, FileText, MoreHorizontal, Pause, Pencil, RotateCcw, Square, Star, Trash2 } from "lucide-react";
import { Assessment } from "@/types/assessment";
import { SchedulingActivity } from "@/types/activity";
import { AssessmentResponse } from "@/types/response";
import { AssessmentCollaborators } from "@/components/collaboration/AssessmentCollaborators";
import { Button, ButtonLink, Card } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { useDismissiblePopover } from "@/lib/ui/use-dismissible-popover";
import { confirmSchedulingSlot, deleteSupabaseAssessment, fetchAssessmentResponses, publishSupabaseAssessment, resetSupabaseAssessmentResults, setSupabaseAssessmentStatus } from "@/lib/supabase/assessmentRepository";
import { schedulingVotes, slotLabel } from "@/lib/activities/scheduling";
import { ActivityThumbnails } from "@/components/dashboard/ActivityThumbnails";
import type { ActivityType } from "@/types/activity";

const activityIllustrations: Record<ActivityType, string> = {
  profiling: "Profiling", exploration: "Explore", prioritization: "Prioritize",
  framing: "Reflect", scheduling: "Plan", planning_report: "Planning-report"
};

export function AssessmentManagementCard({
  assessment,
  responses,
  currentUserId,
  onDelete,
  onUpdate,
  onDuplicate,
  onResetResults,
  favorite = false,
  responseCount = 0,
  onToggleFavorite
}: {
  assessment: Assessment;
  responses: AssessmentResponse[];
  currentUserId: string;
  onDelete?: (assessmentId: string) => void;
  onUpdate?: (assessment: Assessment) => void;
  onDuplicate?: (assessment: Assessment) => void;
  onResetResults?: (assessmentId: string) => void;
  favorite?: boolean;
  responseCount?: number;
  onToggleFavorite?: (assessment: Assessment) => void;
}) {
  const { locale, messages, href } = useLocale();
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [statusAction, setStatusAction] = useState<"pause" | "close" | null>(null);
  const [closeSlotId, setCloseSlotId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [managerRole, setManagerRole] = useState<"owner" | "co_owner" | null>(null);
  const [closeResponses, setCloseResponses] = useState(responses);
  const [loadingCloseResponses, setLoadingCloseResponses] = useState(false);
  useDismissiblePopover(menuOpen, menuRef, () => setMenuOpen(false));
  const scheduling = assessment.activities.find((activity): activity is SchedulingActivity => activity.type === "scheduling");
  const schedulingSummary = scheduling ? schedulingVotes(scheduling, closeResponses).slice(0, 3) : [];
  function statusLabel() {
    if (assessment.status === "draft") return messages.dashboard.draft;
    if (assessment.status === "published") return messages.dashboard.published;
    if (assessment.status === "paused") return messages.dashboard.paused;
    return messages.dashboard.closed;
  }

  function dateLabel() {
    const formattedDate = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(new Date(assessment.updatedAt));
    return `${messages.dashboard.updatedDate} ${formattedDate}`;
  }

  async function copyPublicLink() {
    if (!assessment.publicToken) {
      setNotice(messages.dashboard.publishToGenerateLink);
      return;
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href(`/participate/${assessment.publicToken}`)}`);
      setNotice(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setNotice(messages.reports.copyLinkError);
    }
  }

  async function publishAssessment() {
    try {
      setPublishing(true);
      setNotice(null);
      const published = await publishSupabaseAssessment(assessment);
      onUpdate?.(published);
      window.dispatchEvent(new Event("ritual-assessment-storage"));
    } catch {
      setNotice(messages.auth.signInError);
    } finally {
      setPublishing(false);
    }
  }

  async function updateCollectionStatus(status: "paused" | "closed") {
    try {
      setPublishing(true);
      setNotice(null);
      const updated = await setSupabaseAssessmentStatus(assessment, status);
      if (status === "closed" && scheduling && closeSlotId) await confirmSchedulingSlot(assessment.id, scheduling.id, closeSlotId);
      onUpdate?.(updated);
      window.dispatchEvent(new Event("ritual-assessment-storage"));
    } catch {
      setNotice(messages.auth.signInError);
    } finally {
      setPublishing(false);
      setStatusAction(null);
    }
  }

  async function openCloseDialog() {
    setMenuOpen(false);
    setStatusAction("close");
    if (!scheduling || closeResponses.length || loadingCloseResponses) return;
    try {
      setLoadingCloseResponses(true);
      setCloseResponses(await fetchAssessmentResponses(assessment.id));
    } catch {
      setNotice(messages.auth.signInError);
    } finally {
      setLoadingCloseResponses(false);
    }
  }

  async function confirmDelete() {
    try {
      setDeleting(true);
      setNotice(null);
      await deleteSupabaseAssessment(assessment.id);
      onDelete?.(assessment.id);
    } catch {
      setNotice(messages.dashboard.deleteError);
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function confirmResetResults() {
    try {
      setResetting(true);
      setNotice(null);
      await resetSupabaseAssessmentResults(assessment.id);
      onResetResults?.(assessment.id);
      setResetOpen(false);
    } catch {
      setNotice("Unable to reset results. Please try again.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <Card className={`dashboard-card-hover-target relative flex min-h-[208px] h-full flex-col !p-6 !shadow-none ${assessment.status === "draft" ? "dashboard-card-individual-draft" : "dashboard-card-individual"}`}>
      <div className="flex h-6 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-medium text-bone">Individual</span>
          <span aria-hidden="true" className="text-sm text-bone/70">•</span>
          <span className="truncate text-sm text-bone">{statusLabel()}</span>
          {onToggleFavorite ? <button type="button" aria-label={favorite ? "Remove from favorites" : "Add to favorites"} title={favorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={favorite} onClick={() => onToggleFavorite(assessment)} className="relative z-20 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-bone/75 transition hover:text-bone focus:outline-none focus:ring-2 focus:ring-bone/60"><Star size={18} fill={favorite ? "currentColor" : "none"} /></button> : null}
        </div>
        <div className={`relative shrink-0 ${menuOpen ? "z-30" : "z-10"}`}>
          <div ref={menuRef} className="relative">
          <Button
            type="button"
            variant="ghost"
            className="h-10 min-h-10 w-10 min-w-10 !p-0"
            aria-label={messages.dashboard.moreActions}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal size={19} />
          </Button>
          {menuOpen ? (
            <div className="ritual-popover-surface absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-md border p-1">
              {assessment.status !== "draft" ? (
                <ButtonLink href={href(`/dashboard?setup=individual&assessment=${encodeURIComponent(assessment.id)}`)} variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left">
                  <Pencil size={16} /> <span>{messages.dashboard.edit}</span>
                </ButtonLink>
              ) : null}
              <AssessmentCollaborators
                assessmentId={assessment.id}
                onManagerRoleChange={setManagerRole}
                triggerVariant="ghost"
                triggerClassName="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left"
              />
              <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" onClick={() => { setMenuOpen(false); onDuplicate?.(assessment); }}>
                <CopyPlus size={16} /> <span>Duplicate</span>
              </Button>
              <ButtonLink href={href(`/assessments/${assessment.id}/results`)} variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left">
                <FileText size={16} /> <span>{messages.dashboard.viewResults}</span>
              </ButtonLink>
              {assessment.ownerId === currentUserId && responseCount > 0 ? (
                <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" onClick={() => { setMenuOpen(false); setResetOpen(true); }}>
                  <RotateCcw size={16} /> <span>Reset results</span>
                </Button>
              ) : null}
              {assessment.status === "published" ? (
                <>
                  <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" onClick={() => { setMenuOpen(false); setStatusAction("pause"); }}>
                    <Pause size={16} /> <span>{messages.dashboard.pauseCollection}</span>
                  </Button>
                  <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" onClick={() => void openCloseDialog()}>
                    <Square size={16} /> <span>{messages.dashboard.endCollection}</span>
                  </Button>
                </>
              ) : assessment.status === "paused" ? (
                <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" onClick={() => void openCloseDialog()}>
                  <Square size={16} /> <span>{messages.dashboard.endCollection}</span>
                </Button>
              ) : null}
              {assessment.ownerId === currentUserId || managerRole ? (
                <>
                  <div className="my-1 border-t border-bone/10" />
                  <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left text-orange hover:text-orange" onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}>
                    <Trash2 size={16} /> <span>{messages.dashboard.delete}</span>
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between pt-0">
        <div>
          <p className="text-xs leading-4 text-bone/60">{dateLabel()}</p>
          <h2 className="mt-2 font-heading text-xl font-semibold leading-6 text-bone"><Link title={assessment.title} href={href(assessment.status === "draft" ? `/dashboard?setup=individual&assessment=${encodeURIComponent(assessment.id)}` : `/assessments/${assessment.id}/results`)} prefetch={false} className="after:absolute after:inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"><span className="line-clamp-2">{assessment.title}</span></Link></h2>
          <ActivityThumbnails activities={[...assessment.activities].sort((a, b) => a.orderIndex - b.orderIndex).map((activity) => ({
            id: activity.id,
            illustration: activityIllustrations[activity.type],
            label: activity.title.trim() || messages.activities[activity.type].label
          }))} />
        </div>
        <div className="pointer-events-none relative z-10 flex justify-end pt-0">
        {assessment.status === "draft" ? (
          <Button type="button" variant="ghost" className="pointer-events-auto dashboard-card-cta !min-h-8 !h-8 !px-3" onClick={() => void publishAssessment()} disabled={publishing}>
            {publishing ? messages.app.loading : "Publish"}
          </Button>
        ) : assessment.status === "published" ? (
          <div className="pointer-events-auto flex items-center gap-2">
            {assessment.publicToken ? <button type="button" aria-label={copied ? messages.dashboard.linkCopied : messages.dashboard.copyLink} title={copied ? messages.dashboard.linkCopied : messages.dashboard.copyLink} className="dashboard-card-hover-reveal dashboard-card-copy-link" onClick={() => void copyPublicLink()}>
              <Image src="/icons/dashboard-copy-participant-link.svg" alt="" aria-hidden="true" width={16} height={16} className="size-4" />
            </button> : null}
            <span className="text-sm font-medium text-bone">{responseCount} responses</span>
            {copied ? <span className="sr-only" role="status">{messages.dashboard.linkCopied}</span> : null}
          </div>
        ) : (
          <Button type="button" variant="ghost" className="pointer-events-auto dashboard-card-cta !min-h-8 !h-8 !px-3" onClick={() => void publishAssessment()} disabled={publishing}>
            {publishing ? messages.app.loading : assessment.status === "closed" ? messages.dashboard.reopenCollection : messages.dashboard.resumeCollection}
          </Button>
        )}
        </div>
      </div>

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/[0.94] p-4 backdrop-blur-[64px]">
          <Card className="ritual-overlay-surface w-full max-w-md border">
            <h3 className="font-heading text-2xl font-semibold text-bone">{messages.dashboard.deleteTitle}</h3>
            <p className="mt-3 text-sm leading-6 text-bone/62">{messages.dashboard.deleteBody}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                {messages.common.cancel}
              </Button>
              <Button type="button" variant="danger" onClick={() => void confirmDelete()} disabled={deleting}>
                {messages.dashboard.delete}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {resetOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/[0.94] p-4 backdrop-blur-[64px]">
          <Card className="ritual-overlay-surface w-full max-w-md border">
            <h3 className="font-heading text-2xl font-semibold text-bone">Reset results?</h3>
            <p className="mt-3 text-sm leading-6 text-bone/62">
              This permanently deletes {responseCount} {responseCount === 1 ? "response" : "responses"} and all participant records for this ritual. The ritual and its link stay unchanged, so it can receive new responses immediately.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setResetOpen(false)} disabled={resetting}>
                {messages.common.cancel}
              </Button>
              <Button type="button" variant="danger" onClick={() => void confirmResetResults()} disabled={resetting}>
                {resetting ? messages.app.loading : "Reset results"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {statusAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/[0.94] p-4 backdrop-blur-[64px]">
          <Card className="ritual-overlay-surface w-full max-w-md border">
            <h3 className="font-heading text-2xl font-semibold text-bone">
              {statusAction === "pause" ? messages.dashboard.pauseTitle : messages.dashboard.closeTitle}
            </h3>
            <p className="mt-3 text-sm leading-6 text-bone/62">
              {statusAction === "pause" ? messages.dashboard.pauseBody : messages.dashboard.closeBody}
            </p>
            {statusAction === "close" && scheduling ? <div className="mt-5 space-y-2 border-t border-bone/10 pt-4"><p className="text-sm font-semibold text-bone">Availability ({closeResponses.filter((response) => response.activityResponses.some((item) => item.activityId === scheduling.id && "slotIds" in item.answer)).length} respondents)</p>{loadingCloseResponses ? <p className="text-sm text-bone/55">{messages.app.loading}</p> : schedulingSummary.map(({ slot, count, percentage }) => <label key={slot.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-bone/10 px-3 py-2 text-sm"><span className="flex items-center gap-2"><input type="radio" name={`confirm-date-${assessment.id}`} checked={closeSlotId === slot.id} onChange={() => setCloseSlotId(slot.id)} />{slotLabel(slot, locale, scheduling.timezone)}</span><span className="text-bone/55">{count} · {percentage}%</span></label>)}<p className="text-xs text-bone/48">Optionally select a date to confirm it when closing.</p></div> : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setStatusAction(null)} disabled={publishing}>
                {messages.common.cancel}
              </Button>
              <Button type="button" variant="secondary" onClick={() => void updateCollectionStatus(statusAction === "pause" ? "paused" : "closed")} disabled={publishing}>
                {statusAction === "pause" ? messages.dashboard.pauseConfirm : messages.dashboard.closeConfirm}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {notice ? <p className="text-sm text-orange">{notice}</p> : null}
    </Card>
  );
}
