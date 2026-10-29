"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Demo = { key: string; kind: string; title: string; status: string; count: number; activityCount: number };
export default function DemoSetupPage() {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (process.env.NODE_ENV !== "development") return <main className="p-12">Not found</main>;
  async function request(body: object) {
    const { data } = await supabase!.auth.getSession();
    if (!data.session) throw new Error("Sign in with the demo account first, then return to this page.");
    const response = await fetch("/api/demo/setup", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify(body) });
    const text = await response.text();
    let payload;
    try { payload = JSON.parse(text); } catch { throw new Error(text); }
    if (!response.ok) throw new Error(payload.error || text);
    return payload;
  }
  async function run() {
    setBusy(true);
    setMessage("");
    try {
      const { demos: items, email } = await request({ action: "list" }) as { demos: Demo[]; email: string };
      setDemos(items);
      setMessage(`Importing fictional English content for ${email}…`);
      for (const demo of items) {
        setProgress(p => ({ ...p, [demo.key]: "Importing…" }));
        const result = await request({ key: demo.key });
        setProgress(p => ({ ...p, [demo.key]: result.skipped ? "Already imported" : "Ready" }));
      }
      setMessage("All 12 examples are ready. Open the dashboard in English.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Import failed"); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-5xl space-y-6 p-8 text-white">
    <h1 className="text-3xl font-semibold">Screenshot demo setup</h1>
    <p>Create six individual assessments and six collaborative rituals in English, with fictional responses and completed results.</p>
    <p className="text-sm text-white/70">For incrocci98@gmail.com only. Data is saved in the configured Supabase database. Existing content is preserved; repeated imports skip completed examples.</p>
    <button className="rounded-lg bg-orange px-5 py-3 text-black disabled:opacity-50" disabled={busy} onClick={run}>{busy ? "Importing…" : "Populate demo account"}</button>
    <p role="status">{message}</p>
    <div className="space-y-3">{demos.map(demo => <div key={demo.key} className="rounded-lg border border-white/20 p-4">
      <p className="font-semibold">{demo.title}</p>
      <p className="text-sm text-white/70">{demo.kind} · {demo.activityCount} activities · {demo.status} · {demo.count} {demo.kind === "individual" ? "responses" : "participants"}</p>
      <p>{progress[demo.key] || "Waiting"}</p>
    </div>)}</div>
    <a className="inline-block underline" href="/dashboard?locale=en">Open English dashboard</a>
  </main>;
}
