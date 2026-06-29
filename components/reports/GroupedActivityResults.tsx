"use client";

import { useMemo, useState } from "react";
import { Assessment } from "@/types/assessment";
import { Activity, PlanningReportActivity, ProfilingActivity, ProfilingField } from "@/types/activity";
import { Participant } from "@/types/participant";
import { AssessmentResponse } from "@/types/response";
import { PlanningReportPreview } from "@/components/planning-report/PlanningReportPreview";
import { AssessmentSummary } from "@/components/reports/AssessmentSummary";
import { Button, SubtlePanel } from "@/components/ritual-ui";
import { displayProfilingAnswer } from "@/lib/activities/otherOption";
import { useLocale } from "@/lib/i18n/useLocale";
import { downloadPlanningReportDocx } from "@/lib/planning-report/exportPlanningReportDocx";
import { generatePlanningReportModel } from "@/lib/planning-report/generatePlanningReport";
import { formatDateTime } from "@/lib/utils/dates";

type ParticipantRow = {
  participantCode: string;
  organization: string;
  sector: string;
  country: string;
  role: string;
  status: string;
  submitted: string;
};

type ProfileKey = "organization" | "sector" | "country" | "role";

function activitiesByType(assessment: Assessment, type: Activity["type"]) {
  return assessment.activities.filter((activity) => activity.type === type).sort((a, b) => a.orderIndex - b.orderIndex);
}

function answersForActivity(activityId: string, responses: AssessmentResponse[]) {
  return responses.flatMap((response) =>
    response.activityResponses
      .filter((activityResponse) => activityResponse.activityId === activityId)
      .map((activityResponse) => ({ response, answer: activityResponse.answer }))
  );
}

function prioritizationStats(activity: Activity, responses: AssessmentResponse[]) {
  if (activity.type !== "prioritization") return [];
  const rows = new Map<string, { label: string; ranks: number[]; first: number; topThree: number }>();
  answersForActivity(activity.id, responses).forEach(({ answer }) => {
    if (!("rankedItems" in answer)) return;
    answer.rankedItems.forEach((item) => {
      const current = rows.get(item.sourceItemId) ?? { label: item.label, ranks: [], first: 0, topThree: 0 };
      current.ranks.push(item.rank);
      if (item.rank === 1) current.first += 1;
      if (item.rank <= 3) current.topThree += 1;
      rows.set(item.sourceItemId, current);
    });
  });
  return Array.from(rows.values())
    .map((row) => ({ ...row, average: row.ranks.reduce((sum, rank) => sum + rank, 0) / row.ranks.length }))
    .sort((a, b) => a.average - b.average);
}

function Section({
  title,
  body,
  children
}: {
  title: string;
  body?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-bone/10 pt-6 first:border-t-0 first:pt-0">
      <h3 className="font-heading text-2xl font-semibold text-bone">{title}</h3>
      {body ? <p className="mt-2 max-w-3xl text-sm leading-6 text-bone/58">{body}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ResultBlock({
  title,
  body,
  children
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-heading text-xl font-semibold text-bone">{title}</h4>
        <p className="mt-1 text-sm text-bone/58">{body}</p>
      </div>
      {children}
    </div>
  );
}

function participantCodeMap(participants: Participant[], responses: AssessmentResponse[]) {
  const participantOrder = [...participants].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const missingParticipantIds = responses
    .map((response) => response.participantId)
    .filter((participantId) => !participantOrder.some((participant) => participant.id === participantId));

  const allIds = [
    ...participantOrder.map((participant) => participant.id),
    ...missingParticipantIds
  ];

  return new Map(
    allIds.map((participantId, index) => [
      participantId,
      `P${String(index + 1).padStart(2, "0")}`
    ])
  );
}

function participantLabel(codeMap: Map<string, string>, participantId: string) {
  return codeMap.get(participantId) ?? participantId;
}

function normalizeFieldLabel(label: string) {
  return label.trim().toLowerCase();
}

function resolveProfileKey(field: ProfilingField): ProfileKey | null {
  const label = normalizeFieldLabel(field.label);
  if (label.includes("organization") || label.includes("organisation") || label.includes("company")) return "organization";
  if (label.includes("sector") || label.includes("industry") || label.includes("domaine")) return "sector";
  if (label.includes("country") || label.includes("pays")) return "country";
  if (label.includes("role") || label.includes("respondent")) return "role";
  return null;
}

function collectParticipantProfiles(assessment: Assessment, responses: AssessmentResponse[]) {
  const emptyLabel = "";
  const profileMap = new Map<string, Record<ProfileKey, string>>();
  const profilingActivities = activitiesByType(assessment, "profiling") as ProfilingActivity[];

  profilingActivities.forEach((activity) => {
    const fieldsById = new Map(
      activity.fields
        .map((field) => {
          const key = resolveProfileKey(field);
          return key ? [field.id, key] as const : null;
        })
        .filter((item): item is readonly [string, ProfileKey] => Boolean(item))
    );

    answersForActivity(activity.id, responses).forEach(({ response, answer }) => {
      if (!("fields" in answer)) return;
      const current = profileMap.get(response.participantId) ?? {
        organization: "",
        sector: "",
        country: "",
        role: ""
      };

      activity.fields.forEach((field) => {
        const value = displayProfilingAnswer(field, answer, emptyLabel);
        const fieldId = field.id;
        const key = fieldsById.get(fieldId);
        if (!key || !value || current[key]) return;
        current[key] = value;
      });

      profileMap.set(response.participantId, current);
    });
  });

  return profileMap;
}

function participantStatusLabel(status: string, messages: ReturnType<typeof useLocale>["messages"]) {
  if (status === "submitted") return messages.dashboard.completed;
  if (status === "in_progress" || status === "started") return messages.reports.inProgress;
  return messages.dashboard.stopped;
}

function ParticipantsTable({
  assessment,
  participants,
  responses
}: {
  assessment: Assessment;
  participants: Participant[];
  responses: AssessmentResponse[];
}) {
  const { messages } = useLocale();
  const codeMap = participantCodeMap(participants, responses);
  const profiles = collectParticipantProfiles(assessment, responses);
  const responseMap = new Map(responses.map((response) => [response.participantId, response]));

  const rows: ParticipantRow[] = [...participants]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((participant) => {
      const response = responseMap.get(participant.id);
      const profile = profiles.get(participant.id);
      return {
        participantCode: participantLabel(codeMap, participant.id),
        organization: profile?.organization || participant.companyName || messages.common.empty,
        sector: profile?.sector || messages.common.empty,
        country: profile?.country || messages.common.empty,
        role: profile?.role || messages.common.empty,
        status: participantStatusLabel(response?.status ?? participant.status, messages),
        submitted: formatDateTime(response?.submittedAt ?? participant.submittedAt) || messages.common.empty
      };
    });

  if (!rows.length) return <SubtlePanel><p className="text-bone/45">{messages.common.empty}</p></SubtlePanel>;

  return (
    <SubtlePanel className="overflow-x-auto">
      <table className="w-full min-w-[52rem] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.16em] text-bone/38">
          <tr>
            <th className="py-3 pe-4">{messages.reports.participants}</th>
            <th className="py-3 pe-4">{messages.dashboard.organization}</th>
            <th className="py-3 pe-4">{messages.dashboard.sector}</th>
            <th className="py-3 pe-4">{messages.activityTypes.country}</th>
            <th className="py-3 pe-4">{messages.dashboard.role}</th>
            <th className="py-3 pe-4">{messages.dashboard.status}</th>
            <th className="py-3 pe-4">{messages.dashboard.submittedLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bone/10 text-bone/72">
          {rows.map((row) => (
            <tr key={row.participantCode}>
              <td className="py-3 pe-4 font-medium text-bone">{row.participantCode}</td>
              <td className="py-3 pe-4">{row.organization}</td>
              <td className="py-3 pe-4">{row.sector}</td>
              <td className="py-3 pe-4">{row.country}</td>
              <td className="py-3 pe-4">{row.role}</td>
              <td className="py-3 pe-4">{row.status}</td>
              <td className="py-3 pe-4">{row.submitted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SubtlePanel>
  );
}

function ExplorationResults({ assessment, responses, participants }: { assessment: Assessment; responses: AssessmentResponse[]; participants: Participant[] }) {
  const { messages } = useLocale();
  const activities = activitiesByType(assessment, "exploration");
  const codeMap = participantCodeMap(participants, responses);

  if (!activities.length) return <SubtlePanel><p className="text-bone/45">{messages.common.empty}</p></SubtlePanel>;

  return (
    <div className="space-y-5">
      {activities.map((activity) => {
        const answers = answersForActivity(activity.id, responses);
        const items = answers.flatMap((item) => ("items" in item.answer ? item.answer.items : []));
        const predefinedCounts = new Map<string, number>();
        items.filter((item) => item.source === "predefined").forEach((item) => {
          predefinedCounts.set(item.label, (predefinedCounts.get(item.label) ?? 0) + 1);
        });
        const customItems = items.filter((item) => item.source !== "predefined");

        return (
          <SubtlePanel key={activity.id}>
            <p className="font-semibold text-bone">{activity.title}</p>
            <p className="mt-1 text-sm text-bone/58">{messages.dashboard.selectedChallenges}</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-bone/38">{messages.dashboard.predefinedChallenges}</p>
                <div className="mt-3 space-y-2">
                  {Array.from(predefinedCounts.entries()).map(([label, count]) => (
                    <div key={label} className="flex justify-between gap-4 rounded-md border border-bone/10 bg-night/45 px-4 py-3">
                      <span>{label}</span>
                      <span className="text-mint">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-bone/38">{messages.reports.customItems}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {customItems.length ? customItems.map((item) => (
                    <span key={item.id} className="rounded-full border border-bone/10 bg-night/55 px-3 py-2 text-sm text-bone/72">
                      {item.source === "other" ? `${messages.otherOption.resultsLabel}: ${item.label}` : item.label}
                    </span>
                  )) : <span className="text-sm text-bone/45">{messages.dashboard.noCustomResponses}</span>}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-bone/38">{messages.dashboard.participantSelections}</p>
                <div className="mt-3 space-y-2">
                  {answers.map(({ response, answer }) => (
                    "items" in answer ? (
                      <div key={response.id} className="rounded-md border border-bone/10 bg-night/45 px-4 py-3">
                        <p className="text-xs text-bone/38">{participantLabel(codeMap, response.participantId)}</p>
                        <p className="mt-1 text-bone/72">
                          {answer.items.map((item) => item.source === "other" ? `${messages.otherOption.resultsLabel}: ${item.label}` : item.label).join(", ") || messages.common.empty}
                        </p>
                      </div>
                    ) : null
                  ))}
                </div>
              </div>
            </div>
          </SubtlePanel>
        );
      })}
    </div>
  );
}

function PrioritizationResults({ assessment, responses, participants }: { assessment: Assessment; responses: AssessmentResponse[]; participants: Participant[] }) {
  const { messages } = useLocale();
  const activities = activitiesByType(assessment, "prioritization");
  const codeMap = participantCodeMap(participants, responses);

  if (!activities.length) return <SubtlePanel><p className="text-bone/45">{messages.common.empty}</p></SubtlePanel>;

  return (
    <div className="space-y-5">
      {activities.map((activity) => {
        const stats = prioritizationStats(activity, responses);
        const answers = answersForActivity(activity.id, responses);
        return (
          <SubtlePanel key={activity.id} className="overflow-x-auto">
            <p className="font-semibold text-bone">{activity.title}</p>
            <table className="mt-4 w-full min-w-[34rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-bone/38">
                <tr>
                  <th className="py-3 pe-4">{messages.dashboard.challenge}</th>
                  <th className="py-3 pe-4">{messages.reports.averageRank}</th>
                  <th className="py-3 pe-4">{messages.reports.rankedFirst}</th>
                  <th className="py-3 pe-4">{messages.reports.topThree}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bone/10 text-bone/72">
                {stats.map((row) => (
                  <tr key={row.label}>
                    <td className="py-3 pe-4">{row.label}</td>
                    <td className="py-3 pe-4">{row.average.toFixed(2)}</td>
                    <td className="py-3 pe-4">{row.first}</td>
                    <td className="py-3 pe-4">{row.topThree}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.16em] text-bone/38">{messages.dashboard.participantRankings}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {answers.map(({ response, answer }) => (
                  "rankedItems" in answer ? (
                    <div key={response.id} className="rounded-md border border-bone/10 bg-night/45 p-4">
                      <p className="text-xs text-bone/38">{participantLabel(codeMap, response.participantId)}</p>
                      <ol className="mt-2 space-y-1 text-bone/72">
                        {answer.rankedItems.map((item) => <li key={item.sourceItemId}>{item.rank}. {item.label}</li>)}
                      </ol>
                    </div>
                  ) : null
                ))}
              </div>
            </div>
          </SubtlePanel>
        );
      })}
    </div>
  );
}

function FramingResults({ assessment, responses, participants }: { assessment: Assessment; responses: AssessmentResponse[]; participants: Participant[] }) {
  const { messages } = useLocale();
  const activities = activitiesByType(assessment, "framing");
  const codeMap = participantCodeMap(participants, responses);

  if (!activities.length) return <SubtlePanel><p className="text-bone/45">{messages.common.empty}</p></SubtlePanel>;

  return (
    <div className="space-y-5">
      {activities.map((activity) => {
        const answers = answersForActivity(activity.id, responses);
        return (
          <SubtlePanel key={activity.id}>
            <p className="font-semibold text-bone">{activity.title}</p>
            <p className="mt-1 text-sm text-bone/58">{messages.dashboard.emergingNeeds}</p>
            <div className="mt-4 space-y-3">
              {answers.map(({ response, answer }) => (
                "answer" in answer ? (
                  <div key={response.id} className="rounded-md border border-bone/10 bg-night/45 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-bone/38">{participantLabel(codeMap, response.participantId)}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-mint">{messages.dashboard.priorityOrder}</p>
                    <ol className="mt-2 space-y-1 text-sm text-bone/62">
                      {answer.sourceRanking.map((item, index) => <li key={`${item}-${index}`}>{index + 1}. {item}</li>)}
                    </ol>
                    <p className="mt-4 whitespace-pre-wrap text-bone/78">{answer.answer}</p>
                  </div>
                ) : null
              ))}
            </div>
          </SubtlePanel>
        );
      })}
    </div>
  );
}

function PlanningReportResults({ assessment, responses, participants }: { assessment: Assessment; responses: AssessmentResponse[]; participants: Participant[] }) {
  const { messages } = useLocale();
  const reportActivity = activitiesByType(assessment, "planning_report")[0] as PlanningReportActivity | undefined;
  const submittedResponses = responses.filter((response) => response.status === "submitted");
  const codeMap = participantCodeMap(participants, responses);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(submittedResponses[0]?.id ?? null);
  const selectedResponse = submittedResponses.find((response) => response.id === selectedResponseId) ?? submittedResponses[0] ?? null;
  const model = useMemo(
    () => reportActivity && selectedResponse
      ? generatePlanningReportModel(assessment, selectedResponse, reportActivity, messages)
      : null,
    [assessment, messages, reportActivity, selectedResponse]
  );

  if (!reportActivity) return null;
  if (!submittedResponses.length) return <SubtlePanel><p className="text-bone/45">{messages.common.empty}</p></SubtlePanel>;

  return (
    <div className="space-y-5">
      <SubtlePanel className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.16em] text-bone/38">
            <tr>
              <th className="py-3 pe-4">{messages.reports.participants}</th>
              <th className="py-3 pe-4">{messages.dashboard.submittedLabel}</th>
              <th className="py-3 pe-4">{messages.planningReport.activity.label}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bone/10 text-bone/72">
            {submittedResponses.map((response) => (
              <tr key={response.id}>
                <td className="py-3 pe-4 font-medium text-bone">{participantLabel(codeMap, response.participantId)}</td>
                <td className="py-3 pe-4">{formatDateTime(response.submittedAt) || messages.common.empty}</td>
                <td className="py-3 pe-4">
                  <Button
                    type="button"
                    variant={selectedResponse?.id === response.id ? "primary" : "secondary"}
                    className="min-h-9 px-3"
                    onClick={() => setSelectedResponseId(response.id)}
                  >
                    {messages.planningReport.view}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SubtlePanel>

      {model ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={() => void downloadPlanningReportDocx(model)}>
              {messages.planningReport.download}
            </Button>
          </div>
          <PlanningReportPreview model={model} />
        </div>
      ) : null}
    </div>
  );
}

export function GroupedActivityResults({
  assessment,
  participants,
  responses,
  exportActions
}: {
  assessment: Assessment;
  participants: Participant[];
  responses: AssessmentResponse[];
  exportActions?: React.ReactNode;
}) {
  const { messages } = useLocale();
  const hasPlanningReport = activitiesByType(assessment, "planning_report").length > 0;

  return (
    <div className="space-y-7">
      <Section title={messages.dashboard.overview}>
        <AssessmentSummary assessment={assessment} participants={participants} responses={responses} />
      </Section>

      <Section title={messages.reports.participants}>
        <ParticipantsTable assessment={assessment} participants={participants} responses={responses} />
      </Section>

      <Section title={messages.reports.activityResults}>
        <div className="space-y-7">
          <ResultBlock title={messages.dashboard.exploration} body={messages.dashboard.explorationBody}>
            <ExplorationResults assessment={assessment} responses={responses} participants={participants} />
          </ResultBlock>
          <ResultBlock title={messages.dashboard.prioritization} body={messages.dashboard.prioritizationBody}>
            <PrioritizationResults assessment={assessment} responses={responses} participants={participants} />
          </ResultBlock>
          <ResultBlock title={messages.dashboard.framing} body={messages.dashboard.framingBody}>
            <FramingResults assessment={assessment} responses={responses} participants={participants} />
          </ResultBlock>
        </div>
      </Section>

      {hasPlanningReport ? (
        <Section title={messages.planningReport.activity.label}>
          <PlanningReportResults assessment={assessment} responses={responses} participants={participants} />
        </Section>
      ) : null}

      {exportActions ? <Section title={messages.dashboard.exportActions}>{exportActions}</Section> : null}
    </div>
  );
}
