"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CopyPlus, MoreHorizontal, Pause, Pencil, RotateCcw, Square, Trash2 } from "lucide-react";
import { Assessment } from "@/types/assessment";
import { Designer } from "@/lib/auth/designerAuth";
import { Participant } from "@/types/participant";
import { AssessmentResponse } from "@/types/response";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ExportMenuButton } from "@/components/reports/ExportMenuButton";
import { GroupedActivityResults } from "@/components/reports/GroupedActivityResults";
import { AssessmentCollaborators } from "@/components/collaboration/AssessmentCollaborators";
import { Button, ButtonLink, Card } from "@/components/ritual-ui";
import { confirmSchedulingSlot, createSupabaseAssessmentFromExistingTemplate, deleteSupabaseAssessment, fetchAssessmentBundle, resetSupabaseAssessmentResults, setSupabaseAssessmentStatus } from "@/lib/supabase/assessmentRepository";
import { useLocale } from "@/lib/i18n/useLocale";
import { useDismissiblePopover } from "@/lib/ui/use-dismissible-popover";
import type { SchedulingActivity } from "@/types/activity";
import { schedulingVotes, slotLabel } from "@/lib/activities/scheduling";

export function ResultsDashboard({ assessmentId, designer }: { assessmentId: string; designer: Designer }) {
  const { locale, messages, href } = useLocale();
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<"idle" | "copied" | "error">("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [managerRole, setManagerRole] = useState<"owner" | "co_owner" | null>(null);
  const [confirmation, setConfirmation] = useState<"reset" | "pause" | "close" | "delete" | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [closeSlotId, setCloseSlotId] = useState<string | null>(null);
  useDismissiblePopover(menuOpen, menuRef, () => setMenuOpen(false));

  useEffect(() => {
    let active = true;
    async function refresh() {
      setLoading(true);
      setError(null);
      try {
        const bundle = await fetchAssessmentBundle(assessmentId, designer.id);
        if (!active) return;
        setAssessment(bundle?.assessment ?? null);
        setParticipants(bundle?.participants ?? []);
        setResponses(bundle?.responses ?? []);
      } catch (resultsError) {
        if (!active) return;
        setError(resultsError instanceof Error ? resultsError.message : messages.auth.signInError);
        setAssessment(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    void refresh();
    return () => {
      active = false;
    };
  }, [assessmentId, designer.id, messages.auth.signInError]);

  if (loading) {
    return (
      <DashboardShell designer={designer}>
        <Card><p className="text-bone/50">{messages.app.loading}</p></Card>
      </DashboardShell>
    );
  }

  if (!assessment) {
    return (
      <DashboardShell designer={designer}>
        <Card><p className={error ? "text-orange" : "text-bone/50"}>{error ?? messages.common.empty}</p></Card>
      </DashboardShell>
    );
  }

  const completedResponses = responses.filter((response) => response.status === "submitted");
  const completedParticipants = new Set(completedResponses.map((response) => response.participantId)).size;
  const activityCount = assessment.activities.filter((activity) => activity.type !== "planning_report").length;
  const scheduling = assessment.activities.find((activity): activity is SchedulingActivity => activity.type === "scheduling");
  const schedulingSummary = scheduling ? schedulingVotes(scheduling, responses).slice(0, 3) : [];

  async function copyParticipantLink() {
    if (!assessment?.publicToken) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href(`/participate/${assessment.publicToken}`)}`);
      setLinkState("copied");
    } catch {
      setLinkState("error");
    }
  }

  async function duplicateAssessment() {
    if (!assessment) return;
    setMenuOpen(false);
    setActionError(null);
    try {
      const duplicate = await createSupabaseAssessmentFromExistingTemplate(assessment);
      router.push(href(`/dashboard?setup=individual&assessment=${encodeURIComponent(duplicate.id)}`));
    } catch (duplicateError) {
      setActionError(duplicateError instanceof Error ? duplicateError.message : messages.auth.signInError);
    }
  }

  async function confirmAction() {
    if (!assessment || !confirmation) return;
    setActionBusy(true);
    setActionError(null);
    try {
      if (confirmation === "reset") {
        await resetSupabaseAssessmentResults(assessment.id);
        setParticipants([]);
        setResponses([]);
      } else if (confirmation === "pause" || confirmation === "close") {
        const nextStatus = confirmation === "pause" ? "paused" : "closed";
        const updated = await setSupabaseAssessmentStatus(assessment, nextStatus);
        if (confirmation === "close" && scheduling && closeSlotId) {
          await confirmSchedulingSlot(assessment.id, scheduling.id, closeSlotId);
        }
        setAssessment(updated);
      } else {
        await deleteSupabaseAssessment(assessment.id);
        router.push(href("/dashboard"));
        return;
      }
      setConfirmation(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : messages.auth.signInError);
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <DashboardShell designer={designer}>
      <Link href={href("/dashboard")} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-bone/65 transition hover:text-bone"><ArrowLeft size={16} aria-hidden="true" />{messages.reports.backToRituals}</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <p className="text-sm text-bone/55">{messages.reports.title} · {assessment.status === "published" ? messages.dashboard.published : assessment.status === "paused" ? messages.dashboard.paused : assessment.status === "closed" ? messages.dashboard.closed : messages.dashboard.draft}</p>
          <h1 className="mt-2 break-words font-heading text-2xl font-semibold leading-tight text-bone md:text-3xl">{assessment.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {assessment.status === "published" && assessment.publicToken ? <Button type="button" onClick={() => void copyParticipantLink()}>{linkState === "copied" ? messages.dashboard.linkCopied : messages.dashboard.copyLink}</Button> : null}
          <ExportMenuButton assessment={assessment} participants={participants} responses={responses} disabled={!responses.length} />
          <div ref={menuRef} className={`relative shrink-0 ${menuOpen ? "z-30" : "z-10"}`}>
            <Button type="button" variant="secondary" className="h-12 min-h-12 w-12 min-w-12 !p-0" aria-label={messages.dashboard.moreActions} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
              <MoreHorizontal size={20} />
            </Button>
            {menuOpen ? <div className="ritual-popover-surface absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-md border p-1">
              {assessment.status !== "draft" ? <ButtonLink href={href(`/dashboard?setup=individual&assessment=${encodeURIComponent(assessment.id)}`)} variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left"><Pencil size={16} /><span>{messages.dashboard.edit}</span></ButtonLink> : null}
              <AssessmentCollaborators assessmentId={assessment.id} onManagerRoleChange={setManagerRole} triggerVariant="ghost" triggerClassName="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" />
              <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" onClick={() => void duplicateAssessment()}><CopyPlus size={16} /><span>Duplicate</span></Button>
              {assessment.ownerId === designer.id && responses.length > 0 ? <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" onClick={() => { setMenuOpen(false); setConfirmation("reset"); }}><RotateCcw size={16} /><span>Reset results</span></Button> : null}
              {assessment.status === "published" ? <>
                <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" onClick={() => { setMenuOpen(false); setConfirmation("pause"); }}><Pause size={16} /><span>{messages.dashboard.pauseCollection}</span></Button>
                <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" onClick={() => { setMenuOpen(false); setConfirmation("close"); }}><Square size={16} /><span>{messages.dashboard.endCollection}</span></Button>
              </> : assessment.status === "paused" ? <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" onClick={() => { setMenuOpen(false); setConfirmation("close"); }}><Square size={16} /><span>{messages.dashboard.endCollection}</span></Button> : null}
              {assessment.ownerId === designer.id || managerRole ? <><div className="my-1 border-t border-bone/10" /><Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left text-orange hover:text-orange" onClick={() => { setMenuOpen(false); setConfirmation("delete"); }}><Trash2 size={16} /><span>{messages.dashboard.delete}</span></Button></> : null}
            </div> : null}
          </div>
        </div>
      </div>
      {linkState === "error" && assessment.publicToken ? <p className="mt-3 break-all text-sm text-bone/65" role="status">{messages.reports.copyLinkError} <a className="underline" href={href(`/participate/${assessment.publicToken}`)}>{href(`/participate/${assessment.publicToken}`)}</a></p> : null}
      {actionError ? <p className="mt-3 text-sm text-orange" role="alert">{actionError}</p> : null}
      {confirmation ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/[0.94] p-4 backdrop-blur-[64px]"><Card className="ritual-overlay-surface w-full max-w-md border">
        <h2 className="font-heading text-2xl font-semibold text-bone">{confirmation === "reset" ? "Reset results?" : confirmation === "pause" ? messages.dashboard.pauseTitle : confirmation === "close" ? messages.dashboard.closeTitle : messages.dashboard.deleteTitle}</h2>
        <p className="mt-3 text-sm leading-6 text-bone/62">{confirmation === "reset" ? `This permanently deletes ${responses.length} ${responses.length === 1 ? "response" : "responses"} and all participant records for this ritual. The ritual and its link stay unchanged, so it can receive new responses immediately.` : confirmation === "pause" ? messages.dashboard.pauseBody : confirmation === "close" ? messages.dashboard.closeBody : messages.dashboard.deleteBody}</p>
        {confirmation === "close" && scheduling ? <div className="mt-5 space-y-2 border-t border-bone/10 pt-4"><p className="text-sm font-semibold text-bone">Availability</p>{schedulingSummary.map(({ slot, count, percentage }) => <label key={slot.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-bone/10 px-3 py-2 text-sm"><span className="flex items-center gap-2"><input type="radio" name={`confirm-date-${assessment.id}`} checked={closeSlotId === slot.id} onChange={() => setCloseSlotId(slot.id)} />{slotLabel(slot, locale, scheduling.timezone)}</span><span className="text-bone/55">{count} · {percentage}%</span></label>)}<p className="text-xs text-bone/48">Optionally select a date to confirm it when closing.</p></div> : null}
        {actionError ? <p className="mt-4 text-sm text-orange" role="alert">{actionError}</p> : null}
        <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setConfirmation(null)} disabled={actionBusy}>{messages.common.cancel}</Button><Button type="button" variant={confirmation === "delete" || confirmation === "reset" ? "danger" : "secondary"} onClick={() => void confirmAction()} disabled={actionBusy}>{actionBusy ? messages.app.loading : confirmation === "reset" ? "Reset results" : confirmation === "pause" ? messages.dashboard.pauseConfirm : confirmation === "close" ? messages.dashboard.closeConfirm : messages.dashboard.delete}</Button></div>
      </Card></div> : null}
      <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-bone/10 py-5 sm:gap-8">
        {[[messages.reports.completedLabel, completedResponses.length], [messages.reports.completedParticipants, completedParticipants], [messages.reports.activitiesLabel, activityCount]].map(([label, value]) => <div key={label}><dt className="text-xs leading-5 text-bone/55 sm:text-sm">{label}</dt><dd className="mt-1 font-heading text-2xl font-semibold text-bone sm:text-3xl">{value}</dd></div>)}
      </dl>
      <div className="mt-6"><GroupedActivityResults assessment={assessment} participants={participants} responses={responses} /></div>
    </DashboardShell>
  );
}
