"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ActivityAnswer, ExplorationAnswer, FramingAnswer, PrioritizationAnswer, ProfilingAnswer } from "@/types/activity";
import { Assessment } from "@/types/assessment";
import { AssessmentResponse } from "@/types/response";
import { ExplorationParticipant } from "@/components/activities/exploration/ExplorationParticipant";
import { FramingParticipant } from "@/components/activities/framing/FramingParticipant";
import { PlanningReportDownload, PlanningReportParticipant } from "@/components/activities/planning-report/PlanningReportParticipant";
import { PrioritizationParticipant } from "@/components/activities/prioritization/PrioritizationParticipant";
import { ProfilingParticipant } from "@/components/activities/profiling/ProfilingParticipant";
import { ParticipantShell } from "@/components/layout/ParticipantShell";
import { ActivityIntro } from "@/components/participant/ActivityIntro";
import { ActivityProgress } from "@/components/participant/ActivityProgress";
import { ActivityReview } from "@/components/participant/ActivityReview";
import { CompletionScreen } from "@/components/participant/CompletionScreen";
import { Button, Card } from "@/components/ritual-ui";
import { getExplorationItems, getRankingContext } from "@/lib/activities/dependencies";
import { emptyAnswerForActivity } from "@/lib/activities/responseMapping";
import { validateActivityResponse } from "@/lib/activities/validation";
import { localizeActivityContent } from "@/lib/i18n/localizeActivityContent";
import { useLocale } from "@/lib/i18n/useLocale";
import {
  fetchPublishedAssessmentByToken,
  saveSupabaseActivityResponse,
  startSupabaseParticipantResponse,
  submitSupabaseResponse
} from "@/lib/supabase/assessmentRepository";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/errors";
import { uid } from "@/lib/utils/ids";

type RunnerPhase = "welcome" | "intro" | "interaction" | "summary" | "complete" | "report-download";

function answerForActivity(activity: Activity, response: AssessmentResponse | null): ActivityAnswer {
  return response?.activityResponses.find((item) => item.activityId === activity.id)?.answer ?? emptyAnswerForActivity(activity);
}

function participantTokenFor(publicToken: string) {
  const key = `ritual-participant-token:${publicToken}`;
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const next = uid("participant");
  window.sessionStorage.setItem(key, next);
  return next;
}

function finalPlanningReportIndex(activities: Activity[]) {
  return activities.findLastIndex((activity) => activity.type === "planning_report");
}

export function AssessmentRunner({ token }: { token: string }) {
  const { locale, messages, setLocale } = useLocale();
  const messagesRef = useRef(messages);
  const assessmentLocaleApplied = useRef(false);
  const pendingPhaseRef = useRef<RunnerPhase | null>(null);
  const phaseRef = useRef<RunnerPhase>("welcome");
  const [rawAssessment, setRawAssessment] = useState<Assessment | null>(null);
  const [response, setResponse] = useState<AssessmentResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<RunnerPhase>("welcome");
  const [currentAnswer, setCurrentAnswer] = useState<ActivityAnswer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    let active = true;
    async function loadAssessment() {
      setLoading(true);
      setError(null);
      if (!isSupabaseConfigured) {
        setError(messagesRef.current.auth.supabaseRequired);
        setLoading(false);
        return;
      }
      try {
        const found = await fetchPublishedAssessmentByToken(token);
        if (!active) return;
        if (found && !assessmentLocaleApplied.current && !new URLSearchParams(window.location.search).get("locale")) {
          assessmentLocaleApplied.current = true;
          setLocale(found.language);
        }
        setRawAssessment(found);
        if (!found) return;
        const nextResponse = await startSupabaseParticipantResponse(token, participantTokenFor(token));
        if (!active) return;
        setResponse(nextResponse);
        const orderedActivities = found.activities.slice().sort((a, b) => a.orderIndex - b.orderIndex);
        const reportIndex = finalPlanningReportIndex(orderedActivities);
        const shouldShowReportDownload = nextResponse?.status === "submitted" && reportIndex >= 0;
        const nextIndex = shouldShowReportDownload ? reportIndex : 0;
        const nextActivity = orderedActivities[nextIndex] ?? null;
        setCurrentIndex(nextIndex);
        setCurrentAnswer(nextActivity ? answerForActivity(nextActivity, nextResponse) : null);
        setPhase(nextResponse?.status === "submitted" ? (shouldShowReportDownload ? "report-download" : "complete") : "welcome");
      } catch (loadError) {
        if (!active) return;
        setError(getErrorMessage(loadError, messagesRef.current.participant.notFound));
        setRawAssessment(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadAssessment();
    return () => {
      active = false;
    };
  }, [setLocale, token]);

  const assessment = useMemo(
    () => rawAssessment
      ? { ...rawAssessment, activities: rawAssessment.activities.map((activity) => localizeActivityContent(activity, locale)) }
      : null,
    [locale, rawAssessment]
  );
  const activities = useMemo(() => assessment?.activities.slice().sort((a, b) => a.orderIndex - b.orderIndex) ?? [], [assessment]);
  const activity = activities[currentIndex] ?? null;

  useEffect(() => {
    if (!activity) return;
    setCurrentAnswer(answerForActivity(activity, response));
    if (phaseRef.current === "welcome") return;
    if (response?.status === "submitted") {
      setPhase(activity.type === "planning_report" ? "report-download" : "complete");
      pendingPhaseRef.current = null;
      return;
    }
    if (activity.type === "planning_report") {
      setPhase("interaction");
      pendingPhaseRef.current = null;
      return;
    }
    setPhase(pendingPhaseRef.current ?? "intro");
    pendingPhaseRef.current = null;
  }, [activity?.id]);

  if (loading) {
    return (
      <ParticipantShell>
        <Card><p className="text-bone/56">{messages.app.loading}</p></Card>
      </ParticipantShell>
    );
  }

  if (!assessment) {
    return (
      <ParticipantShell>
        <Card><p className={error ? "text-orange" : "text-bone/56"}>{error ?? messages.participant.notFound}</p></Card>
      </ParticipantShell>
    );
  }

  if (assessment.status !== "published") {
    return (
      <ParticipantShell>
        <Card><p className="text-bone/56">{messages.participant.notPublished}</p></Card>
      </ParticipantShell>
    );
  }

  if (phase === "complete" || !activity || !currentAnswer || !response) {
    return (
      <ParticipantShell>
        <CompletionScreen />
      </ParticipantShell>
    );
  }

  if (phase === "report-download") {
    return (
      <ParticipantShell>
        <Card>
          <h1 className="font-heading text-4xl font-semibold leading-tight text-bone">{messages.participant.completionTitle}</h1>
          <p className="mt-4 whitespace-pre-line text-base leading-7 text-bone/62">{messages.participant.completionBody}</p>
          {activity.type === "planning_report" ? (
            <PlanningReportDownload assessment={assessment} response={response} activity={activity} />
          ) : null}
        </Card>
      </ParticipantShell>
    );
  }

  if (phase === "welcome") {
    return (
      <ParticipantShell>
        <Card>
          <h1 className="font-heading text-4xl font-semibold leading-tight text-bone">{messages.participant.welcome.title}</h1>
          <p className="mt-4 text-base leading-7 text-bone/62">{messages.participant.welcome.description}</p>
          {assessment.estimatedDuration ? (
            <p className="mt-5 rounded-md border border-bone/10 bg-night/35 px-4 py-3 text-sm font-semibold text-bone/58">
              {assessment.estimatedDuration}
            </p>
          ) : null}
          <Button type="button" className="mt-7 w-full min-h-14 text-base" onClick={() => setPhase("intro")}>
            {messages.participant.welcome.cta}
          </Button>
        </Card>
      </ParticipantShell>
    );
  }

  const sourceItems = activity.type === "prioritization" ? getExplorationItems(activity.sourceActivityId, response) : [];
  const sourceRanking = activity.type === "framing" ? getRankingContext(activity.sourceActivityId, response) : [];
  const canComplete = validateActivityResponse(activity, currentAnswer);
  const isFinalPlanningReport = activity.type === "planning_report" && currentIndex >= activities.length - 1;
  const isFramingActivity = activity.type === "framing";
  const isMultiQuestionFraming = isFramingActivity && activity.questions.length > 1;
  const isProfilingActivity = activity.type === "profiling";
  const framingQuestionText = isFramingActivity
    ? isMultiQuestionFraming
      ? activity.prompt
      : activity.questions.map((question) => question.prompt).join("\n\n")
    : "";

  async function completeCurrentActivity() {
    if (!response || !activity || !currentAnswer || !canComplete) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveSupabaseActivityResponse(token, participantTokenFor(token), activity.id, activity.type, currentAnswer);
      if (saved) setResponse(saved);
      if (isFinalPlanningReport) {
        const submitted = await submitSupabaseResponse(token, participantTokenFor(token));
        if (submitted) setResponse(submitted);
        setPhase("report-download");
        return;
      }
      setPhase("summary");
    } catch (saveError) {
      setError(getErrorMessage(saveError, messages.auth.signInError));
    } finally {
      setSaving(false);
    }
  }

  async function goNext() {
    if (!response) return;
    if (currentIndex >= activities.length - 1) {
      setSaving(true);
      setError(null);
      try {
        const submitted = await submitSupabaseResponse(token, participantTokenFor(token));
        if (submitted) setResponse(submitted);
        setPhase("complete");
      } catch (submitError) {
        setError(getErrorMessage(submitError, messages.auth.signInError));
      } finally {
        setSaving(false);
      }
      return;
    }
    setCurrentIndex((current) => current + 1);
  }

  function goBack() {
    if (saving) return;
    setError(null);
    if (phase === "summary") {
      setPhase("interaction");
      return;
    }
    if (phase === "interaction") {
      setPhase("intro");
      return;
    }
    if (phase === "intro" && currentIndex > 0) {
      pendingPhaseRef.current = "summary";
      setCurrentIndex((current) => current - 1);
    }
  }

  const canGoBack = !saving && (phase === "summary" || phase === "interaction" || (phase === "intro" && currentIndex > 0));

  return (
    <ParticipantShell>
      {!isFinalPlanningReport ? <ActivityProgress current={currentIndex} total={activities.length} /> : null}
      {error ? <p className="mb-4 text-sm text-orange">{error}</p> : null}
      {phase === "intro" ? (
        <div className="space-y-4">
          <ActivityIntro activity={activity} onStart={() => setPhase("interaction")} />
          {canGoBack ? (
            <Button type="button" variant="secondary" className="w-full min-h-14 text-base" onClick={goBack}>
              {messages.common.back}
            </Button>
          ) : null}
        </div>
      ) : null}

      {phase === "interaction" ? (
        <Card>
          {!isFinalPlanningReport && !isFramingActivity ? (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mint">{messages.activities[activity.type].label}</p>
          ) : null}
          <h1 className={isFinalPlanningReport ? "font-heading text-4xl font-semibold leading-tight text-bone" : isFramingActivity ? "font-heading text-3xl font-semibold leading-tight text-bone" : "mt-4 font-heading text-3xl font-semibold leading-tight text-bone"}>
            {isFinalPlanningReport ? messages.planningReport.finalSubmit.title : activity.title}
          </h1>
          {!isProfilingActivity ? (
            <p className={isFinalPlanningReport || isFramingActivity ? "mt-4 whitespace-pre-line text-base leading-7 text-bone/62" : "mt-3 text-base leading-7 text-bone/62"}>
              {isFinalPlanningReport ? messages.planningReport.finalSubmit.description : isFramingActivity ? framingQuestionText : activity.prompt}
            </p>
          ) : null}
          <div className="mt-7">
            {activity.type === "profiling" && "fields" in currentAnswer ? (
              <ProfilingParticipant activity={activity} answer={currentAnswer as ProfilingAnswer} onChange={setCurrentAnswer} />
            ) : null}
            {activity.type === "exploration" && "items" in currentAnswer ? (
              <ExplorationParticipant activity={activity} answer={currentAnswer as ExplorationAnswer} onChange={setCurrentAnswer} />
            ) : null}
            {activity.type === "prioritization" && "rankedItems" in currentAnswer ? (
              <PrioritizationParticipant activity={activity} sourceItems={sourceItems} answer={currentAnswer as PrioritizationAnswer} onChange={setCurrentAnswer} />
            ) : null}
            {activity.type === "framing" && "answer" in currentAnswer ? (
              <FramingParticipant activity={activity} ranking={sourceRanking} answer={currentAnswer as FramingAnswer} onChange={setCurrentAnswer} />
            ) : null}
            {activity.type === "planning_report" ? (
              <PlanningReportParticipant />
            ) : null}
          </div>
          <Button type="button" className="mt-7 w-full min-h-14 text-base" disabled={!canComplete || saving} onClick={() => void completeCurrentActivity()}>
            {saving ? messages.app.loading : isFinalPlanningReport ? messages.planningReport.finalSubmit.submit : messages.common.completeActivity}
          </Button>
          {canGoBack ? (
            <Button type="button" variant="secondary" className="mt-3 w-full min-h-14 text-base" disabled={saving} onClick={goBack}>
              {isFinalPlanningReport ? messages.planningReport.finalSubmit.back : messages.common.back}
            </Button>
          ) : null}
        </Card>
      ) : null}

      {phase === "summary" ? (
        <div className="space-y-4">
          <ActivityReview activity={activity} answer={currentAnswer} />
          <Button type="button" className="w-full min-h-14 text-base" disabled={saving} onClick={() => void goNext()}>
            {saving ? messages.app.loading : currentIndex >= activities.length - 1 ? messages.common.submitAssessment : messages.common.next}
          </Button>
          <Button type="button" variant="secondary" className="w-full min-h-14 text-base" disabled={saving} onClick={goBack}>
            {messages.common.back}
          </Button>
        </div>
      ) : null}
    </ParticipantShell>
  );
}
