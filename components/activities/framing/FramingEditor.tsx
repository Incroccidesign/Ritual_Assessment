"use client";

import { Plus, Trash2 } from "lucide-react";
import { Activity, FramingActivity, FramingQuestion } from "@/types/activity";
import { Button, Field, inputClass, selectClass, SubtlePanel } from "@/components/ritual-ui";
import { previousPrioritizationActivities } from "@/lib/activities/dependencies";
import { useLocale } from "@/lib/i18n/useLocale";
import { uid } from "@/lib/utils/ids";

export function FramingEditor({
  activity,
  activities,
  onChange
}: {
  activity: FramingActivity;
  activities: Activity[];
  onChange: (activity: FramingActivity) => void;
}) {
  const { messages } = useLocale();
  const sources = previousPrioritizationActivities(activities, activity.orderIndex);

  function updateQuestion(questionId: string, updater: (question: FramingQuestion) => FramingQuestion) {
    onChange({
      ...activity,
      questions: activity.questions.map((question) => question.id === questionId ? updater(question) : question)
    });
  }

  function addQuestion() {
    onChange({
      ...activity,
      questions: [
        ...activity.questions,
        {
          id: uid("question"),
          title: messages.presets.activities.framing.defaultQuestionTitle,
          prompt: messages.presets.activities.framing.defaultQuestionPrompt,
          placeholder: messages.presets.activities.framing.answerPlaceholder
        }
      ]
    });
  }

  return (
    <SubtlePanel className="space-y-4">
      <Field label={messages.activities.framing.sourceActivity}>
        <select
          className={selectClass}
          value={activity.sourceActivityId}
          onChange={(event) => onChange({ ...activity, sourceActivityId: event.target.value })}
        >
          <option value="">{messages.common.empty}</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>{source.title}</option>
          ))}
        </select>
      </Field>
      <Field label={messages.activities.framing.maxLength}>
        <input
          className={inputClass}
          type="number"
          min={120}
          max={5000}
          value={activity.maxLength}
          onChange={(event) => onChange({ ...activity, maxLength: Number(event.target.value) })}
        />
      </Field>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/58">{messages.activities.framing.questions}</p>
        {activity.questions.map((question) => (
          <div key={question.id} className="space-y-4 rounded-md border border-bone/10 bg-night/40 p-4">
            <Field label={messages.activities.framing.questionTitle}>
              <input
                className={inputClass}
                value={question.title}
                onChange={(event) => updateQuestion(question.id, (item) => ({ ...item, title: event.target.value }))}
              />
            </Field>
            <Field label={messages.activities.framing.questionPrompt}>
              <textarea
                className={`${inputClass} min-h-28 resize-y`}
                value={question.prompt}
                onChange={(event) => updateQuestion(question.id, (item) => ({ ...item, prompt: event.target.value }))}
              />
            </Field>
            <Field label={messages.activities.framing.questionPlaceholder}>
              <input
                className={inputClass}
                value={question.placeholder ?? ""}
                onChange={(event) => updateQuestion(question.id, (item) => ({ ...item, placeholder: event.target.value }))}
              />
            </Field>
            <Button
              type="button"
              variant="danger"
              disabled={activity.questions.length <= 1}
              onClick={() => onChange({ ...activity, questions: activity.questions.filter((item) => item.id !== question.id) })}
            >
              <Trash2 size={16} /> {messages.common.remove}
            </Button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={addQuestion}>
          <Plus size={16} /> {messages.activities.framing.addQuestion}
        </Button>
      </div>
    </SubtlePanel>
  );
}
