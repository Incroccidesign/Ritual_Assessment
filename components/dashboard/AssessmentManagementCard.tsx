"use client";

import { useMemo, useState } from "react";
import { Copy, ExternalLink, Pause, Play, Square, Trash2 } from "lucide-react";
import { Assessment } from "@/types/assessment";
import { Participant } from "@/types/participant";
import { AssessmentResponse } from "@/types/response";
import { ExportMenuButton } from "@/components/reports/ExportMenuButton";
import { GroupedActivityResults } from "@/components/reports/GroupedActivityResults";
import { AssessmentCollaborators } from "@/components/collaboration/AssessmentCollaborators";
import { Button, ButtonLink, Card } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { deleteSupabaseAssessment, publishSupabaseAssessment, setSupabaseAssessmentStatus } from "@/lib/supabase/assessmentRepository";

export function AssessmentManagementCard({
  assessment,
  participants,
  responses,
  onDelete,
  onUpdate
}: {
  assessment: Assessment;
  participants: Participant[];
  responses: AssessmentResponse[];
  onDelete?: (assessmentId: string) => void;
  onUpdate?: (assessment: Assessment) => void;
}) {
  const { locale, messages, href } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [statusAction, setStatusAction] = useState<"pause" | "close" | null>(null);
  const [managerRole, setManagerRole] = useState<"owner" | "co_owner" | null>(null);
  const submittedResponses = responses.filter((response) => response.status === "submitted").length;
  const publicLink = useMemo(() => {
    if (!assessment.publicToken || typeof window === "undefined") return "";
    return `${window.location.origin}${href(`/participate/${assessment.publicToken}`)}`;
  }, [assessment.publicToken, href]);

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

  function dateLabel() {
    const dateValue = assessment.status === "published" && assessment.publishedAt ? assessment.publishedAt : assessment.createdAt;
    const prefix = assessment.status === "published" && assessment.publishedAt ? messages.dashboard.publishedDate : messages.dashboard.createdDate;
    const formattedDate = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(new Date(dateValue));
    return `${prefix} ${formattedDate}`;
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
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-semibold leading-tight text-bone">{assessment.title}</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border border-bone/10 bg-night/50 px-3 py-1 text-bone/62">
              {statusLabel()}
            </span>
            <span className="rounded-full border border-bone/10 bg-night/50 px-3 py-1 text-bone/48">
              {dateLabel()}
            </span>
            <span className="rounded-full border border-mint/20 bg-mint/10 px-3 py-1 text-mint">
              {responseCountLabel()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={href(`/assessments/${assessment.id}/builder`)} variant="secondary">
          {messages.dashboard.edit} <ExternalLink size={16} />
        </ButtonLink>
        {assessment.publicToken ? (
          <Button type="button" variant="secondary" onClick={() => void copyPublicLink()}>
            <Copy size={16} /> {copied ? messages.dashboard.linkCopied : messages.dashboard.copyLink}
          </Button>
        ) : (
          <Button type="button" onClick={() => void publishAssessment()} disabled={publishing}>
            {publishing ? messages.app.loading : messages.common.publish}
          </Button>
        )}
        {assessment.status === "published" ? (
          <>
            <Button type="button" variant="secondary" onClick={() => setStatusAction("pause")} disabled={publishing}>
              <Pause size={16} /> {messages.dashboard.pauseCollection}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setStatusAction("close")} disabled={publishing}>
              <Square size={16} /> {messages.dashboard.endCollection}
            </Button>
          </>
        ) : assessment.status === "paused" || assessment.status === "closed" ? (
          <>
            <Button type="button" onClick={() => void publishAssessment()} disabled={publishing}>
              <Play size={16} /> {publishing ? messages.app.loading : assessment.status === "closed" ? messages.dashboard.reopenCollection : messages.dashboard.resumeCollection}
            </Button>
            {assessment.status === "paused" ? (
              <Button type="button" variant="secondary" onClick={() => setStatusAction("close")} disabled={publishing}>
                <Square size={16} /> {messages.dashboard.endCollection}
              </Button>
            ) : null}
          </>
        ) : null}
        <ExportMenuButton assessment={assessment} participants={participants} responses={responses} disabled={!responses.length} />
        <AssessmentCollaborators assessmentId={assessment.id} onManagerRoleChange={setManagerRole} />
        {managerRole ? (
          <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={16} /> {messages.dashboard.delete}
          </Button>
        ) : null}
        {!expanded ? (
          <Button type="button" variant="ghost" onClick={() => setExpanded(true)}>
            {messages.dashboard.viewResults}
          </Button>
        ) : null}
      </div>

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/[0.92] p-4 backdrop-blur-2xl">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/[0.92] p-4 backdrop-blur-2xl">
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

      {assessment.publicToken && publicLink ? <p className="break-all text-xs text-bone/38">{publicLink}</p> : null}
      {notice ? <p className="text-sm text-orange">{notice}</p> : null}

      {expanded ? (
        <div className="border-t border-bone/10 pt-6">
          <GroupedActivityResults
            assessment={assessment}
            participants={participants}
            responses={responses}
            exportActions={
              <div className="flex flex-wrap gap-3">
                <ExportMenuButton assessment={assessment} participants={participants} responses={responses} disabled={!responses.length} />
              </div>
            }
          />
          <div className="mt-6">
            <Button type="button" variant="ghost" onClick={() => setExpanded(false)}>
              {messages.dashboard.hideResults}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
