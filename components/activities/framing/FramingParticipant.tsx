"use client";

import { ExplorationItem, FramingActivity, FramingAnswer, RankedItem } from "@/types/activity";
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

function combinedItemAnswer(itemAnswers: FramingAnswer["itemAnswers"] = []) {
  return itemAnswers
    .map((item) => {
      const value = item.answer.trim();
      return value ? `${item.label}\n${value}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

export function FramingParticipant({
  activity,
  ranking,
  items,
  answer,
  onChange
}: {
  activity: FramingActivity;
  ranking: RankedItem[];
  items: ExplorationItem[];
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

  const itemAnswers = items.map((item) => {
    const existing = answer.itemAnswers?.find((current) => current.itemId === item.id);
    return { itemId: item.id, label: item.label, answer: existing?.answer ?? "" };
  });

  function updateItemAnswer(itemId: string, value: string) {
    const nextItemAnswers = itemAnswers.map((item) => item.itemId === itemId ? { ...item, answer: value } : item);
    onChange({
      sourceRanking: items.map((item) => item.label),
      itemAnswers: nextItemAnswers,
      answer: combinedItemAnswer(nextItemAnswers)
    });
  }

  function updateQuestionAnswer(questionId: string, value: string) {
    const nextQuestionAnswers = { ...questionAnswers, [questionId]: value };
    onChange({
      sourceRanking: ranking.map((item) => item.label),
      questionAnswers: nextQuestionAnswers,
      answer: combinedAnswer(activity, nextQuestionAnswers)
    });
  }

  if (activity.mode === "per_exploration_item") {
    if (!items.length) return <p className="text-bone/56">{messages.activities.framing.noSelectedItems}</p>;

    return (
      <div className="space-y-4">
        {itemAnswers.map((item) => (
          <div key={item.itemId} className="space-y-3 rounded-md border border-bone/10 bg-night/24 p-4">
            <h2 className="text-base font-semibold leading-6 text-bone">{item.label}</h2>
            <p className="text-sm leading-6 text-bone/62">{activity.prompt}</p>
            <textarea
              className={`${inputClass} min-h-32 resize-y text-base leading-7`}
              maxLength={activity.maxLength}
              value={item.answer}
              aria-label={item.label}
              placeholder={messages.activities.framing.answerPlaceholder}
              onChange={(event) => updateItemAnswer(item.itemId, event.target.value)}
            />
            <p className="text-end text-sm text-bone/42">{item.answer.length} / {activity.maxLength}</p>
          </div>
        ))}
      </div>
    );
  }

  const contextItems = ranking.length ? ranking.map((item) => item.label) : items.map((item) => item.label);

  return (
    <div className="space-y-4">
      {contextItems.length ? <div className="rounded-md border border-bone/10 bg-night/24 p-4">
        <p className="text-sm font-semibold text-bone">{messages.activities.framing.contextForParticipant}</p>
        <ul className="mt-2 space-y-1 text-sm leading-6 text-bone/62">
          {contextItems.map((item, index) => <li key={`${item}-${index}`}>{ranking.length ? `${index + 1}. ` : ""}{item}</li>)}
        </ul>
      </div> : null}
      {!activity.questions.length ? <div className="space-y-3">
        <textarea
          className={`${inputClass} min-h-44 resize-y text-base leading-7`}
          maxLength={activity.maxLength}
          value={answer.answer}
          aria-label={activity.prompt}
          placeholder={messages.activities.framing.answerPlaceholder}
          onChange={(event) => onChange({ ...answer, sourceRanking: contextItems, answer: event.target.value })}
        />
        <p className="text-end text-sm text-bone/42">{answer.answer.length} / {activity.maxLength}</p>
      </div> : null}
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
