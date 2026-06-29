"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Designer } from "@/lib/auth/designerAuth";
import { DesignerAuthGate, DesignerSignOutButton } from "@/components/auth/DesignerAuthGate";
import { AssessmentCreationCard } from "@/components/dashboard/AssessmentCreationCard";
import { AssessmentManagementCard } from "@/components/dashboard/AssessmentManagementCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button, Card, EmptyState, StepHeader } from "@/components/ritual-ui";
import { AssessmentTemplate } from "@/data/templates/nasijSustainabilityAssessmentTemplate";
import {
  AssessmentBundle,
  createSupabaseAssessment,
  createSupabaseAssessmentFromExistingTemplate,
  createSupabaseAssessmentFromTemplate,
  deleteSupabaseAssessment,
  fetchDesignerAssessmentBundles
} from "@/lib/supabase/assessmentRepository";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { markAssessmentAsTemplate, templateAssessmentIdsForOwner, unmarkAssessmentAsTemplate } from "@/lib/templates/templateStore";
import { useLocale } from "@/lib/i18n/useLocale";
import { getErrorMessage } from "@/lib/utils/errors";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardShell>
        <DesignerAuthGate>
          {(designer) => <DashboardContent designer={designer} />}
        </DesignerAuthGate>
      </DashboardShell>
    </Suspense>
  );
}

function DashboardContent({ designer }: { designer: Designer }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, messages, href } = useLocale();
  const [bundles, setBundles] = useState<AssessmentBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [creationOpen, setCreationOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creationPopoverRef = useRef<HTMLDivElement | null>(null);
  const newAssessmentButtonRef = useRef<HTMLSpanElement | null>(null);
  const templateIds = useMemo(() => templateAssessmentIdsForOwner(designer.id), [designer.id, bundles]);
  const templateBundles = useMemo(
    () => bundles.filter((bundle) => templateIds.has(bundle.assessment.id)),
    [bundles, templateIds]
  );
  const assessmentBundles = useMemo(
    () => bundles.filter((bundle) => !templateIds.has(bundle.assessment.id)),
    [bundles, templateIds]
  );

  useEffect(() => {
    let active = true;
    async function refresh() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      setError(null);
      try {
        const nextBundles = await fetchDesignerAssessmentBundles(designer.id);
        if (!active) return;
        setBundles(nextBundles);
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
    if (!creationOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (creationPopoverRef.current?.contains(target)) return;
      if (newAssessmentButtonRef.current?.contains(target)) return;
      setCreationOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [creationOpen]);

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    setCreationOpen(true);
    router.replace(href("/dashboard"));
  }, [href, router, searchParams]);

  function handleDeleteAssessment(assessmentId: string) {
    setBundles((current) => current.filter((bundle) => bundle.assessment.id !== assessmentId));
  }

  async function handleCreateBlankAssessment() {
    if (!isSupabaseConfigured || creating) return;
    setCreating(true);
    setError(null);
    try {
      const assessment = await createSupabaseAssessment(locale);
      router.push(href(`/assessments/${assessment.id}/builder`));
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
      router.push(href(`/assessments/${assessment.id}/builder?template=1`));
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
      router.push(href(`/assessments/${assessment.id}/builder`));
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
      router.push(href(`/assessments/${assessment.id}/builder`));
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

  return (
    <>
      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <StepHeader title={messages.dashboard.title} body={messages.dashboard.body} />
        <div className="relative flex flex-wrap gap-3">
          <span ref={newAssessmentButtonRef}>
            <Button
              type="button"
              disabled={!isSupabaseConfigured}
              onClick={() => setCreationOpen((open) => !open)}
            >
              {messages.assessmentCreate.newAssessment}
            </Button>
          </span>
          <DesignerSignOutButton />
          {creationOpen ? (
            <div ref={creationPopoverRef} className="absolute right-0 top-[calc(100%+0.75rem)] z-50">
              <AssessmentCreationCard
                creating={creating}
                userTemplates={templateBundles.map((bundle) => bundle.assessment)}
                onCreateBlank={() => void handleCreateBlankAssessment()}
                onUseDefaultTemplate={(template) => void handleUseTemplate(template)}
                onUseUserTemplate={(assessment) => void handleUseUserTemplate(assessment)}
                onBuildTemplate={() => void handleBuildTemplate()}
                onDeleteTemplate={(assessment) => void handleDeleteTemplate(assessment)}
              />
            </div>
          ) : null}
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
        ) : assessmentBundles.length ? (
          <div className="space-y-5">
            {assessmentBundles.map((bundle) => (
              <AssessmentManagementCard
                key={bundle.assessment.id}
                assessment={bundle.assessment}
                participants={bundle.participants}
                responses={bundle.responses}
                onDelete={handleDeleteAssessment}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={messages.dashboard.emptyTitle}
            body={messages.dashboard.emptyBody}
            action={<Button type="button" onClick={() => setCreationOpen(true)}>{messages.assessmentCreate.newAssessment}</Button>}
          />
        )}
      </div>
    </>
  );
}
