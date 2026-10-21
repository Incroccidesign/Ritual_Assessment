"use client";

import { FramingActivity, FramingAnswer } from "@/types/activity";

export function FramingSummary({ activity, answer }: { activity: FramingActivity; answer: FramingAnswer }) {
  const questionAnswers = answer.questionAnswers ?? {};
  const hasQuestionAnswers = activity.questions.some((question) => questionAnswers[question.id]?.trim());
  const itemAnswers = answer.itemAnswers?.filter((item) => item.answer.trim()) ?? [];

  return (
    <div className="divide-y divide-bone/10">
      {itemAnswers.length ? (
        <div>
          {itemAnswers.map((item) => (
            <div key={item.itemId} className="py-4">
              <p className="text-sm font-semibold text-bone">{item.label}</p>
              <p className="mt-1 whitespace-pre-wrap text-base leading-7 text-bone/72">{item.answer}</p>
            </div>
          ))}
        </div>
      ) : hasQuestionAnswers ? (
        <div>
          {activity.questions.map((question) => {
            const value = questionAnswers[question.id]?.trim();
            if (!value) return null;
            return (
              <div key={question.id} className="py-4">
                <p className="text-sm font-semibold text-bone">{question.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-base leading-7 text-bone/72">{value}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-4 whitespace-pre-wrap text-base leading-7 text-bone/72">{answer.answer}</p>
      )}
    </div>
  );
}
