"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Assessment } from "@/types/assessment";
import { Designer } from "@/lib/auth/designerAuth";
import { Participant } from "@/types/participant";
import { AssessmentResponse } from "@/types/response";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ExportMenuButton } from "@/components/reports/ExportMenuButton";
import { GroupedActivityResults } from "@/components/reports/GroupedActivityResults";
import { Button, Card } from "@/components/ritual-ui";
import { fetchAssessmentBundle } from "@/lib/supabase/assessmentRepository";
import { useLocale } from "@/lib/i18n/useLocale";

export function ResultsDashboard({ assessmentId, designer }: { assessmentId: string; designer: Designer }) {
  const { messages, href } = useLocale();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<"idle" | "copied" | "error">("idle");

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
      <DashboardShell designer={designer}>
        <Card><p className="text-bone/50">{messages.app.loading}</p></Card>
      </DashboardShell>
    );
  }

  if (!assessment) {
    return (
      <DashboardShell designer={designer}>
        <Card><p className={error ? "text-orange" : "text-bone/50"}>{error ?? messages.common.empty}</p></Card>
      </DashboardShell>
    );
  }

  const completedResponses = responses.filter((response) => response.status === "submitted");
  const completedParticipants = new Set(completedResponses.map((response) => response.participantId)).size;
  const activityCount = assessment.activities.filter((activity) => activity.type !== "planning_report").length;

  async function copyParticipantLink() {
    if (!assessment?.publicToken) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href(`/participate/${assessment.publicToken}`)}`);
      setLinkState("copied");
    } catch {
      setLinkState("error");
    }
  }

  return (
    <DashboardShell designer={designer}>
      <Link href={href("/dashboard")} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-bone/65 transition hover:text-bone"><ArrowLeft size={16} aria-hidden="true" />{messages.reports.backToRituals}</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <p className="text-sm text-bone/55">{messages.reports.title} · {assessment.status === "published" ? messages.dashboard.published : assessment.status === "paused" ? messages.dashboard.paused : assessment.status === "closed" ? messages.dashboard.closed : messages.dashboard.draft}</p>
          <h1 className="mt-2 break-words font-heading text-2xl font-semibold leading-tight text-bone md:text-3xl">{assessment.title}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {assessment.status === "published" && assessment.publicToken ? <Button type="button" onClick={() => void copyParticipantLink()}>{linkState === "copied" ? messages.dashboard.linkCopied : messages.dashboard.copyLink}</Button> : null}
          <ExportMenuButton assessment={assessment} participants={participants} responses={responses} disabled={!responses.length} />
        </div>
      </div>
      {linkState === "error" && assessment.publicToken ? <p className="mt-3 break-all text-sm text-bone/65" role="status">{messages.reports.copyLinkError} <a className="underline" href={href(`/participate/${assessment.publicToken}`)}>{href(`/participate/${assessment.publicToken}`)}</a></p> : null}
      <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-bone/10 py-5 sm:gap-8">
        {[[messages.reports.completedLabel, completedResponses.length], [messages.reports.completedParticipants, completedParticipants], [messages.reports.activitiesLabel, activityCount]].map(([label, value]) => <div key={label}><dt className="text-xs leading-5 text-bone/55 sm:text-sm">{label}</dt><dd className="mt-1 font-heading text-2xl font-semibold text-bone sm:text-3xl">{value}</dd></div>)}
      </dl>
      <div className="mt-6"><GroupedActivityResults assessment={assessment} participants={participants} responses={responses} /></div>
    </DashboardShell>
  );
}
