"use client";

import { FramingActivity, FramingAnswer, RankedItem } from "@/types/activity";
import { inputClass, SubtlePanel } from "@/components/ritual-ui";
import { RankingContextPanel } from "@/components/activities/framing/RankingContextPanel";
import { useLocale } from "@/lib/i18n/useLocale";

function combinedAnswer(activity: FramingActivity, questionAnswers: Record<string, string>) {
  return activity.questions
    .map((question) => {
      const value = questionAnswers[question.id]?.trim();
      return value ? `${question.title}\n${value}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

export function FramingParticipant({
  activity,
  ranking,
  answer,
  onChange
}: {
  activity: FramingActivity;
  ranking: RankedItem[];
  answer: FramingAnswer;
  onChange: (answer: FramingAnswer) => void;
}) {
  const { messages } = useLocale();
  const questionAnswers = activity.questions.reduce<Record<string, string>>((currentAnswers, question, index) => {
    currentAnswers[question.id] = answer.questionAnswers?.[question.id] ?? (index === 0 ? answer.answer : "");
    return currentAnswers;
  }, {});

  function updateQuestionAnswer(questionId: string, value: string) {
    const nextQuestionAnswers = { ...questionAnswers, [questionId]: value };
    onChange({
      sourceRanking: ranking.map((item) => item.label),
      questionAnswers: nextQuestionAnswers,
      answer: combinedAnswer(activity, nextQuestionAnswers)
    });
  }

  return (
    <div className="space-y-5">
      <RankingContextPanel ranking={ranking} />
      <div className="space-y-4">
        {activity.questions.map((question) => {
          const value = questionAnswers[question.id] ?? "";
          return (
            <SubtlePanel key={question.id} className="space-y-3">
              <div>
                <p className="font-heading text-xl font-semibold text-bone">{question.title}</p>
                <p className="mt-2 text-sm leading-6 text-bone/62">{question.prompt}</p>
              </div>
              <textarea
                className={`${inputClass} min-h-36 resize-y text-base leading-7`}
                maxLength={activity.maxLength}
                value={value}
                placeholder={question.placeholder ?? messages.activities.framing.answerPlaceholder}
                onChange={(event) => updateQuestionAnswer(question.id, event.target.value)}
              />
              <p className="text-end text-sm text-bone/42">{value.length} / {activity.maxLength}</p>
            </SubtlePanel>
          );
        })}
      </div>
    </div>
  );
}
