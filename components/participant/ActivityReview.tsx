"use client";

import { Activity, ActivityAnswer } from "@/types/activity";
import { ExplorationSummary } from "@/components/activities/exploration/ExplorationSummary";
import { FramingSummary } from "@/components/activities/framing/FramingSummary";
import { PlanningReportSummary } from "@/components/activities/planning-report/PlanningReportSummary";
import { PrioritizationSummary } from "@/components/activities/prioritization/PrioritizationSummary";
import { ProfilingSummary } from "@/components/activities/profiling/ProfilingSummary";
import { SchedulingSummary } from "@/components/activities/scheduling/SchedulingSummary";

export function ActivityReview({ activity, answer }: { activity: Activity; answer: ActivityAnswer }) {
  return (
    <section>
      <h1 className="font-heading text-3xl font-semibold leading-tight text-bone">{activity.title}</h1>
      <div className="mt-6 border-y border-bone/10 py-1">
        {activity.type === "profiling" && "fields" in answer ? <ProfilingSummary activity={activity} answer={answer} /> : null}
        {activity.type === "exploration" && "items" in answer ? <ExplorationSummary answer={answer} /> : null}
        {activity.type === "prioritization" && "rankedItems" in answer ? <PrioritizationSummary answer={answer} /> : null}
        {activity.type === "framing" && "answer" in answer ? <FramingSummary activity={activity} answer={answer} /> : null}
        {activity.type === "planning_report" ? <PlanningReportSummary /> : null}
        {activity.type === "scheduling" && "slotIds" in answer ? <SchedulingSummary activity={activity} answer={answer} /> : null}
      </div>
    </section>
  );
}
