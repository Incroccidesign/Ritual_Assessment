"use client";

import { useState } from "react";
import { Copy, MoreHorizontal, Pause, Play, Square, Trash2 } from "lucide-react";
import { Assessment } from "@/types/assessment";
import { AssessmentResponse } from "@/types/response";
import { AssessmentCollaborators } from "@/components/collaboration/AssessmentCollaborators";
import { Button, ButtonLink, Card } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { deleteSupabaseAssessment, publishSupabaseAssessment, setSupabaseAssessmentStatus } from "@/lib/supabase/assessmentRepository";

export function AssessmentManagementCard({
  assessment,
  responses,
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
  const submittedResponses = responses.filter((response) => response.status === "submitted").length;
  function responseCountLabel() {
    if (submittedResponses === 0) return messages.dashboard.noResponsesYet;
    if (submittedResponses === 1) return `1 ${messages.dashboard.response}`;
    return `${submittedResponses} ${messages.dashboard.responses}`;
  }

  function statusLabel() {
    if (assessment.status === "draft") return messages.dashboard.draft;
    if (assessment.status === "published") return messages.dashboard.published;
    if (assessment.status === "paused") return messages.dashboard.paused;
    return messages.dashboard.closed;
  }

  function statusClassName() {
    if (assessment.status === "published") return "border-mint/20 bg-mint/10 text-mint";
    if (assessment.status === "paused") return "border-orange/25 bg-orange/10 text-orange";
    if (assessment.status === "closed") return "border-violet/25 bg-violet/10 text-violet";
    return "border-bone/10 bg-night/50 text-bone/62";
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
    <Card className="flex h-full flex-col space-y-5">
      <div className="flex items-start justify-between gap-4">
        <span className={`rounded-full border px-3 py-1 text-sm ${statusClassName()}`}>
          {statusLabel()}
        </span>
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
            <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-md border border-bone/15 bg-[#171A20] p-1 shadow-live">
              {assessment.status !== "draft" ? (
                <ButtonLink href={href(`/assessments/${assessment.id}/builder`)} variant="ghost" className="w-full justify-start px-3">
                  {messages.dashboard.edit}
                </ButtonLink>
              ) : null}
              {assessment.status === "published" ? (
                <>
                  <Button type="button" variant="ghost" className="w-full justify-start px-3" onClick={() => { setMenuOpen(false); setStatusAction("pause"); }}>
                    <Pause size={16} /> {messages.dashboard.pauseCollection}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full justify-start px-3" onClick={() => { setMenuOpen(false); setStatusAction("close"); }}>
                    <Square size={16} /> {messages.dashboard.endCollection}
                  </Button>
                </>
              ) : assessment.status === "paused" ? (
                <Button type="button" variant="ghost" className="w-full justify-start px-3" onClick={() => { setMenuOpen(false); setStatusAction("close"); }}>
                  <Square size={16} /> {messages.dashboard.endCollection}
                </Button>
              ) : null}
              {managerRole ? (
                <>
                  <div className="my-1 border-t border-bone/10" />
                  <Button type="button" variant="ghost" className="w-full justify-start px-3 text-orange hover:text-orange" onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}>
                    <Trash2 size={16} /> {messages.dashboard.delete}
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <h2 className="line-clamp-2 font-heading text-2xl font-semibold leading-tight text-bone">{assessment.title}</h2>
        {assessment.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-bone/62">{assessment.description}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-bone/48">{dateLabel()}</span>
        <span className="text-bone/25" aria-hidden="true">·</span>
        <span className="text-mint">{responseCountLabel()}</span>
      </div>

      <div className="mt-auto space-y-3 pt-1">
        {assessment.status === "draft" ? (
          <ButtonLink href={href(`/assessments/${assessment.id}/builder`)} className="w-full">
            {messages.dashboard.continueBuilding}
          </ButtonLink>
        ) : assessment.status === "published" ? (
          <Button type="button" className="w-full" onClick={() => void copyPublicLink()}>
            <Copy size={16} /> {copied ? messages.dashboard.linkCopied : messages.dashboard.copyLink}
          </Button>
        ) : (
          <Button type="button" className="w-full" onClick={() => void publishAssessment()} disabled={publishing}>
            <Play size={16} /> {publishing ? messages.app.loading : assessment.status === "closed" ? messages.dashboard.reopenCollection : messages.dashboard.resumeCollection}
          </Button>
        )}
        <div className="grid grid-cols-2 gap-3 [&>button]:w-full">
          <AssessmentCollaborators assessmentId={assessment.id} onManagerRoleChange={setManagerRole} />
          <ButtonLink href={href(`/assessments/${assessment.id}/results`)} variant="secondary" className={managerRole ? "w-full" : "col-span-2 w-full"}>
            {messages.dashboard.viewResults}
          </ButtonLink>
        </div>
      </div>

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/[0.94] p-4 backdrop-blur-[64px]">
          <Card className="w-full max-w-md border-bone/15 bg-[#10131a]">
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
          <Card className="w-full max-w-md border-bone/15 bg-[#10131a]">
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
