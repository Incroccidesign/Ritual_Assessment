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
  const { locale, messages } = useLocale();
  const isMultiQuestion = activity.questions.length > 1;
  const multiQuestionPlaceholder =
    locale === "it" ? "Scrivi la tua risposta..." : locale === "fr" ? "Écrivez votre réponse..." : "Write your answer...";
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
          <div key={question.id} className={isMultiQuestion ? "space-y-3 rounded-md border border-bone/10 bg-night/24 p-4" : "space-y-3"}>
            {isMultiQuestion ? (
              <div className="space-y-2">
                <h2 className="text-base font-semibold leading-6 text-bone">{question.title}</h2>
                <p className="text-sm leading-6 text-bone/62">{question.prompt}</p>
              </div>
            ) : null}
            <textarea
              className={`${inputClass} ${isMultiQuestion ? "min-h-32" : "min-h-44"} resize-y text-base leading-7`}
              maxLength={activity.maxLength}
              value={value}
              aria-label={question.title}
              placeholder={question.placeholder ?? (isMultiQuestion ? multiQuestionPlaceholder : messages.activities.framing.answerPlaceholder)}
              onChange={(event) => updateQuestionAnswer(question.id, event.target.value)}
            />
            <p className="text-end text-sm text-bone/42">{value.length} / {activity.maxLength}</p>
          </div>
        );
      })}
    </div>
  );
}
