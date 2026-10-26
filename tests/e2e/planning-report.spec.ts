import { expect, test } from "@playwright/test";
import { getMessages } from "../../lib/i18n/getMessages";
import { generatePlanningReportModel } from "../../lib/planning-report/generatePlanningReport";
import type { FramingActivity, FramingAnswer, PlanningReportActivity } from "../../types/activity";
import type { Assessment } from "../../types/assessment";
import type { AssessmentResponse } from "../../types/response";

const date = "2026-10-26T12:00:00.000Z";
const framing: FramingActivity = {
  id: "reflection", type: "framing", title: "I remember", prompt: "Describe this area.",
  orderIndex: 0, mode: "standard", sourceActivityId: "", maxLength: 250, questions: []
};
const report: PlanningReportActivity = {
  id: "report", type: "planning_report", title: "Area Value Perspectives",
  prompt: "Review your answers.", orderIndex: 1, reportTitle: "Area Value Perspectives",
  reportSubtitle: "", sections: []
};

function modelFor(answer: FramingAnswer, activity: FramingActivity = framing, reportActivity: PlanningReportActivity = report) {
  const assessment: Assessment = {
    id: "assessment", title: "Area value", language: "en", status: "published",
    activities: [activity, reportActivity], createdAt: date, updatedAt: date
  };
  const response: AssessmentResponse = {
    id: "response", assessmentId: assessment.id, participantId: "participant", status: "submitted",
    createdAt: date, updatedAt: date, submittedAt: date,
    activityResponses: [{
      id: "activity-response", responseId: "response", activityId: activity.id,
      activityType: "framing", answer, createdAt: date, updatedAt: date
    }]
  };
  return generatePlanningReportModel(assessment, response, reportActivity, getMessages("en"));
}

for (const title of ["I remember", "I would like"]) {
  test(`report preserves ${title} text alongside an empty questionAnswers object`, () => {
    const model = modelFor({ sourceRanking: [], answer: "Test", questionAnswers: {} }, { ...framing, title });
    expect(model.sections[0].blocks[0]).toMatchObject({ title, fields: [], values: ["Test"] });
  });
}

test("legacy plain text remains available", () => {
  expect(modelFor({ sourceRanking: [], answer: "  A memory\nA second line  " }).sections[0].blocks[0])
    .toMatchObject({ fields: [], values: ["A memory\nA second line"] });
});

test("an empty itemAnswers array does not hide plain text", () => {
  expect(modelFor({ sourceRanking: [], answer: "A memory", itemAnswers: [], questionAnswers: {} }).sections[0].blocks[0])
    .toMatchObject({ fields: [], values: ["A memory"] });
});

const questions: FramingActivity["questions"] = [
  { id: "past", title: "Past", prompt: "What do you remember?" },
  { id: "future", title: "Future", prompt: "What would you like?" }
];
const multiQuestion = { ...framing, questions };

for (const questionAnswers of [{}, { past: "  " }, { obsolete: "An old question" }]) {
  test(`legacy text survives unusable question answers ${JSON.stringify(questionAnswers)}`, () => {
    expect(modelFor({ sourceRanking: [], answer: "Existing reflection", questionAnswers }, multiQuestion).sections[0].blocks[0])
      .toMatchObject({ fields: [], values: ["Existing reflection"] });
  });
}

test("configured question answers preserve their labels and order", () => {
  expect(modelFor({
    sourceRanking: [], answer: "Combined representation",
    questionAnswers: { future: " More trees ", past: " The river " }
  }, multiQuestion).sections[0].blocks[0]).toMatchObject({
    fields: [{ label: "Past", value: "The river" }, { label: "Future", value: "More trees" }], values: []
  });
});

test("unanswered configured questions remain visible when another is answered", () => {
  expect(modelFor({ sourceRanking: [], answer: "Combined representation", questionAnswers: { past: "The river" } }, multiQuestion)
    .sections[0].blocks[0]).toMatchObject({
      fields: [{ label: "Past", value: "The river" }, { label: "Future", value: "" }], values: []
    });
});

test("per-aspect answers keep their labels and take precedence over combined text", () => {
  expect(modelFor({
    sourceRanking: ["Nature", "Community"], answer: "Combined representation", questionAnswers: {},
    itemAnswers: [
      { itemId: "nature", label: "Nature", answer: " More trees " },
      { itemId: "community", label: "Community", answer: " Meeting places " }
    ]
  }, { ...framing, mode: "per_exploration_item" }).sections[0].blocks[0]).toMatchObject({
    fields: [{ label: "Nature", value: "More trees" }, { label: "Community", value: "Meeting places" }], values: []
  });
});

test("a genuinely empty answer does not invent report content", () => {
  expect(modelFor({ sourceRanking: [], answer: "  ", itemAnswers: [], questionAnswers: {} }).sections[0].blocks[0])
    .toMatchObject({ fields: [], values: [] });
});

test("generating the report does not mutate stored answers", () => {
  const answer: FramingAnswer = { sourceRanking: [], answer: "Test", questionAnswers: {} };
  const before = structuredClone(answer);
  modelFor(answer);
  expect(answer).toEqual(before);
});

test("configured report sections retain recovered text and their custom labels", () => {
  const model = modelFor({ sourceRanking: [], answer: "The river matters", questionAnswers: {} }, framing, {
    ...report,
    sections: [{
      key: "memories", title: "Local memories", visible: true,
      items: [{ id: "memory-item", activityId: framing.id, title: "My memory", visible: true }]
    }]
  });
  expect(model.sections).toHaveLength(1);
  expect(model.sections[0]).toMatchObject({
    key: "memories", title: "Local memories",
    blocks: [{ id: framing.id, title: "My memory", fields: [], values: ["The river matters"] }]
  });
});
