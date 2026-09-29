"use client";
import { Suspense, useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/live/button";
import { LiveResults } from "@/components/live/live-results";
import { AppShell } from "@/components/live/shell";
import { exportLiveDocx, exportLiveXlsx } from "@/lib/live/exports";
import { getLiveResults, recordLiveExport, useLiveSessionSnapshot } from "@/lib/live/repository";
import { useLanguage } from "@/lib/live/use-language";

export default function LiveResultsPage() { return <Suspense fallback={<AppShell><p>Loading.</p></AppShell>}><Content /></Suspense>; }
function Content() {
  const params = useSearchParams(); const { language, messages, href } = useLanguage(); const id = params.get("id"); const { snapshot, loading, refresh } = useLiveSessionSnapshot(id); const [busy, setBusy] = useState(false);
  if (loading) return <AppShell><p>{messages.export.loading}</p></AppShell>;
  if (!snapshot || snapshot.session.status !== "closed") return <AppShell homeHref={href("/")}><p className="text-bone/50">{messages.common.sessionNotFound}</p></AppShell>;
  const closedSnapshot = snapshot; const results = getLiveResults(closedSnapshot);
  async function save(kind: "docx" | "excel") { setBusy(true); try { if (kind === "docx") await exportLiveDocx(closedSnapshot); else await exportLiveXlsx(closedSnapshot); await recordLiveExport(closedSnapshot.session.id, kind); await refresh(); } finally { setBusy(false); } }
  return <AppShell claim={messages.chrome.claim} homeHref={href("/")}><div className="flex flex-wrap items-start justify-between gap-6"><div><p className="text-sm uppercase tracking-[.2em] text-bone/48">{closedSnapshot.session.status}</p><h1 className="mt-2 font-heading text-5xl text-bone">{closedSnapshot.session.title}</h1><p className="mt-3 text-bone/58">{results.participantCount} participants · {results.responseCount} responses</p></div><div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void save("docx")}><FileText size={16} /> DOCX</Button><Button disabled={busy} variant="secondary" onClick={() => void save("excel")}><FileSpreadsheet size={16} /> XLSX</Button></div></div><div className="mt-10 space-y-8">{closedSnapshot.activities.map((activity) => <section key={activity.id}><h2 className="mb-4 font-heading text-2xl text-bone">{activity.prompt}</h2><LiveResults snapshot={closedSnapshot} activity={activity} language={language} messages={messages} /></section>)}</div></AppShell>;
}
