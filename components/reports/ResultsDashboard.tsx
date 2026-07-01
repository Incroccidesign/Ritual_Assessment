"use client";

import { useEffect, useState } from "react";
import { Assessment } from "@/types/assessment";
import { Designer } from "@/lib/auth/designerAuth";
import { Participant } from "@/types/participant";
import { AssessmentResponse } from "@/types/response";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ExportMenuButton } from "@/components/reports/ExportMenuButton";
import { GroupedActivityResults } from "@/components/reports/GroupedActivityResults";
import { Card, StepHeader } from "@/components/ritual-ui";
import { fetchAssessmentBundle } from "@/lib/supabase/assessmentRepository";
import { useLocale } from "@/lib/i18n/useLocale";

export function ResultsDashboard({ assessmentId, designer }: { assessmentId: string; designer: Designer }) {
  const { messages } = useLocale();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function refresh() {
      setLoading(true);
      setError(null);
      try {
        const bundle = await fetchAssessmentBundle(assessmentId, designer.id);
        if (!active) return;
        setAssessment(bundle?.assessment ?? null);
        setParticipants(bundle?.participants ?? []);
        setResponses(bundle?.responses ?? []);
      } catch (resultsError) {
        if (!active) return;
        setError(resultsError instanceof Error ? resultsError.message : messages.auth.signInError);
        setAssessment(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    void refresh();
    return () => {
      active = false;
    };
  }, [assessmentId, designer.id, messages.auth.signInError]);

  if (loading) {
    return (
      <DashboardShell>
        <Card><p className="text-bone/50">{messages.app.loading}</p></Card>
      </DashboardShell>
    );
  }

  if (!assessment) {
    return (
      <DashboardShell>
        <Card><p className={error ? "text-orange" : "text-bone/50"}>{error ?? messages.common.empty}</p></Card>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <StepHeader title={messages.reports.title} body={assessment.title} />
        <div className="flex flex-wrap gap-3">
          <ExportMenuButton assessment={assessment} participants={participants} responses={responses} disabled={!responses.length} />
        </div>
      </div>
      <div className="mt-8 space-y-6">
        <Card>
          <GroupedActivityResults assessment={assessment} participants={participants} responses={responses} />
        </Card>
      </div>
    </DashboardShell>
  );
}
