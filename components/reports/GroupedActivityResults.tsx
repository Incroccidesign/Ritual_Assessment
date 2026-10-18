"use client";

import { useEffect, useRef, useState } from "react";
import { Assessment } from "@/types/assessment";
import { Activity, PlanningReportActivity, PrioritizationActivity, ProfilingActivity, ProfilingField, SchedulingActivity } from "@/types/activity";
import { Participant } from "@/types/participant";
import { AssessmentResponse } from "@/types/response";
import { PlanningReportPreview } from "@/components/planning-report/PlanningReportPreview";
import { Button } from "@/components/ritual-ui";
import { displayProfilingAnswer } from "@/lib/activities/otherOption";
import { useLocale } from "@/lib/i18n/useLocale";
import { downloadPlanningReportDocx } from "@/lib/planning-report/exportPlanningReportDocx";
import { generatePlanningReportModel, PlanningReportModel } from "@/lib/planning-report/generatePlanningReport";
import { formatDateTime } from "@/lib/utils/dates";
import { SchedulingResults } from "@/components/activities/scheduling/SchedulingResults";
import { ChevronDown, X } from "lucide-react";

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

function PagedItems<T>({ items, renderItem }: { items: T[]; renderItem: (item: T, index: number) => React.ReactNode }) {
  const { messages } = useLocale();
  const [page, setPage] = useState(0);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  return <div>
    {items.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((item, index) => renderItem(item, currentPage * pageSize + index))}
    {totalPages > 1 ? <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-bone/60"><button type="button" className="min-h-10 underline disabled:opacity-35" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{messages.reports.previousPage}</button><span aria-live="polite">{messages.reports.pageOf.replace("{page}", String(currentPage + 1)).replace("{total}", String(totalPages))}</span><button type="button" className="min-h-10 underline disabled:opacity-35" disabled={currentPage >= totalPages - 1} onClick={() => setPage(currentPage + 1)}>{messages.reports.nextPage}</button></div> : null}
  </div>;
}

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

function PrioritizationTable({ rows }: { rows: ReturnType<typeof prioritizationStats> }) {
  const { messages } = useLocale();
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(rows.length / 8));
  const currentPage = Math.min(page, totalPages - 1);
  return <><table className="mt-4 w-full min-w-[34rem] text-left text-sm">
    <thead className="text-xs uppercase tracking-[0.16em] text-bone/38"><tr><th className="py-3 pe-4">{messages.dashboard.challenge}</th><th className="py-3 pe-4">{messages.reports.averageRank}</th><th className="py-3 pe-4">{messages.reports.rankedFirst}</th><th className="py-3 pe-4">{messages.reports.topThree}</th></tr></thead>
    <tbody className="divide-y divide-bone/10 text-bone/72">{rows.slice(currentPage * 8, (currentPage + 1) * 8).map((row) => <tr key={row.label}><td className="py-3 pe-4">{row.label}</td><td className="py-3 pe-4">{row.average.toFixed(2)}</td><td className="py-3 pe-4">{row.first}</td><td className="py-3 pe-4">{row.topThree}</td></tr>)}</tbody>
  </table>{totalPages > 1 ? <div className="mt-4 flex items-center gap-4 text-sm text-bone/60"><button type="button" className="min-h-10 underline disabled:opacity-35" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{messages.reports.previousPage}</button><span aria-live="polite">{messages.reports.pageOf.replace("{page}", String(currentPage + 1)).replace("{total}", String(totalPages))}</span><button type="button" className="min-h-10 underline disabled:opacity-35" disabled={currentPage >= totalPages - 1} onClick={() => setPage(currentPage + 1)}>{messages.reports.nextPage}</button></div> : null}</>;
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

function TabButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`min-h-11 border-b-2 px-1 py-3 text-left text-sm font-semibold transition ${
        active
          ? "border-bone text-bone"
          : "border-transparent text-bone/55 hover:text-bone"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
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
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolveProfileKey(field: ProfilingField): ProfileKey | null {
  const label = normalizeFieldLabel(`${field.id} ${field.label}`);
  if (
    label.includes("organization") ||
    label.includes("organisation") ||
    label.includes("organizzazione") ||
    label.includes("company") ||
    label.includes("azienda") ||
    label.includes("ente")
  ) return "organization";
  if (
    label.includes("sector") ||
    label.includes("settore") ||
    label.includes("industry") ||
    label.includes("domaine")
  ) return "sector";
  if (
    label.includes("country") ||
    label.includes("paese") ||
    label.includes("pays")
  ) return "country";
  if (
    label.includes("role") ||
    label.includes("ruolo") ||
    label.includes("respondent") ||
    label.includes("respondant") ||
    label.includes("repondant")
  ) return "role";
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
    .filter((participant) => responseMap.has(participant.id))
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

  if (!rows.length) return <p className="text-bone/45">{messages.reports.noCompletedResponses}</p>;

  return <div className="border-y border-bone/10"><PagedItems items={rows} renderItem={(row) => (
    <div key={row.participantCode} className="grid gap-3 border-b border-bone/10 py-5 last:border-0 sm:grid-cols-[10rem_1fr]">
      <p className="font-semibold text-bone">{row.participantCode}</p>
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {[[messages.dashboard.organization, row.organization], [messages.dashboard.sector, row.sector], [messages.activityTypes.country, row.country], [messages.dashboard.role, row.role], [messages.dashboard.submittedLabel, row.submitted]].filter(([, value]) => value !== messages.common.empty).map(([label, value]) => (
          <div key={label}><dt className="text-bone/45">{label}</dt><dd className="mt-1 text-bone/80">{value}</dd></div>
        ))}
      </dl>
    </div>
  )} /></div>;
}

function ExplorationResults({ assessment, responses, participants, activityId }: { assessment: Assessment; responses: AssessmentResponse[]; participants: Participant[]; activityId: string }) {
  const { messages } = useLocale();
  const activities = activitiesByType(assessment, "exploration").filter((activity) => activity.id === activityId);
  const codeMap = participantCodeMap(participants, responses);

  if (!activities.length) return null;

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
          <div key={activity.id}>
            <div className="grid gap-6 md:grid-cols-2">
              {predefinedCounts.size ? <div>
                <p className="text-xs uppercase tracking-[0.16em] text-bone/38">{messages.dashboard.predefinedChallenges}</p>
                <div className="mt-3">
                  <PagedItems items={Array.from(predefinedCounts.entries()).sort((a, b) => b[1] - a[1])} renderItem={([label, count]) => (
                    <div key={label} className="flex justify-between gap-4 border-b border-bone/10 py-3">
                      <span>{label}</span>
                      <span className="text-bone/60">{count}</span>
                    </div>
                  )} />
                </div>
              </div> : null}
              {customItems.length ? <div>
                <p className="text-xs uppercase tracking-[0.16em] text-bone/38">{messages.reports.customItems}</p>
                <div className="mt-3">
                  <PagedItems items={customItems} renderItem={(item, index) => (
                    <p key={`${item.id}-${index}`} className="border-b border-bone/10 py-3 text-sm text-bone/72">
                      {item.source === "other" ? `${messages.otherOption.resultsLabel}: ${item.label}` : item.label}
                    </p>
                  )} />
                </div>
              </div> : null}
            </div>
              <details className="mt-5 border-t border-bone/10 pt-4">
                <summary className="cursor-pointer text-sm font-semibold text-bone/75">{messages.dashboard.participantSelections}</summary>
                <div className="mt-3">
                  <PagedItems items={answers} renderItem={({ response, answer }) => (
                    "items" in answer ? (
                      <div key={response.id} className="border-b border-bone/10 py-3">
                        <p className="text-xs text-bone/38">{participantLabel(codeMap, response.participantId)}</p>
                        <p className="mt-1 text-bone/72">
                          {answer.items.map((item) => item.source === "other" ? `${messages.otherOption.resultsLabel}: ${item.label}` : item.label).join(", ") || messages.common.empty}
                        </p>
                      </div>
                    ) : null
                  )} />
                </div>
              </details>
          </div>
        );
      })}
    </div>
  );
}

function PrioritizationResults({ assessment, responses, participants, activityId }: { assessment: Assessment; responses: AssessmentResponse[]; participants: Participant[]; activityId: string }) {
  const { messages } = useLocale();
  const activities = assessment.activities
    .filter((activity): activity is PrioritizationActivity => activity.type === "prioritization" && activity.id === activityId)
    .sort((left, right) => left.orderIndex - right.orderIndex);
  const codeMap = participantCodeMap(participants, responses);

  if (!activities.length) return null;

  return (
    <div className="space-y-5">
      {activities.map((activity) => {
        const sourceActivity = assessment.activities.find((candidate) => candidate.id === activity.sourceActivityId);
        const isFramingSource = sourceActivity?.type === "framing";
        const stats = prioritizationStats(activity, responses);
        const answers = answersForActivity(activity.id, responses);
        return (
          <div key={activity.id} className="overflow-x-auto">
            {isFramingSource ? <p className="mt-4 max-w-3xl text-sm leading-6 text-bone/58">{messages.activities.prioritization.framingResultsNotice}</p> : <PrioritizationTable rows={stats} />}
            <details className="mt-5 border-t border-bone/10 pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-bone/75">{messages.dashboard.participantRankings}</summary>
              <div className="mt-3">
                <PagedItems items={answers} renderItem={({ response, answer }) => (
                  "rankedItems" in answer ? (
                    <div key={response.id} className="border-b border-bone/10 py-3">
                      <p className="text-xs text-bone/38">{participantLabel(codeMap, response.participantId)}</p>
                      <ol className="mt-2 space-y-1 text-bone/72">
                        {answer.rankedItems.map((item) => <li key={item.sourceItemId}>{item.rank}. {item.label}</li>)}
                      </ol>
                    </div>
                  ) : null
                )} />
              </div>
            </details>
          </div>
        );
      })}
    </div>
  );
}

function FramingResults({ assessment, responses, participants, activityId }: { assessment: Assessment; responses: AssessmentResponse[]; participants: Participant[]; activityId: string }) {
  const { messages } = useLocale();
  const activities = activitiesByType(assessment, "framing").filter((activity) => activity.id === activityId);
  const codeMap = participantCodeMap(participants, responses);

  if (!activities.length) return null;

  return (
    <div className="space-y-5">
      {activities.map((activity) => {
        const answers = answersForActivity(activity.id, responses);
        return (
          <div key={activity.id}>
            <div>
              <PagedItems items={answers} renderItem={({ response, answer }) => (
                "answer" in answer ? (
                  <div key={response.id} className="border-b border-bone/10 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-bone/38">{participantLabel(codeMap, response.participantId)}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-mint">{messages.dashboard.priorityOrder}</p>
                    <ol className="mt-2 space-y-1 text-sm text-bone/62">
                      {answer.sourceRanking.map((item, index) => <li key={`${item}-${index}`}>{index + 1}. {item}</li>)}
                    </ol>
                    <p className="mt-4 whitespace-pre-wrap text-bone/78">{answer.answer}</p>
                  </div>
                ) : null
              )} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProfilingResults({ activity, responses, participants }: { activity: ProfilingActivity; responses: AssessmentResponse[]; participants: Participant[] }) {
  const { messages } = useLocale();
  const codeMap = participantCodeMap(participants, responses);
  const answers = answersForActivity(activity.id, responses);
  return <div><div className="border-y border-bone/10"><PagedItems items={answers} renderItem={({ response, answer }) => "fields" in answer ? <div key={response.id} className="border-b border-bone/10 py-4 last:border-0"><p className="text-sm font-semibold text-bone">{participantLabel(codeMap, response.participantId)}</p><dl className="mt-3 grid gap-3 sm:grid-cols-2">{activity.fields.map((field) => { const value = displayProfilingAnswer(field, answer, ""); return value ? <div key={field.id}><dt className="text-sm text-bone/45">{field.label}</dt><dd className="mt-1 whitespace-pre-wrap text-bone/80">{value}</dd></div> : null; })}</dl></div> : null} /></div>{!answers.length ? <p className="mt-4 text-sm text-bone/45">{messages.dashboard.noResponsesYet}</p> : null}</div>;
}

function SchedulingActivityResults({ assessment, responses, activityId }: { assessment: Assessment; responses: AssessmentResponse[]; activityId: string }) {
  const activities = activitiesByType(assessment, "scheduling").filter((activity) => activity.id === activityId) as SchedulingActivity[];
  if (!activities.length) return null;
  return <div className="space-y-5">{activities.map((activity) => <SchedulingResults key={activity.id} assessmentId={assessment.id} activity={activity} responses={responses} canConfirm={assessment.status === "closed"} />)}</div>;
}

function IndividualReportDialog({ model, onClose }: { model: PlanningReportModel; onClose: () => void }) {
  const { messages } = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return <dialog ref={dialogRef} aria-label={messages.planningReport.view} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }} className="ritual-overlay-surface m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto rounded-lg border border-bone/15 p-5 text-bone backdrop:bg-black/80 sm:p-8">
    <div className="flex justify-end"><button type="button" aria-label={messages.assessmentCreate.close} className="flex size-10 items-center justify-center rounded-md text-bone/70 hover:text-bone focus-visible:outline focus-visible:outline-2 focus-visible:outline-bone" onClick={() => dialogRef.current?.close()}><X size={20} aria-hidden="true" /></button></div>
    <PlanningReportPreview model={model} />
  </dialog>;
}

function PlanningReportResults({ assessment, responses, participants }: { assessment: Assessment; responses: AssessmentResponse[]; participants: Participant[] }) {
  const { messages } = useLocale();
  const reportActivity = activitiesByType(assessment, "planning_report")[0] as PlanningReportActivity | undefined;
  const submittedResponses = responses.filter((response) => response.status === "submitted");
  const codeMap = participantCodeMap(participants, responses);
  const profiles = collectParticipantProfiles(assessment, responses);
  const participantsById = new Map(participants.map((participant) => [participant.id, participant]));
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const selectedResponse = submittedResponses.find((response) => response.id === selectedResponseId) ?? null;
  const model = reportActivity && selectedResponse
    ? generatePlanningReportModel(assessment, selectedResponse, reportActivity, messages)
    : null;

  if (!reportActivity) return null;
  if (!submittedResponses.length) return <p className="text-bone/45">{messages.reports.noCompletedResponses}</p>;

  return (
    <div className="space-y-5">
      <div className="border-y border-bone/10">
            <PagedItems items={submittedResponses} renderItem={(response) => {
              const profile = profiles.get(response.participantId);
              const participant = participantsById.get(response.participantId);
              const organization = profile?.organization || participant?.companyName || messages.common.empty;

              return (
                <div key={response.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-bone/10 py-4 text-sm last:border-0">
                  <div><p className="font-medium text-bone">{participantLabel(codeMap, response.participantId)}{organization !== messages.common.empty ? ` · ${organization}` : ""}</p><p className="mt-1 text-bone/55">{formatDateTime(response.submittedAt) || messages.common.empty}</p></div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-9 px-3"
                        onClick={() => setSelectedResponseId(response.id)}
                      >
                        {messages.planningReport.view}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-9 px-3"
                        onClick={() => void downloadPlanningReportDocx(generatePlanningReportModel(assessment, response, reportActivity, messages))}
                      >
                        {messages.planningReport.download}
                      </Button>
                    </div>
                </div>
              );
            }} />
      </div>

      {model ? <IndividualReportDialog model={model} onClose={() => setSelectedResponseId(null)} /> : null}
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
  const submittedResponses = responses.filter((response) => response.status === "submitted");
  const [activeTab, setActiveTab] = useState<"participants" | "report" | "activities">("activities");
  const [openActivityId, setOpenActivityId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-x-7 border-b border-bone/10">
        <TabButton active={activeTab === "activities"} label={messages.reports.activityResults} onClick={() => setActiveTab("activities")} />
        {hasPlanningReport ? <TabButton active={activeTab === "report"} label={messages.reports.individualReports} onClick={() => setActiveTab("report")} /> : null}
        <TabButton active={activeTab === "participants"} label={messages.reports.participants} onClick={() => setActiveTab("participants")} />
      </div>

      {activeTab === "participants" ? (
        <Section title={messages.reports.participants}>
          <ParticipantsTable assessment={assessment} participants={participants} responses={submittedResponses} />
        </Section>
      ) : null}

      {activeTab === "report" && hasPlanningReport ? (
        <Section title={messages.reports.individualReports}>
          <PlanningReportResults assessment={assessment} responses={submittedResponses} participants={participants} />
        </Section>
      ) : null}

      {activeTab === "activities" ? (
        <Section title={messages.reports.activityResults}>
          {!submittedResponses.length ? <p className="text-bone/55">{messages.reports.noCompletedResponses}</p> : <div className="border-y border-bone/10"><PagedItems items={[...assessment.activities].filter((activity) => activity.type !== "planning_report").sort((a, b) => a.orderIndex - b.orderIndex)} renderItem={(activity) => {
            const props = { assessment, responses: submittedResponses, participants, activityId: activity.id };
            const count = answersForActivity(activity.id, submittedResponses).length;
            const isOpen = openActivityId === activity.id;
            return <section key={activity.id} className="border-b border-bone/10 last:border-0"><button type="button" aria-expanded={isOpen} onClick={() => setOpenActivityId(isOpen ? null : activity.id)} className="flex min-h-20 w-full items-center justify-between gap-4 py-4 text-left"><span className="min-w-0"><span className="block break-words font-heading text-lg font-semibold text-bone">{activity.title}</span><span className="mt-1 block text-sm text-bone/50">{messages.activities[activity.type].label} · {messages.reports.activityResponseCount.replace("{count}", String(count))}</span></span><ChevronDown size={20} className={`shrink-0 text-bone/55 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" /></button>{isOpen ? <div className="pb-6">{activity.type === "scheduling" ? <SchedulingActivityResults {...props} /> : count === 0 ? <p className="text-sm text-bone/50">{messages.dashboard.noResponsesYet}</p> : activity.type === "profiling" ? <ProfilingResults activity={activity} responses={submittedResponses} participants={participants} /> : activity.type === "exploration" ? <ExplorationResults {...props} /> : activity.type === "prioritization" ? <PrioritizationResults {...props} /> : activity.type === "framing" ? <FramingResults {...props} /> : null}</div> : null}</section>;
          }} /></div>}
        </Section>
      ) : null}

      {exportActions ? <Section title={messages.dashboard.exportActions}>{exportActions}</Section> : null}
    </div>
  );
}
