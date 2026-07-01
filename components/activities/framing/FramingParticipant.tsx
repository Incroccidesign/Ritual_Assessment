"use client";

import { FramingActivity, FramingAnswer, RankedItem } from "@/types/activity";
import { inputClass } from "@/components/ritual-ui";
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
    <div className="space-y-4">
      {activity.questions.map((question) => {
        const value = questionAnswers[question.id] ?? "";
        return (
          <div key={question.id} className="space-y-3">
            <textarea
              className={`${inputClass} min-h-44 resize-y text-base leading-7`}
              maxLength={activity.maxLength}
              value={value}
              aria-label={question.title}
              placeholder={question.placeholder ?? messages.activities.framing.answerPlaceholder}
              onChange={(event) => updateQuestionAnswer(question.id, event.target.value)}
            />
            <p className="text-end text-sm text-bone/42">{value.length} / {activity.maxLength}</p>
          </div>
        );
      })}
    </div>
  );
}
