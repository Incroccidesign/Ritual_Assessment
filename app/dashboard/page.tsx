"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { SetupContent } from "@/app/live/setup/SetupContent";
import { AssessmentBuilder } from "@/components/builder/AssessmentBuilder";
import { Designer } from "@/lib/auth/designerAuth";
import { DesignerAuthGate } from "@/components/auth/DesignerAuthGate";
import { AssessmentCreationCard } from "@/components/dashboard/AssessmentCreationCard";
import { AssessmentManagementCard } from "@/components/dashboard/AssessmentManagementCard";
import { LiveSessionCard } from "@/components/dashboard/LiveSessionCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button, Card, EmptyState } from "@/components/ritual-ui";
import { AssessmentTemplate } from "@/data/templates/nasijSustainabilityAssessmentTemplate";
import {
  AssessmentBundle,
  createSupabaseAssessment,
  createSupabaseAssessmentFromExistingTemplate,
  createSupabaseAssessmentFromTemplate,
  deleteSupabaseAssessment,
  fetchDesignerAssessmentBundles
} from "@/lib/supabase/assessmentRepository";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { markAssessmentAsTemplate, templateAssessmentIdsForOwner, unmarkAssessmentAsTemplate } from "@/lib/templates/templateStore";
import { useLocale } from "@/lib/i18n/useLocale";
import { getErrorMessage } from "@/lib/utils/errors";
import { listLiveSessions } from "@/lib/live/repository";
import { stashPendingRitualFile, validateRitualFile } from "@/lib/live/ritual-file";
import { useDismissiblePopover } from "@/lib/ui/use-dismissible-popover";
import type { LiveSession } from "@/types/live";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DesignerAuthGate>
        {(designer) => (
          <DashboardShell designer={designer}>
            <DashboardContent designer={designer} />
          </DashboardShell>
        )}
      </DesignerAuthGate>
    </Suspense>
  );
}

function DashboardContent({ designer }: { designer: Designer }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, messages, href } = useLocale();
  const [bundles, setBundles] = useState<AssessmentBundle[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creationOpen, setCreationOpen] = useState(false);
  const [creationType, setCreationType] = useState<"choose" | "assessment">("choose");
  const [liveSetupOpen, setLiveSetupOpen] = useState(false);
  const [liveCloseRequested, setLiveCloseRequested] = useState(false);
  const [individualSetup, setIndividualSetup] = useState<{ assessmentId: string; templateMode: boolean } | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creationPopoverRef = useRef<HTMLSpanElement | null>(null);
  const ritualFileInputRef = useRef<HTMLInputElement | null>(null);
  const templateIds = useMemo(() => templateAssessmentIdsForOwner(designer.id), [designer.id]);
  const templateBundles = useMemo(
    () => bundles.filter((bundle) => templateIds.has(bundle.assessment.id)),
    [bundles, templateIds]
  );
  const assessmentBundles = useMemo(
    () => bundles.filter((bundle) => !templateIds.has(bundle.assessment.id)),
    [bundles, templateIds]
  );

  useDismissiblePopover(creationOpen, creationPopoverRef, () => {
    setCreationOpen(false);
    setCreationType("choose");
  });

  useEffect(() => {
    let active = true;
    async function refresh() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      setError(null);
      try {
        const [nextBundles, nextLiveSessions] = await Promise.all([fetchDesignerAssessmentBundles(designer.id), listLiveSessions()]);
        if (!active) return;
        setBundles(nextBundles);
        setLiveSessions(nextLiveSessions as LiveSession[]);
      } catch (dashboardError) {
        if (!active) return;
        setError(getErrorMessage(dashboardError, messages.auth.signInError));
      } finally {
        if (active) setLoading(false);
      }
    }
    void refresh();
    return () => {
      active = false;
    };
  }, [designer.id, messages.auth.signInError]);

  useEffect(() => {
    async function bootstrapPlatformAdmin() {
      if (!supabase) return;
      const bootstrapKey = `ritual-admin-bootstrap:${designer.id}`;
      if (window.sessionStorage.getItem(bootstrapKey)) return;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/admin/bootstrap", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => null);
      if (response?.ok) window.sessionStorage.setItem(bootstrapKey, "1");
    }
    void bootstrapPlatformAdmin();
  }, [designer.id]);

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCreationOpen(true);
    router.replace(href("/dashboard"));
  }, [href, router, searchParams]);

  function handleDeleteAssessment(assessmentId: string) {
    setBundles((current) => current.filter((bundle) => bundle.assessment.id !== assessmentId));
  }

  function handleUpdateAssessment(nextAssessment: AssessmentBundle["assessment"]) {
    setBundles((current) =>
      current.map((bundle) =>
        bundle.assessment.id === nextAssessment.id ? { ...bundle, assessment: nextAssessment } : bundle
      )
    );
  }

  function handleDeleteLiveSession(sessionId: string) {
    setLiveSessions((current) => current.filter((session) => session.id !== sessionId));
  }

  async function handleCloseLiveSetup() {
    setLiveSetupOpen(false);
    setCreationOpen(false);
    setCreationType("choose");
    setLiveCloseRequested(false);
    try {
      setLiveSessions(await listLiveSessions() as LiveSession[]);
    } catch (liveError) {
      setError(getErrorMessage(liveError, messages.auth.signInError));
    }
  }

  async function handleCloseIndividualSetup() {
    setIndividualSetup(null);
    setCreationOpen(false);
    setCreationType("choose");
    try {
      setBundles(await fetchDesignerAssessmentBundles(designer.id));
    } catch (dashboardError) {
      setError(getErrorMessage(dashboardError, messages.auth.signInError));
    }
  }

  async function handleCreateBlankAssessment() {
    if (!isSupabaseConfigured || creating) return;
    setCreating(true);
    setError(null);
    try {
      const assessment = await createSupabaseAssessment(locale);
      setCreationOpen(false);
      setCreationType("choose");
      setIndividualSetup({ assessmentId: assessment.id, templateMode: false });
    } catch (createError) {
      setError(getErrorMessage(createError, messages.auth.signInError));
    } finally {
      setCreating(false);
    }
  }

  async function handleBuildTemplate() {
    if (!isSupabaseConfigured || creating) return;
    setCreating(true);
    setError(null);
    try {
      const assessment = await createSupabaseAssessment(locale);
      markAssessmentAsTemplate(assessment.id, designer.id);
      setCreationOpen(false);
      setCreationType("choose");
      setIndividualSetup({ assessmentId: assessment.id, templateMode: true });
    } catch (createError) {
      setError(getErrorMessage(createError, messages.assessmentCreate.createError));
    } finally {
      setCreating(false);
    }
  }

  async function handleUseTemplate(template: AssessmentTemplate) {
    if (!isSupabaseConfigured || creating) return;
    setCreating(true);
    setError(null);
    try {
      const assessment = await createSupabaseAssessmentFromTemplate(template);
      setCreationOpen(false);
      setCreationType("choose");
      setIndividualSetup({ assessmentId: assessment.id, templateMode: false });
    } catch (createError) {
      setError(getErrorMessage(createError, messages.assessmentCreate.createError));
    } finally {
      setCreating(false);
    }
  }

  async function handleUseUserTemplate(templateAssessment: AssessmentBundle["assessment"]) {
    if (!isSupabaseConfigured || creating) return;
    setCreating(true);
    setError(null);
    try {
      const assessment = await createSupabaseAssessmentFromExistingTemplate(templateAssessment);
      setCreationOpen(false);
      setCreationType("choose");
      setIndividualSetup({ assessmentId: assessment.id, templateMode: false });
    } catch (createError) {
      setError(getErrorMessage(createError, messages.assessmentCreate.createError));
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteTemplate(templateAssessment: AssessmentBundle["assessment"]) {
    try {
      await deleteSupabaseAssessment(templateAssessment.id);
      unmarkAssessmentAsTemplate(templateAssessment.id, designer.id);
      setBundles((current) => current.filter((bundle) => bundle.assessment.id !== templateAssessment.id));
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, messages.template.delete.error));
    }
  }

  async function handleRitualFile(file: File | null) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setError("The Ritual file is too large. Choose a file smaller than 1 MB.");
      return;
    }
    try {
      const parsed = validateRitualFile(JSON.parse(await file.text()));
      stashPendingRitualFile(parsed);
      router.push(href("/live/setup"));
    } catch {
      setError("This is not a valid Ritual file.");
    }
  }

  return (
    <>
      <div className="relative">
        <h1 className="font-heading text-5xl font-semibold leading-none text-bone">{messages.dashboard.title}</h1>
        <div className="relative mt-8 flex flex-wrap gap-3">
          <input
            ref={ritualFileInputRef}
            type="file"
            accept="application/json,.json,.ritual"
            className="sr-only"
            onChange={(event) => {
              void handleRitualFile(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
          <span ref={creationPopoverRef} className="relative inline-flex">
            <Button
              type="button"
              disabled={!isSupabaseConfigured}
              onClick={() => {
                setCreationOpen((open) => !open);
                setCreationType("choose");
              }}
            >
              New ritual
            </Button>
            {creationOpen ? (
              <div className="absolute left-0 top-[calc(100%+0.625rem)] z-50">
                {creationType === "choose" ? (
                  <Card className="ritual-popover-surface w-[min(calc(100vw-2rem),24rem)] border p-3">
                    <div className="space-y-1">
                      <button type="button" className="block w-full rounded-md px-3 py-3 text-left transition hover:bg-bone/6 focus:outline-none focus:ring-2 focus:ring-mint" onClick={() => {
                        setCreationOpen(false);
                        setLiveCloseRequested(false);
                        setLiveSetupOpen(true);
                      }}>
                        <h2 className="font-heading text-xl font-semibold text-bone">Collective</h2>
                        <p className="mt-1 text-sm leading-5 text-bone/60">Together, in real time.</p>
                      </button>
                      <button type="button" className="block w-full rounded-md px-3 py-3 text-left transition hover:bg-bone/6 focus:outline-none focus:ring-2 focus:ring-mint" onClick={() => setCreationType("assessment")}>
                        <h2 className="font-heading text-xl font-semibold text-bone">Individual</h2>
                        <p className="mt-1 text-sm leading-5 text-bone/60">Completed independently.</p>
                      </button>
                      <div className="mx-3 border-t border-bone/10" />
                      <button type="button" className="w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-bone/62 transition hover:bg-bone/6 hover:text-bone focus:outline-none focus:ring-2 focus:ring-mint" onClick={() => ritualFileInputRef.current?.click()}>Import ritual</button>
                    </div>
                  </Card>
                ) : <AssessmentCreationCard
                  creating={creating}
                  userTemplates={templateBundles.map((bundle) => bundle.assessment)}
                  onCreateBlank={() => void handleCreateBlankAssessment()}
                  onUseDefaultTemplate={(template) => void handleUseTemplate(template)}
                  onUseUserTemplate={(assessment) => void handleUseUserTemplate(assessment)}
                  onBuildTemplate={() => void handleBuildTemplate()}
                  onDeleteTemplate={(assessment) => void handleDeleteTemplate(assessment)}
                />}
              </div>
            ) : null}
          </span>
        </div>
      </div>
      <div className="mt-8">
        {!isSupabaseConfigured ? (
          <Card>
            <p className="text-bone/62">{messages.auth.supabaseRequired}</p>
          </Card>
        ) : loading ? (
          <Card><p className="text-bone/50">{messages.app.loading}</p></Card>
        ) : error ? (
          <Card><p className="text-orange">{error}</p></Card>
        ) : assessmentBundles.length || liveSessions.length ? (
          <div className="grid gap-4 xl:grid-cols-3">
            {liveSessions.map((session) => <LiveSessionCard key={`live:${session.id}`} session={session} onDelete={handleDeleteLiveSession} />)}
            {assessmentBundles.map((bundle) => (
              <AssessmentManagementCard
                key={bundle.assessment.id}
                assessment={bundle.assessment}
                responses={bundle.responses}
                currentUserId={designer.id}
                onDelete={handleDeleteAssessment}
                onUpdate={handleUpdateAssessment}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={messages.dashboard.emptyTitle}
            body={messages.dashboard.emptyBody}
            action={<Button type="button" onClick={() => {
              setCreationType("choose");
              setCreationOpen(true);
            }}>{messages.assessmentCreate.newAssessment}</Button>}
          />
        )}
      </div>
      {liveSetupOpen ? <CreationDialog label={messages.home.collectiveEyebrow} closing={liveCloseRequested} onClose={() => setLiveCloseRequested(true)}>
        <SetupContent embedded closeRequested={liveCloseRequested} onDismiss={() => void handleCloseLiveSetup()} />
      </CreationDialog> : null}
      {individualSetup ? <CreationDialog label={messages.builder.individualTitle} onClose={() => void handleCloseIndividualSetup()}>
        <AssessmentBuilder
          assessmentId={individualSetup.assessmentId}
          ownerId={designer.id}
          initialTemplateMode={individualSetup.templateMode}
          embedded
          onDismiss={() => void handleCloseIndividualSetup()}
        />
      </CreationDialog> : null}
    </>
  );
}

function CreationDialog({ children, label, onClose, closing = false }: { children: React.ReactNode; label: string; onClose?: () => void; closing?: boolean }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="ritual-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onMouseDown={() => !closing && onClose?.()}>
      <div role="dialog" aria-modal="true" aria-label={label} className="ritual-overlay-surface ritual-dialog-panel modal-scroll relative max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto rounded-lg border p-5 sm:p-8" onMouseDown={(event) => event.stopPropagation()}>
        {onClose ? <button type="button" aria-label="Close" disabled={closing} onClick={onClose} className="absolute right-4 top-4 z-10 rounded-md p-2 text-bone/55 transition hover:bg-bone/10 hover:text-bone focus:outline-none focus:ring-2 focus:ring-mint disabled:cursor-not-allowed disabled:opacity-50"><X size={18} aria-hidden="true" /></button> : null}
        {children}
      </div>
    </div>
  );
}
