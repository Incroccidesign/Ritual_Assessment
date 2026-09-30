"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Check, Maximize, Minimize, Pause, Play, QrCode, RotateCcw, Square, StopCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/live/button";
import { inputClass, panelClass } from "@/components/live/field";
import { LiveResults } from "@/components/live/live-results";
import { SessionQrModal } from "@/components/live/session-qr-modal";
import { AppShell } from "@/components/live/shell";
import { getLiveJoinToken, getLiveParticipantAccess } from "@/lib/live/access";
import { participantDisplayName } from "@/lib/live/participant-identity";
import { getJoinUrl } from "@/lib/live/public-url";
import { normalizeSurfaceInputTypes, surfaceColorClasses, surfaceLabel } from "@/lib/live/surface-input-types";
import { cn } from "@/lib/live/utils";
import { useLanguage } from "@/lib/live/use-language";
import { closeLiveSession, completeLiveActivity, confirmLivePact, duplicateLiveSession, extendLiveTimer, generateLiveJoinLink, refreshLivePactResults, startLivePactRound, startNextLiveActivity, submitLivePactVote, submitLivePriorityVotes, submitLiveResponse, toggleLiveActivityPause, useLiveSessionSnapshot } from "@/lib/live/repository";
import { activityDisplayName, currentLiveActivity, liveActivityItems, liveActivityRemainingSeconds, livePactForActivity, nextPendingLiveActivity } from "@/lib/live/ui-adapter";
import type { LiveActivity, LiveAdhesionLevel, LiveParticipantAccess, LiveSessionSnapshot } from "@/types/live";

export default function LivePage() { return <Suspense fallback={<AppShell><p className="text-bone/50">Loading.</p></AppShell>}><LiveContent /></Suspense>; }

function LiveContent() {
  const params = useSearchParams(); const { language, messages, href } = useLanguage();
  const sessionId = params.get("id"); const participantId = params.get("participant"); const participantToken = params.get("participantToken"); const joinToken = params.get("join") ?? params.get("joinToken");
  const [access] = useState<LiveParticipantAccess | null>(() => {
    if (!sessionId || !participantId) return null;
    const stored = getLiveParticipantAccess(sessionId);
    if (stored?.participantId === participantId) return stored;
    return participantToken ? { participantId, participantToken, joinToken } : null;
  });
  const participantMode = Boolean(participantId);
  const participantAccess = access?.participantId === participantId ? access : null;
  const { snapshot, loading, refresh } = useLiveSessionSnapshot(sessionId, participantMode ? participantAccess : null);
  if (loading) return <AppShell compact={participantMode} claim={messages.chrome.claim} homeHref={href("/")}><p className="text-bone/50">{messages.live.loading}</p></AppShell>;
  if (participantMode && !participantAccess) return <AppShell compact claim={messages.chrome.claim} homeHref={href("/")}><p className="text-bone/50">{messages.common.sessionNotFound}</p></AppShell>;
  if (!sessionId || !snapshot) return <AppShell claim={messages.chrome.claim} homeHref={href("/")}><p className="text-bone/50">{messages.common.sessionNotFound}</p></AppShell>;
  return <AppShell compact={participantMode} claim={messages.chrome.claim} homeHref={href("/")}>{participantMode && participantAccess ? <ParticipantLive snapshot={snapshot} access={participantAccess} language={language} messages={messages} /> : <FacilitatorLive snapshot={snapshot} refresh={refresh} language={language} dashboardHref={href("/dashboard")} messages={messages} />}</AppShell>;
}

function FacilitatorLive({ snapshot, refresh, language, dashboardHref, messages }: { snapshot: LiveSessionSnapshot; refresh: () => Promise<LiveSessionSnapshot | null>; language: "it" | "en"; dashboardHref: string; messages: ReturnType<typeof useLanguage>["messages"] }) {
  const router = useRouter();
  const presentationRoot = useRef<HTMLDivElement | null>(null); const [presentationMode, setPresentationMode] = useState(false);
  const current = currentLiveActivity(snapshot); const next = nextPendingLiveActivity(snapshot); const [reveal, setReveal] = useState(false); const [now, setNow] = useState(() => Date.now()); const [pactDraft, setPactDraft] = useState(""); const [error, setError] = useState<string | null>(null); const [qrExpanded, setQrExpanded] = useState(false); const [storedJoinToken] = useState(() => getLiveJoinToken(snapshot.session.id)); const [generatedJoinToken, setGeneratedJoinToken] = useState<string | null>(null); const [generatingLink, setGeneratingLink] = useState(false); const [restarting, setRestarting] = useState(false);
  const joinUrl = useMemo(() => {
    const joinToken = generatedJoinToken ?? storedJoinToken;
    return joinToken ? getJoinUrl(snapshot.session.id, joinToken) : "";
  }, [generatedJoinToken, snapshot.session.id, storedJoinToken]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { const change = () => setPresentationMode(document.fullscreenElement === presentationRoot.current); document.addEventListener("fullscreenchange", change); return () => document.removeEventListener("fullscreenchange", change); }, []);
  const remaining = current ? liveActivityRemainingSeconds(current, now) : null; const expired = remaining === 0 && snapshot.session.status === "live" && current?.timer_enabled;
  const pact = current ? livePactForActivity(snapshot, current.id) : null; const round = pact?.pact_rounds.find((item) => item.roundNumber === pact.current_round_number); const pactVotes = current && pact?.current_round_number ? snapshot.pactVotes.filter((item) => item.live_activity_id === current.id && item.round_number === pact.current_round_number) : [];
  async function primary() {
    try {
      setError(null);
      if (snapshot.session.status === "lobby" || snapshot.session.status === "intermission") await startNextLiveActivity(snapshot.session.id);
      else if (snapshot.session.status === "live" && next) await completeLiveActivity(snapshot.session.id);
      else await closeLiveSession(snapshot.session.id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.common.sessionNotFound);
    }
  }
  async function pactStart() { if (!current || !pactDraft.trim()) return; try { await startLivePactRound(snapshot.session.id, current.id, pactDraft, current.pact_statement_mode ?? "build_live", current.facilitator_note); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : messages.live.pactActionError); } }
  async function pactRefresh() { if (!current) return; await refreshLivePactResults(snapshot.session.id, current.id); await refresh(); }
  async function pactConfirm() { if (!current) return; await confirmLivePact(snapshot.session.id, current.id); await refresh(); }
  async function showParticipantQr() {
    try {
      setError(null);
      setGeneratingLink(true);
      if (!joinUrl) setGeneratedJoinToken(await generateLiveJoinLink(snapshot.session.id));
      setQrExpanded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.common.sessionNotFound);
    } finally {
      setGeneratingLink(false);
    }
  }
  async function restartAsNewSession() {
    try {
      setError(null);
      setRestarting(true);
      const duplicate = await duplicateLiveSession(snapshot.session.id);
      router.push(`/live/setup?id=${encodeURIComponent(duplicate.id)}&lang=${language}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to restart this ritual.");
    } finally {
      setRestarting(false);
    }
  }
  const fullscreen = <Button variant="secondary" onClick={() => void (presentationMode ? document.exitFullscreen() : presentationRoot.current?.requestFullscreen())}>{presentationMode ? <Minimize size={16} /> : <Maximize size={16} />}{presentationMode ? messages.live.exitPresentationMode : messages.live.presentationMode}</Button>;
  const controls = <div className="mb-8 flex flex-wrap justify-end gap-3"><ButtonLink href={dashboardHref} variant="ghost">{messages.setup.backToDashboard}</ButtonLink>{fullscreen}{["live", "intermission"].includes(snapshot.session.status) ? <><Button variant="secondary" disabled={generatingLink} onClick={() => void showParticipantQr()}><QrCode size={16} /> {generatingLink ? messages.lobby.generatingLink : messages.live.inviteParticipants}</Button><Button variant="ghost" disabled={restarting} onClick={() => void restartAsNewSession()}><RotateCcw size={16} /> {restarting ? messages.live.restartingSession : messages.live.restartSession}</Button></> : null}{snapshot.session.status === "live" && current ? <><Button variant="ghost" onClick={() => void closeLiveSession(snapshot.session.id).then(refresh)}><StopCircle size={16} /> {messages.live.endRitual}</Button><Button variant="secondary" onClick={() => void toggleLiveActivityPause(snapshot.session.id).then(refresh)}>{current.state === "paused" ? <Play size={16} /> : <Pause size={16} />}{current.state === "paused" ? messages.live.resumeActivity : messages.live.pauseActivity}</Button></> : null}{expired ? <><Button variant="secondary" onClick={() => void extendLiveTimer(snapshot.session.id, 2).then(refresh)}>{messages.live.extendBy2}</Button><Button variant="secondary" onClick={() => void extendLiveTimer(snapshot.session.id, 5).then(refresh)}>{messages.live.extendBy5}</Button></> : null}{snapshot.session.status !== "closed" ? <Button onClick={() => void primary()}>{snapshot.session.status === "lobby" ? messages.lobby.start : snapshot.session.status === "intermission" ? messages.live.startActivity : next ? messages.live.nextActivity : messages.live.endRitual}</Button> : null}</div>;
  const qrModal = <SessionQrModal open={qrExpanded} joinUrl={joinUrl} instruction={messages.lobby.scanQrInstruction} closeLabel={messages.live.backToActivity} onClose={() => setQrExpanded(false)} />;
  if (snapshot.session.status === "closed") return <><PresentationFrame root={presentationRoot} active={presentationMode}><div className="mb-8 flex flex-wrap gap-3"><ButtonLink href={dashboardHref} variant="ghost">{messages.setup.backToDashboard}</ButtonLink><ButtonLink href={`/live/results?id=${snapshot.session.id}&lang=${language}`}>{messages.live.goToReport}</ButtonLink><Button variant="secondary" disabled={restarting} onClick={() => void restartAsNewSession()}><RotateCcw size={16} /> {restarting ? messages.live.restartingSession : messages.live.restartSession}</Button></div>{error ? <p className="mb-5 text-sm text-orange">{error}</p> : null}<ClosedScreen messages={messages} /></PresentationFrame>{qrModal}</>;
  if (snapshot.session.status === "intermission") return <><PresentationFrame root={presentationRoot} active={presentationMode}><div>{controls}</div>{error ? <p className="mb-5 text-sm text-orange">{error}</p> : null}<section className={panelClass}><h1 className="font-heading text-4xl text-bone">{messages.live.nextStepPreparingTitle}</h1><p className="mt-4 text-lg text-bone/62">{messages.live.nextStepPreparingBody}</p>{next ? <p className="mt-8 text-xl text-mint">{messages.live.nextActivityTitle}: {activityDisplayName(next, messages)}</p> : null}</section></PresentationFrame>{qrModal}</>;
  return <><PresentationFrame root={presentationRoot} active={presentationMode}><div className="flex flex-wrap items-start justify-between gap-6"><div><h1 className="text-xl font-semibold text-bone/72">{snapshot.session.title}</h1>{current && current.activity_type !== "patto" ? <p className="mt-4 font-heading text-4xl leading-tight text-bone md:text-5xl">{current.prompt}</p> : null}</div>{current?.timer_enabled ? <Timer activity={current} language={language} messages={messages} /> : null}</div>{controls}{error && current?.activity_type !== "patto" ? <p className="mb-5 text-sm text-orange">{error}</p> : null}{current ? current.activity_type === "patto" ? <PactFacilitator activity={current} pact={pact} round={round} votes={pactVotes.length} draft={pactDraft} setDraft={setPactDraft} onStart={pactStart} onRefresh={pactRefresh} onConfirm={pactConfirm} error={error} messages={messages} /> : <LiveResults snapshot={snapshot} activity={current} language={language} messages={messages} responsesVisible={current.show_live_results || reveal} onToggleResponses={current.show_live_results ? null : () => setReveal((value) => !value)} /> : null}</PresentationFrame>{qrModal}</>;
}

function PresentationFrame({ root, active, children }: { root: React.RefObject<HTMLDivElement | null>; active: boolean; children: React.ReactNode }) {
  const [controlsVisible, setControlsVisible] = useState(true);
  if (!active) return <div ref={root}>{children}</div>;
  return <div ref={root} className="live-presentation min-h-screen bg-night text-bone" onMouseMove={(event) => setControlsVisible(event.clientY <= 110)}>
    <div className={cn("pointer-events-none relative z-50 overflow-hidden transition-[max-height,padding,opacity] duration-200 ease-out", controlsVisible ? "max-h-44 py-4 opacity-100" : "max-h-0 py-0 opacity-0")} />
    <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col px-8 pb-8 pt-8 transition-[padding] duration-200"><div className="flex min-h-0 flex-1 flex-col [&_.mb-8]:mb-8 [&_.rounded-lg]:transition-all [&_.rounded-lg]:duration-300 [&_h1]:max-w-6xl [&_h1]:text-5xl xl:[&_h1]:text-[3.5rem]">{children}</div></div>
  </div>;
}

function PactFacilitator({ activity, pact, round, votes, draft, setDraft, onStart, onRefresh, onConfirm, error, messages }: { activity: LiveActivity; pact: ReturnType<typeof livePactForActivity>; round: ReturnType<NonNullable<ReturnType<typeof livePactForActivity>>["pact_rounds"]["find"]>; votes: number; draft: string; setDraft: (value: string) => void; onStart: () => Promise<void>; onRefresh: () => Promise<void>; onConfirm: () => Promise<void>; error: string | null; messages: ReturnType<typeof useLanguage>["messages"] }) {
  const confirmed = Boolean(round?.confirmed || (round && pact?.confirmed_round_number === round.roundNumber)); if (!pact?.current_round_number) return <section className={cn(panelClass, "space-y-5")}><h2 className="font-heading text-3xl text-bone">{messages.live.draftPactTitle}</h2><p className="text-bone/58">{messages.live.draftPactBody}</p><textarea className={cn(inputClass, "min-h-32 resize-y")} value={draft} onChange={(event) => setDraft(event.target.value)} aria-label={messages.live.pactProposal} />{error ? <p className="text-sm text-orange">{error}</p> : null}<Button disabled={!draft.trim()} onClick={() => void onStart()}>{messages.live.startAgreement}</Button></section>;
  const proposal = round?.proposalText ?? pact.pact_text ?? activity.pact_text ?? ""; return <section className={cn(panelClass, "space-y-6")}><p className="text-xs uppercase tracking-[.18em] text-bone/58">{messages.live.roundLabel} {round?.roundNumber ?? pact.current_round_number}</p><p className="font-heading text-3xl leading-tight text-bone">{proposal}</p><div className="grid gap-3 md:grid-cols-3">{(["Concordo", "Parzialmente", "Non concordo"] as const).map((level) => <div key={level} className="rounded-lg border border-bone/10 bg-night/55 p-5"><p className="text-sm text-bone/55">{messages.adhesionLabels[level]}</p><p className="mt-2 font-heading text-4xl text-mint">{round ? level === "Concordo" ? round.agreementCounts.agree : level === "Parzialmente" ? round.agreementCounts.partial : round.agreementCounts.disagree : 0}</p></div>)}</div><p className="text-sm text-bone/55">{votes} {messages.live.responsePlural}</p><div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={() => void onRefresh()}>{messages.live.revealResponses}</Button><Button onClick={() => void onConfirm()} disabled={confirmed}>{confirmed ? messages.live.pactConfirmedTitle : messages.live.confirmPact}</Button></div></section>;
}

function ParticipantLive({ snapshot, access, language, messages }: { snapshot: LiveSessionSnapshot; access: LiveParticipantAccess; language: "it" | "en"; messages: ReturnType<typeof useLanguage>["messages"] }) {
  const current = currentLiveActivity(snapshot); const next = nextPendingLiveActivity(snapshot); const participant = snapshot.participants.find((item) => item.id === access.participantId); const [text, setText] = useState(""); const [category, setCategory] = useState<string | null>(null); const [selected, setSelected] = useState<string[]>([]); const [adhesion, setAdhesion] = useState<LiveAdhesionLevel>("Concordo"); const [error, setError] = useState<string | null>(null); const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  if (["draft", "setup", "lobby"].includes(snapshot.session.status)) return <Waiting title={messages.live.waitingTitle} body={messages.live.waitingBody} snapshot={snapshot} participantId={access.participantId} messages={messages} />;
  if (snapshot.session.status === "intermission") return <Waiting title={messages.live.nextStepPreparingTitle} body={messages.live.nextStepPreparingBody} snapshot={snapshot} participantId={access.participantId} messages={messages} next={next ? activityDisplayName(next, messages) : null} />;
  if (snapshot.session.status === "closed" || !current) return <ClosedScreen messages={messages} />;
  const paused = current.state === "paused"; const expired = liveActivityRemainingSeconds(current, now) === 0 && current.timer_enabled; const items = liveActivityItems(snapshot, current.id); const pact = livePactForActivity(snapshot, current.id); const round = pact?.current_round_number; const priorityVoted = snapshot.priorityVotes.some((vote) => vote.participant_id === access.participantId && vote.live_activity_id === current.id); const pactVoted = Boolean(round && snapshot.pactVotes.some((vote) => vote.participant_id === access.participantId && vote.live_activity_id === current.id && vote.round_number === round)); const categories = current.activity_type === "traccia" ? normalizeSurfaceInputTypes(current.surface_input_types as Parameters<typeof normalizeSurfaceInputTypes>[0]) : []; const pactDrafting = current.activity_type === "patto" && !round;
  const activity = current;
  async function submit() { try { setError(null); if (activity.activity_type === "priorita") await submitLivePriorityVotes(snapshot.session.id, access, activity.id, selected); else if (activity.activity_type === "patto") await submitLivePactVote(snapshot.session.id, access, activity.id, adhesion); else { if (!text.trim()) return; await submitLiveResponse(snapshot.session.id, access, activity.id, activity.activity_type, text.trim(), activity.activity_type === "traccia" ? category : null); setText(""); } } catch (cause) { setError(cause instanceof Error ? cause.message : messages.live.pactActionError); } }
  const locked = current.activity_type === "priorita" ? priorityVoted : current.activity_type === "patto" ? pactVoted : false; const name = participantDisplayName(participant, messages.common.participant);
  return <section className={cn(panelClass, "px-5 py-6 sm:px-7")}><p className="text-xl text-bone/82">{snapshot.session.title}</p><p className="mt-2 text-bone/62">{name}</p>{current.timer_enabled ? <div className="mt-7"><Timer activity={current} language={language} messages={messages} compact /></div> : null}{current.activity_type !== "patto" ? <h1 className="mt-7 font-heading text-3xl leading-tight text-bone">{current.prompt}</h1> : null}{paused ? <p className="mt-7 rounded-lg border border-orange/30 bg-orange/10 p-5 text-bone">{messages.live.pausedTitle}</p> : null}{pactDrafting ? <p className="mt-7 rounded-lg border border-bone/10 bg-night/55 p-5 text-bone/62">{messages.live.pactProposalInProgressBody}</p> : locked ? <p className="mt-7 rounded-lg border border-mint/30 bg-mint/10 p-5 text-bone">{messages.live.received}</p> : <form className="mt-8 space-y-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}>{current.activity_type === "traccia" ? <div className="grid grid-cols-2 gap-3">{categories.map((item) => <button type="button" key={item.id} disabled={paused} onClick={() => setCategory(item.id)} className={cn("rounded-md border px-4 py-3 text-left", category === item.id ? `${surfaceColorClasses(item.color).borderClass} ${surfaceColorClasses(item.color).bgClass}` : "border-bone/10 bg-night/60")}><span className={surfaceColorClasses(item.color).textClass}>{surfaceLabel(item, language)}</span></button>)}</div> : null}{["innesco", "traccia", "focus"].includes(current.activity_type) ? <textarea className={cn(inputClass, "min-h-28 resize-none text-lg")} value={text} onChange={(event) => setText(event.target.value)} maxLength={current.activity_type === "innesco" ? 80 : 180} placeholder={current.activity_type === "innesco" ? messages.live.triggerContributionPlaceholder : undefined} disabled={paused} /> : null}{current.activity_type === "priorita" ? <div className="space-y-3">{items.map((item) => <button key={item.id} type="button" onClick={() => setSelected((value) => value.includes(item.id) ? value.filter((id) => id !== item.id) : value.length >= current.votes_per_participant ? value : [...value, item.id])} className={cn("flex w-full items-center gap-3 rounded-md border p-4 text-left", selected.includes(item.id) ? "border-mint bg-mint/12" : "border-bone/10 bg-night/60")}>{selected.includes(item.id) ? <Check size={18} /> : <Square size={18} />}{item.label}</button>)}</div> : null}{current.activity_type === "patto" ? <PactParticipant pact={pact} adhesion={adhesion} setAdhesion={setAdhesion} messages={messages} /> : null}{error ? <p className="text-sm text-orange">{error}</p> : null}<Button className="w-full" disabled={paused || expired || (current.activity_type === "priorita" && !selected.length) || (["innesco", "traccia", "focus"].includes(current.activity_type) && !text.trim())}>{current.activity_type === "priorita" ? messages.live.submitVotes : messages.live.submitResponse}</Button></form>}</section>;
}

function PactParticipant({ pact, adhesion, setAdhesion, messages }: { pact: ReturnType<typeof livePactForActivity>; adhesion: LiveAdhesionLevel; setAdhesion: (value: LiveAdhesionLevel) => void; messages: ReturnType<typeof useLanguage>["messages"] }) { const proposal = pact?.pact_rounds.find((item) => item.roundNumber === pact.current_round_number)?.proposalText ?? pact?.pact_text ?? ""; return <div className="space-y-4"><p className="font-heading text-3xl text-bone">{proposal}</p>{(["Concordo", "Parzialmente", "Non concordo"] as const).map((level) => <button type="button" key={level} onClick={() => setAdhesion(level)} className={cn("w-full rounded-md border p-4 text-left", adhesion === level ? "border-mint bg-mint/12" : "border-bone/10 bg-night/60")}>{messages.adhesionLabels[level]}</button>)}</div>; }
function Waiting({ title, body, snapshot, participantId, messages, next }: { title: string; body: string; snapshot: LiveSessionSnapshot; participantId: string; messages: ReturnType<typeof useLanguage>["messages"]; next?: string | null }) { const participant = snapshot.participants.find((item) => item.id === participantId); return <section className={panelClass}><h1 className="font-heading text-4xl text-bone">{title}</h1><p className="mt-4 text-lg text-bone/68">{body}</p><div className="mt-8 rounded-lg border border-bone/10 bg-night/55 p-5"><p className="font-heading text-2xl text-bone">{snapshot.session.title}</p><p className="mt-3 text-bone/62">{participantDisplayName(participant, messages.common.participant)}</p>{next ? <p className="mt-3 text-mint">{next}</p> : null}</div></section>; }
function ClosedScreen({ messages }: { messages: ReturnType<typeof useLanguage>["messages"] }) { return <section className={panelClass}><h1 className="font-heading text-4xl text-bone">{messages.live.closedTitle}</h1><p className="mt-4 text-lg text-bone/62">{messages.live.closedBody}</p><p className="mt-3 text-bone/48">{messages.live.closedSecondary}</p></section>; }
function Timer({ activity, messages, compact = false }: { activity: LiveActivity; language?: "it" | "en"; messages: ReturnType<typeof useLanguage>["messages"]; compact?: boolean }) { const [now, setNow] = useState(() => Date.now()); useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []); const remaining = liveActivityRemainingSeconds(activity, now); const label = remaining === null ? `${activity.timer_duration} ${messages.common.minutesShort}` : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`; return <div className={cn("shrink-0 font-heading font-semibold text-mint", compact ? "text-3xl" : "text-4xl")}><p>{label}</p><span className="text-xs uppercase tracking-[.18em] text-bone/42">{messages.live.remainingTime}</span></div>; }
