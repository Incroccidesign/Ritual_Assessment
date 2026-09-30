"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, MoreHorizontal, Settings2, Trash2 } from "lucide-react";
import { Button, ButtonLink, Card } from "@/components/ritual-ui";
import { exportLiveDocx, exportLiveXlsx } from "@/lib/live/exports";
import { deleteLiveSession, fetchLiveSnapshot, recordLiveExport } from "@/lib/live/repository";
import type { LiveSession } from "@/types/live";

export function liveDashboardDestination(session: LiveSession) {
  if (session.status === "draft" || session.status === "setup") return `/live/setup?id=${session.id}`;
  if (session.status === "lobby") return `/live/lobby?id=${session.id}`;
  if (session.status === "closed") return `/live/results?id=${session.id}`;
  return `/live?id=${session.id}`;
}

export function LiveSessionCard({ session, onDelete }: { session: LiveSession; onDelete?: (sessionId: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState<"docx" | "excel" | "delete" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const date = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(session.updated_at));
  const status = session.status === "lobby" ? "ready" : session.status;
  const canManageActivities = ["draft", "setup", "lobby"].includes(session.status);

  async function download(kind: "docx" | "excel") {
    try {
      setBusy(kind);
      setNotice(null);
      const snapshot = await fetchLiveSnapshot(session.id);
      if (!snapshot) throw new Error("Live Session not found.");
      if (kind === "docx") await exportLiveDocx(snapshot);
      else await exportLiveXlsx(snapshot);
      await recordLiveExport(session.id, kind);
      setMenuOpen(false);
    } catch {
      setNotice("Unable to download this report.");
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
      setNotice("Only the owner or a co-owner can delete this Live Session.");
      setDeleteOpen(false);
    } finally {
      setBusy(null);
    }
  }

  return <>
    <Card className="flex h-full flex-col space-y-5">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full border border-bone/15 bg-night/50 px-3 py-1 text-sm text-bone/70">Live</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-bone/10 px-3 py-1 text-sm text-bone/60">{status}</span>
          <div className="relative">
            <Button type="button" variant="ghost" className="h-10 min-h-10 w-10 min-w-10 !p-0" aria-label="Live Session settings" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
              <MoreHorizontal size={19} />
            </Button>
            {menuOpen ? <div role="menu" className="ritual-popover-surface absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-md border p-1">
              {canManageActivities ? <ButtonLink href={`/live/setup?id=${encodeURIComponent(session.id)}`} variant="ghost" className="w-full justify-start px-3"><Settings2 size={16} /> Manage activities</ButtonLink> : null}
              <Button type="button" variant="ghost" className="w-full justify-start px-3" disabled={busy !== null} onClick={() => void download("docx")}><FileText size={16} /> {busy === "docx" ? "Preparing report…" : "Download Word report"}</Button>
              <Button type="button" variant="ghost" className="w-full justify-start px-3" disabled={busy !== null} onClick={() => void download("excel")}><FileSpreadsheet size={16} /> {busy === "excel" ? "Preparing data…" : "Download Excel data"}</Button>
              <div className="my-1 border-t border-bone/10" />
              <Button type="button" variant="ghost" className="w-full justify-start px-3 text-orange hover:text-orange" onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}><Trash2 size={16} /> Delete Live Session</Button>
            </div> : null}
          </div>
        </div>
      </div>
      <div><h2 className="line-clamp-2 font-heading text-2xl font-semibold text-bone">{session.title}</h2>{session.context_label ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-bone/62">{session.context_label}</p> : null}</div>
      <p className="text-xs text-bone/48">Updated {date}</p>
      <div className="mt-auto"><ButtonLink className="w-full" href={liveDashboardDestination(session)}>{session.status === "closed" ? "View results" : session.status === "lobby" ? "Open lobby" : "Open session"}</ButtonLink></div>
      {notice ? <p className="text-sm text-orange">{notice}</p> : null}
    </Card>
    {deleteOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/[0.94] p-4 backdrop-blur-[64px]"><Card className="ritual-overlay-surface w-full max-w-md border"><h3 className="font-heading text-2xl font-semibold text-bone">Delete this Live Session?</h3><p className="mt-3 text-sm leading-6 text-bone/62">This permanently removes the session, its activities, participant data and live responses.</p><div className="mt-6 flex justify-end gap-3"><Button type="button" variant="ghost" disabled={busy === "delete"} onClick={() => setDeleteOpen(false)}>Cancel</Button><Button type="button" variant="danger" disabled={busy === "delete"} onClick={() => void confirmDelete()}><Trash2 size={16} /> {busy === "delete" ? "Deleting…" : "Delete"}</Button></div></Card></div> : null}
  </>;
}
