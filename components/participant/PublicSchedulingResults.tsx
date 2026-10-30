"use client";

import { PublicSchedulingResults as PublicResults } from "@/lib/supabase/assessmentRepository";
import { slotLabel } from "@/lib/activities/scheduling";
import { useLocale } from "@/lib/i18n/useLocale";

export function PublicSchedulingResults({ results }: { results: PublicResults }) {
  const { locale, messages } = useLocale();
  const singleActivityResponseCount = results.activities.length === 1 ? results.activities[0].respondentCount : null;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-heading text-3xl font-semibold leading-tight text-bone sm:text-4xl">{results.title}</h1>
        <p className="mt-3 text-base text-bone/62">
          {results.status === "closed"
            ? messages.participant.scheduling.availabilityEnded
            : singleActivityResponseCount === null
              ? messages.participant.scheduling.availabilityOpen
              : messages.participant.scheduling.responsesReceived.replace("{count}", String(singleActivityResponseCount))}
        </p>
      </section>
      {results.activities.map((activity) => {
        const confirmed = activity.slots.find((slot) => slot.id === activity.confirmedSlotId);
        const counts = new Map(activity.availability.map((row) => [row.slotId, row]));

        return (
          <section key={activity.id} className="border-t border-bone/10 pt-5">
            <h2 className="font-heading text-2xl font-semibold text-bone">{activity.title}</h2>
            {results.activities.length > 1 ? (
              <p className="mt-1 text-sm text-bone/55">
                {messages.participant.scheduling.responsesReceived.replace("{count}", String(activity.respondentCount))}
              </p>
            ) : null}
            {confirmed ? (
              <p className="mt-5 text-sm font-medium text-mint">
                {messages.participant.scheduling.confirmedSlot}: {slotLabel(confirmed, locale, activity.timezone)}
              </p>
            ) : results.status === "closed" ? (
              <p className="mt-5 text-sm text-bone/55">{messages.participant.scheduling.awaitingConfirmation}</p>
            ) : null}
            <div className="mt-5 divide-y divide-bone/10 border-y border-bone/10">
              {activity.slots.map((slot) => {
                const count = counts.get(slot.id)?.count ?? 0;
                const availabilityLabel = activity.respondentCount
                  ? messages.participant.scheduling.availableOfTotal
                      .replace("{count}", String(count))
                      .replace("{total}", String(activity.respondentCount))
                  : messages.participant.scheduling.noResponses;

                return (
                  <div key={slot.id} className="flex justify-between gap-4 py-3">
                    <span>{slotLabel(slot, locale, activity.timezone)}</span>
                    <span className="text-bone/60">{availabilityLabel}</span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
