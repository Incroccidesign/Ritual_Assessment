"use client";

import { useState } from "react";
import { FileText, MoreHorizontal, Pause, Pencil, Square, Trash2 } from "lucide-react";
import { Assessment } from "@/types/assessment";
import { AssessmentResponse } from "@/types/response";
import { AssessmentCollaborators } from "@/components/collaboration/AssessmentCollaborators";
import { Button, ButtonLink, Card } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { deleteSupabaseAssessment, publishSupabaseAssessment, setSupabaseAssessmentStatus } from "@/lib/supabase/assessmentRepository";

export function AssessmentManagementCard({
  assessment,
  onDelete,
  onUpdate
}: {
  assessment: Assessment;
  responses: AssessmentResponse[];
  onDelete?: (assessmentId: string) => void;
  onUpdate?: (assessment: Assessment) => void;
}) {
  const { locale, messages, href } = useLocale();
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [statusAction, setStatusAction] = useState<"pause" | "close" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [managerRole, setManagerRole] = useState<"owner" | "co_owner" | null>(null);
  function statusLabel() {
    if (assessment.status === "draft") return messages.dashboard.draft;
    if (assessment.status === "published") return messages.dashboard.published;
    if (assessment.status === "paused") return messages.dashboard.paused;
    return messages.dashboard.closed;
  }

  function statusClassName() {
    if (assessment.status === "published") return "border-mint/20 text-bone";
    if (assessment.status === "paused") return "border-orange/25 text-bone";
    if (assessment.status === "closed") return "border-violet/25 text-bone";
    return "border-blue/20 text-bone";
  }

  function statusIndicatorClassName() {
    if (assessment.status === "published") return "bg-mint";
    if (assessment.status === "paused") return "bg-orange";
    if (assessment.status === "closed") return "bg-violet";
    return "bg-blue";
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
    await navigator.clipboard.writeText(`${window.location.origin}${href(`/participate/${assessment.publicToken}`)}`);
    setNotice(null);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
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
      onUpdate?.(updated);
      window.dispatchEvent(new Event("ritual-assessment-storage"));
    } catch {
      setNotice(messages.auth.signInError);
    } finally {
      setPublishing(false);
      setStatusAction(null);
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

  return (
    <Card className="flex min-h-[224px] h-full flex-col !p-6 !shadow-none">
      <AssessmentCollaborators assessmentId={assessment.id} onManagerRoleChange={setManagerRole} loadOnly />
      <div className="flex h-8 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-bone">Assessment</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm leading-5 ${statusClassName()}`}><span className={`size-2 rounded-full ${statusIndicatorClassName()}`} />{statusLabel()}</span>
        </div>
        <div className="shrink-0">
          <div className="relative">
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
                <ButtonLink href={href(`/assessments/${assessment.id}/builder`)} variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left">
                  <Pencil size={16} /> <span>{messages.dashboard.edit}</span>
                </ButtonLink>
              ) : null}
              <AssessmentCollaborators
                assessmentId={assessment.id}
                onManagerRoleChange={setManagerRole}
                triggerVariant="ghost"
                triggerClassName="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left"
              />
              <ButtonLink href={href(`/assessments/${assessment.id}/results`)} variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left">
                <FileText size={16} /> <span>{messages.dashboard.viewResults}</span>
              </ButtonLink>
              {assessment.status === "published" ? (
                <>
                  <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" onClick={() => { setMenuOpen(false); setStatusAction("pause"); }}>
                    <Pause size={16} /> <span>{messages.dashboard.pauseCollection}</span>
                  </Button>
                  <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" onClick={() => { setMenuOpen(false); setStatusAction("close"); }}>
                    <Square size={16} /> <span>{messages.dashboard.endCollection}</span>
                  </Button>
                </>
              ) : assessment.status === "paused" ? (
                <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" onClick={() => { setMenuOpen(false); setStatusAction("close"); }}>
                  <Square size={16} /> <span>{messages.dashboard.endCollection}</span>
                </Button>
              ) : null}
              {managerRole ? (
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

      <div className="flex flex-1 flex-col justify-between pt-4">
        <div>
          <h2 className="line-clamp-2 font-heading text-2xl font-semibold leading-[30px] text-bone">{assessment.title}</h2>
          <p className="mt-2 text-xs leading-4 text-bone/60">{dateLabel()}</p>
        </div>
        <div className="flex justify-end pt-4">
        {assessment.status === "draft" ? (
          <ButtonLink href={href(`/assessments/${assessment.id}/builder`)} variant="ghost" className="dashboard-card-cta !min-h-11 !px-3">
            {messages.dashboard.continueBuilding}
          </ButtonLink>
        ) : assessment.status === "published" ? (
          <Button type="button" variant="ghost" className="dashboard-card-cta !min-h-11 !px-3" onClick={() => void copyPublicLink()}>
            {copied ? messages.dashboard.linkCopied : messages.dashboard.copyLink}
          </Button>
        ) : (
          <Button type="button" variant="ghost" className="dashboard-card-cta !min-h-11 !px-3" onClick={() => void publishAssessment()} disabled={publishing}>
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

      {statusAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/[0.94] p-4 backdrop-blur-[64px]">
          <Card className="ritual-overlay-surface w-full max-w-md border">
            <h3 className="font-heading text-2xl font-semibold text-bone">
              {statusAction === "pause" ? messages.dashboard.pauseTitle : messages.dashboard.closeTitle}
            </h3>
            <p className="mt-3 text-sm leading-6 text-bone/62">
              {statusAction === "pause" ? messages.dashboard.pauseBody : messages.dashboard.closeBody}
            </p>
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
