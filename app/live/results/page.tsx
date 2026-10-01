"use client";

import { Suspense, useEffect, useState } from "react";
import { FileSpreadsheet, FileText, RotateCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/live/button";
import { LiveResults } from "@/components/live/live-results";
import { AppShell } from "@/components/live/shell";
import { exportLiveDocx, exportLiveXlsx } from "@/lib/live/exports";
import { fetchArchivedLiveRun, getLiveResults, listArchivedLiveRuns, recordLiveExport, restartLiveSession, useLiveSessionSnapshot } from "@/lib/live/repository";
import { useLanguage } from "@/lib/live/use-language";
import type { LiveSessionSnapshot } from "@/types/live";

export default function LiveResultsPage() { return <Suspense fallback={<AppShell><p>Loading.</p></AppShell>}><Content /></Suspense>; }

function Content() {
  const params = useSearchParams(); const router = useRouter(); const { language, messages, href } = useLanguage();
  const id = params.get("id"); const { snapshot, loading, refresh } = useLiveSessionSnapshot(id);
  const [archived, setArchived] = useState<Array<{ run_number: number; archived_at: string }>>([]);
  const [selectedRun, setSelectedRun] = useState<number | null>(null);
  const [archiveSnapshot, setArchiveSnapshot] = useState<LiveSessionSnapshot | null>(null);
  const [busy, setBusy] = useState(false); const [restarting, setRestarting] = useState(false); const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!id) return; void listArchivedLiveRuns(id).then(setArchived).catch(() => undefined); }, [id, snapshot?.session.run_number]);
  useEffect(() => { if (!id || selectedRun === null) return; void fetchArchivedLiveRun(id, selectedRun).then(setArchiveSnapshot).catch((cause) => setError(cause instanceof Error ? cause.message : "Archived report unavailable.")); }, [id, selectedRun]);

  if (loading) return <AppShell><p>{messages.export.loading}</p></AppShell>;
  if (!snapshot) return <AppShell homeHref={href("/")}><p className="text-bone/50">{messages.common.sessionNotFound}</p></AppShell>;
  const currentSnapshot = snapshot;
  const displayed = archiveSnapshot ?? currentSnapshot; const results = getLiveResults(displayed); const isArchive = selectedRun !== null;

  async function save(kind: "docx" | "excel") {
    setBusy(true); setError(null);
    try {
      if (kind === "docx") await exportLiveDocx(displayed, language); else await exportLiveXlsx(displayed, language);
      if (!isArchive) { await recordLiveExport(currentSnapshot.session.id, kind); await refresh(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to export this report."); }
    finally { setBusy(false); }
  }
  async function restart() {
    setRestarting(true); setError(null);
    try {
      const status = await restartLiveSession(currentSnapshot.session);
      if (status === "lobby") router.push(`/live/lobby?id=${encodeURIComponent(currentSnapshot.session.id)}&lang=${language}`);
      else router.push(`/live?id=${encodeURIComponent(currentSnapshot.session.id)}&lang=${language}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to restart this ritual."); }
    finally { setRestarting(false); }
  }

  return <AppShell claim={messages.chrome.claim} homeHref={href("/")}>
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div><p className="text-sm uppercase tracking-[.2em] text-bone/48">{isArchive ? `${language === "it" ? "Archivio · giro" : "Archive · run"} ${selectedRun}` : currentSnapshot.session.status}</p><h1 className="mt-2 font-heading text-5xl text-bone">{displayed.session.title}</h1><p className="mt-3 text-bone/58">{results.participantCount} {language === "it" ? "partecipanti" : "participants"} · {results.responseCount} {language === "it" ? "risposte" : "responses"}</p></div>
      <div className="flex flex-wrap gap-3"><ButtonLink href={href("/dashboard")} variant="ghost">{messages.setup.backToDashboard}</ButtonLink>{!isArchive && ["live", "intermission", "closed"].includes(currentSnapshot.session.status) ? <Button disabled={restarting} variant="secondary" onClick={() => void restart()}><RotateCcw size={16} /> {restarting ? messages.live.restartingSession : messages.live.restartSession}</Button> : null}<Button disabled={busy} onClick={() => void save("docx")}><FileText size={16} /> DOCX</Button><Button disabled={busy} variant="secondary" onClick={() => void save("excel")}><FileSpreadsheet size={16} /> XLSX</Button></div>
    </div>
    {archived.length ? <div className="mt-8 flex flex-wrap items-center gap-3"><span className="text-sm text-bone/58">{language === "it" ? "Report precedenti" : "Previous reports"}</span><Button type="button" variant={selectedRun === null ? "secondary" : "ghost"} onClick={() => setSelectedRun(null)}>{language === "it" ? "Giro corrente" : "Current run"}</Button>{archived.map((run) => <Button key={run.run_number} type="button" variant={selectedRun === run.run_number ? "secondary" : "ghost"} onClick={() => setSelectedRun(run.run_number)}>{language === "it" ? "Giro" : "Run"} {run.run_number}</Button>)}</div> : null}
    {error ? <p className="mt-5 text-sm text-orange">{error}</p> : null}
    <div className="mt-10 space-y-8">{displayed.activities.map((activity) => <section key={activity.id}><h2 className="mb-4 font-heading text-2xl text-bone">{activity.prompt}</h2><LiveResults snapshot={displayed} activity={activity} language={language} messages={messages} /></section>)}</div>
  </AppShell>;
}
