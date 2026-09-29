"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Play } from "lucide-react";
import { Button } from "@/components/live/button";
import { panelClass } from "@/components/live/field";
import { participantDisplayName } from "@/lib/live/participant-identity";
import { SessionQr } from "@/components/live/qr-code";
import { SessionQrModal } from "@/components/live/session-qr-modal";
import { AppShell } from "@/components/live/shell";
import { getLiveJoinToken as getStoredJoinToken } from "@/lib/live/access";
import { getJoinUrl, isLocalhostUrl } from "@/lib/live/public-url";
import { getNextLiveActivity as getNextPendingActivity, startNextLiveActivity as startNextActivity, useLiveSessionSnapshot as useSessionSnapshot } from "@/lib/live/repository";
import { useLanguage } from "@/lib/live/use-language";

export default function LobbyPage() {
  return (
    <Suspense fallback={<AppShell><p className="text-bone/50">Caricamento.</p></AppShell>}>
      <LobbyContent />
    </Suspense>
  );
}

function LobbyContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { messages, href } = useLanguage();
  const sessionId = params.get("id");
  const { snapshot, loading } = useSessionSnapshot(sessionId);
  const [qrExpanded, setQrExpanded] = useState(false);
  const [showSequence, setShowSequence] = useState(false);
  const [joinToken] = useState<string | null>(() => sessionId ? getStoredJoinToken(sessionId) : null);
  const joinUrl = useMemo(() => {
    if (!sessionId) return "";
    return getJoinUrl(sessionId, joinToken);
  }, [joinToken, sessionId]);
  const isLocalQr = joinUrl ? isLocalhostUrl(joinUrl) : false;

  if (loading) return <AppShell claim={messages.chrome.claim} homeHref={href("/")}><p className="text-bone/50">{messages.lobby.loading}</p></AppShell>;
  if (!snapshot) return <AppShell claim={messages.chrome.claim} homeHref={href("/")}><p className="text-bone/50">{messages.common.sessionNotFound}</p></AppShell>;

  const nextActivity = getNextPendingActivity(snapshot);

  async function startRitual() {
    if (!sessionId) return;
    await startNextActivity(sessionId);
    router.push(href(`/live?id=${sessionId}`));
  }

  return (
    <AppShell claim={messages.chrome.claim} homeHref={href("/")}>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className={panelClass}>
          <h1 className="mt-5 font-heading text-5xl font-semibold leading-none text-bone">{snapshot.session.title}</h1>
          {snapshot.session.facilitator_name ? <p className="mt-5 text-bone/55">{snapshot.session.facilitator_name}</p> : null}
          <div className="mt-8">
            <button type="button" onClick={() => setQrExpanded(true)} className="rounded-lg transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-mint">
              <SessionQr value={joinUrl} />
            </button>
          </div>
          <div className="mt-6 rounded-md border border-bone/10 bg-night/55 p-4">
            <p className="break-all text-sm text-bone/48">{joinUrl}</p>
            {isLocalQr ? <p className="mt-3 text-xs leading-5 text-orange">{messages.lobby.localWarning}</p> : null}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={startRitual} disabled={!nextActivity}>
              {messages.lobby.start} <Play size={17} />
            </Button>
          </div>
        </section>

        <section className={panelClass}>
          <div>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.22em] text-mint">{messages.lobby.lobby}</p>
              <div className="mt-3 flex items-baseline gap-3">
                <h2 className="font-heading text-4xl font-semibold text-bone">{snapshot.participants.length}</h2>
                <p className="text-base font-medium text-bone">{messages.lobby.participantsLive}</p>
              </div>
            </div>
            <div className="grid gap-2">
              {snapshot.participants.length ? (
                snapshot.participants.map((participant) => (
                  <article key={participant.id} className="flex items-center justify-between rounded-md border border-bone/10 bg-night/50 px-4 py-3">
                    <span className="font-medium text-bone">{participantDisplayName(participant, messages.common.participant)}</span>
                    <span className="text-sm text-bone/45">{participant.role_name}</span>
                  </article>
                ))
              ) : (
                <p className="rounded-md border border-bone/10 bg-night/50 p-4 text-bone/45">{messages.lobby.waiting}</p>
              )}
            </div>
          </div>

          <div className="mt-8 border-t border-bone/10 pt-8">
            <div className="mb-4">
              <p className="text-sm uppercase tracking-[0.22em] text-mint">{messages.lobby.activitySequence}</p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  <h2 className="font-heading text-4xl font-semibold text-bone">{snapshot.activities.length}</h2>
                  <p className="text-base font-medium text-bone">{messages.lobby.activityCount}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSequence((current) => !current)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-bone/70 transition hover:text-bone"
                >
                  {showSequence ? messages.export.collapse : messages.export.expand}
                  {showSequence ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>
            {showSequence ? (
              <div className="grid gap-2">
                {snapshot.activities.map((activity) => (
                  <article key={activity.id} className="rounded-md border border-bone/10 bg-night/50 px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="font-heading text-lg text-bone">{messages.activities[activity.activity_type].name}</span>
                          <span className="text-sm text-bone/52">{activity.instance_label || `#${activity.instance_index}`}</span>
                        </div>
                      <span className="text-xs uppercase tracking-[0.18em] text-bone/38">{activity.order_index + 1}</span>
                    </div>
                    <p className="mt-3 text-sm text-bone/68">{activity.prompt}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>
      <SessionQrModal
        open={qrExpanded}
        joinUrl={joinUrl}
        instruction={messages.lobby.scanQrInstruction}
        closeLabel={messages.live.backToActivity}
        onClose={() => setQrExpanded(false)}
      />
    </AppShell>
  );
}
