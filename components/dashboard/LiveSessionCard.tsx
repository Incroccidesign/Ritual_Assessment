"use client";

import { useState } from "react";
import { CopyPlus, FileSpreadsheet, FileText, MoreHorizontal, RotateCcw, Settings2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink, Card } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { exportLiveDocx, exportLiveXlsx } from "@/lib/live/exports";
import { deleteLiveSession, duplicateLiveSession, fetchLiveSnapshot, recordLiveExport, restartLiveSession } from "@/lib/live/repository";
import type { LiveSession } from "@/types/live";

export function liveDashboardDestination(session: LiveSession) {
  if (session.status === "draft" || session.status === "setup") return `/live/setup?id=${session.id}`;
  if (session.status === "lobby") return `/live/lobby?id=${session.id}`;
  if (session.status === "closed") return `/live/results?id=${session.id}`;
  return `/live?id=${session.id}`;
}

export function LiveSessionCard({ session, onDelete }: { session: LiveSession; onDelete?: (sessionId: string) => void }) {
  const router = useRouter();
  const { locale, messages, href } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState<"docx" | "excel" | "duplicate" | "restart" | "delete" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const date = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(new Date(session.updated_at));
  const status = messages.liveSessions.statuses[session.status];
  const primaryLabel = messages.liveSessions.primary[session.status];
  const canManageActivities = ["draft", "setup", "lobby"].includes(session.status);
  const canAccessResults = ["live", "intermission", "closed"].includes(session.status);
  const reportLanguage = locale === "it" ? "it" : "en";

  async function download(kind: "docx" | "excel") {
    try {
      setBusy(kind);
      setNotice(null);
      const snapshot = await fetchLiveSnapshot(session.id);
      if (!snapshot) throw new Error(messages.liveSessions.notFound);
      if (kind === "docx") await exportLiveDocx(snapshot, reportLanguage);
      else await exportLiveXlsx(snapshot, reportLanguage);
      await recordLiveExport(session.id, kind);
      setMenuOpen(false);
    } catch {
      setNotice(messages.liveSessions.downloadError);
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    try {
      setBusy("delete");
      setNotice(null);
      await deleteLiveSession(session.id);
      onDelete?.(session.id);
    } catch {
      setNotice(messages.liveSessions.deleteError);
      setDeleteOpen(false);
    } finally {
      setBusy(null);
    }
  }

  async function duplicate() {
    try {
      setBusy("duplicate");
      setNotice(null);
      const duplicate = await duplicateLiveSession(session.id);
      router.push(href(`/live/setup?id=${encodeURIComponent(duplicate.id)}`));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : messages.liveSessions.duplicateError);
    } finally {
      setBusy(null);
    }
  }

  async function restart() {
    setBusy("restart"); setNotice(null);
    try {
      const status = await restartLiveSession(session);
      router.push(href(`${status === "lobby" ? "/live/lobby" : "/live"}?id=${encodeURIComponent(session.id)}`));
    } catch (error) { setNotice(error instanceof Error ? error.message : messages.liveSessions.restartError); }
    finally { setBusy(null); }
  }

  return <>
    <Card className="flex h-full flex-col space-y-5">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full border border-mint/20 bg-mint/10 px-3 py-1 text-sm font-medium text-mint">{messages.liveSessions.type}</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-bone/10 px-3 py-1 text-sm text-bone/60">{status}</span>
          <div className="relative">
            <Button type="button" variant="ghost" className="h-10 min-h-10 w-10 min-w-10 !p-0" aria-label={messages.liveSessions.settings} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
              <MoreHorizontal size={19} />
            </Button>
            {menuOpen ? <div role="menu" className="ritual-popover-surface absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-md border p-1">
              {canManageActivities ? <ButtonLink href={href(`/live/setup?id=${encodeURIComponent(session.id)}`)} variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left"><Settings2 size={16} /><span>{messages.liveSessions.manageActivities}</span></ButtonLink> : null}
              <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" disabled={busy !== null} onClick={() => void duplicate()}><CopyPlus size={16} /><span>{busy === "duplicate" ? messages.liveSessions.duplicating : messages.liveSessions.duplicate}</span></Button>
              {["live", "intermission", "closed"].includes(session.status) ? <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" disabled={busy !== null} onClick={() => void restart()}><RotateCcw size={16} /><span>{busy === "restart" ? messages.liveSessions.restarting : messages.liveSessions.restart}</span></Button> : null}
              {canAccessResults ? <><ButtonLink href={href(`/live/results?id=${encodeURIComponent(session.id)}`)} variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left"><FileText size={16} /><span>{messages.liveSessions.results}</span></ButtonLink>
              <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" disabled={busy !== null} onClick={() => void download("docx")}><FileText size={16} /><span>{busy === "docx" ? messages.liveSessions.preparing : messages.liveSessions.downloadWord}</span></Button>
              <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left" disabled={busy !== null} onClick={() => void download("excel")}><FileSpreadsheet size={16} /><span>{busy === "excel" ? messages.liveSessions.preparing : messages.liveSessions.downloadExcel}</span></Button></> : null}
              <div className="my-1 border-t border-bone/10" />
              <Button type="button" variant="ghost" className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 !justify-start px-3 text-left text-orange hover:text-orange" onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}><Trash2 size={16} /><span>{messages.liveSessions.delete}</span></Button>
            </div> : null}
          </div>
        </div>
      </div>
      <div><h2 className="line-clamp-2 font-heading text-2xl font-semibold text-bone">{session.title}</h2>{session.context_label ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-bone/62">{session.context_label}</p> : null}</div>
      <p className="text-xs text-bone/48">{messages.liveSessions.updated} {date}</p>
      <div className="mt-auto"><ButtonLink className="w-full" href={liveDashboardDestination(session)}>{primaryLabel}</ButtonLink></div>
      {notice ? <p className="text-sm text-orange">{notice}</p> : null}
    </Card>
    {deleteOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/[0.94] p-4 backdrop-blur-[64px]"><Card className="ritual-overlay-surface w-full max-w-md border"><h3 className="font-heading text-2xl font-semibold text-bone">{messages.liveSessions.deleteTitle}</h3><p className="mt-3 text-sm leading-6 text-bone/62">{messages.liveSessions.deleteBody}</p><div className="mt-6 flex justify-end gap-3"><Button type="button" variant="ghost" disabled={busy === "delete"} onClick={() => setDeleteOpen(false)}>{messages.common.cancel}</Button><Button type="button" variant="danger" disabled={busy === "delete"} onClick={() => void confirmDelete()}><Trash2 size={16} /> {busy === "delete" ? messages.liveSessions.deleting : messages.liveSessions.delete}</Button></div></Card></div> : null}
  </>;
}
