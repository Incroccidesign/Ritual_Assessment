"use client";

import { FramingActivity, FramingAnswer } from "@/types/activity";
import { SubtlePanel } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

export function FramingSummary({ activity, answer }: { activity: FramingActivity; answer: FramingAnswer }) {
  const { messages } = useLocale();
  const questionAnswers = answer.questionAnswers ?? {};
  const hasQuestionAnswers = activity.questions.some((question) => questionAnswers[question.id]?.trim());

  return (
    <SubtlePanel>
      <p className="font-heading text-2xl font-semibold text-bone">{messages.activities.framing.savedSummary}</p>
      {hasQuestionAnswers ? (
        <div className="mt-4 space-y-4">
          {activity.questions.map((question) => {
            const value = questionAnswers[question.id]?.trim();
            if (!value) return null;
            return (
              <div key={question.id}>
                <p className="text-sm font-semibold text-bone">{question.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-base leading-7 text-bone/72">{value}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-bone/72">{answer.answer}</p>
      )}
    </SubtlePanel>
  );
}
