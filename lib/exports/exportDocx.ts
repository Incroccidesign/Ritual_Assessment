import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from "docx";
import { Assessment } from "@/types/assessment";
import { Participant } from "@/types/participant";
import { AssessmentResponse } from "@/types/response";
import type { Messages } from "@/lib/i18n/getMessages";
import { displayProfilingAnswer, OTHER_OPTION_VALUE } from "@/lib/activities/otherOption";
import { safeFilename } from "@/lib/utils/text";

function p(text: string, bold = false) {
  return new Paragraph({
    spacing: { after: 160, line: 276 },
    children: [new TextRun({ text, bold, size: 22 })]
  });
}

function heading(text: string, level: 1 | 2 = 1) {
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    spacing: { before: 160, after: 180 },
    children: [new TextRun({ text, bold: true, color: "243044", size: level === 1 ? 34 : 28 })]
  });
}

function table(headers: string[], rows: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headers.map((header) => cell(header, true)) }),
      ...rows.map((row) => new TableRow({ children: row.map((value) => cell(value)) }))
    ]
  });
}

function cell(text: string, bold = false) {
  return new TableCell({
    margins: { top: 120, bottom: 120, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text, bold, size: 20 })]
      })
    ]
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportAssessmentDocx(assessment: Assessment, participants: Participant[], responses: AssessmentResponse[], messages: Messages) {
  const submitted = responses.filter((response) => response.status === "submitted");
  const exportMessages = messages.exports;
  const otherResponses = responses.flatMap((response) =>
    response.activityResponses.flatMap((item) => {
      const activity = assessment.activities.find((candidate) => candidate.id === item.activityId);
      if (item.activityType === "profiling" && activity?.type === "profiling" && "fields" in item.answer) {
        const answer = item.answer;
        return activity.fields
          .filter((field) => answer.fields[field.id] === OTHER_OPTION_VALUE)
          .map((field) => `${field.label}: ${displayProfilingAnswer(field, answer, messages.common.empty)}`);
      }
      if (item.activityType === "exploration" && "items" in item.answer) {
        return item.answer.items
          .filter((selected) => selected.source !== "predefined" || selected.value === OTHER_OPTION_VALUE)
          .map((selected) => `${activity?.title ?? messages.dashboard.exploration}: ${messages.otherOption.resultsLabel}: ${selected.label}`);
      }
      return [];
    })
  );
  const framingResponses = responses.flatMap((response) =>
    response.activityResponses
      .filter((item) => item.activityType === "framing" && "answer" in item.answer)
      .map((item) => ("answer" in item.answer ? item.answer.answer : ""))
      .filter(Boolean)
  );

  const doc = new Document({
    creator: "Ritual Assessments",
    title: assessment.title,
    sections: [
      {
        children: [
          heading(assessment.title),
          p(assessment.description ?? ""),
          heading(exportMessages.assessmentSummary, 2),
          p(`${exportMessages.language}: ${assessment.language}`),
          p(`${exportMessages.activities}: ${assessment.activities.length}`),
          p(`${exportMessages.participants}: ${participants.length}`),
          p(`${exportMessages.submittedResponses}: ${submitted.length}`),
          heading(exportMessages.activityStructure, 2),
          table(
            [exportMessages.order, exportMessages.type, exportMessages.title, exportMessages.guidingQuestion],
            assessment.activities
              .slice()
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((activity) => [String(activity.orderIndex + 1), activity.type, activity.title, activity.prompt])
          ),
          heading(exportMessages.qualitativeFramingResponses, 2),
          ...(framingResponses.length ? framingResponses.map((answer) => p(answer)) : [p(exportMessages.noFramingResponsesYet)]),
          heading(exportMessages.otherResponses, 2),
          ...(otherResponses.length ? otherResponses.map((answer) => p(answer)) : [p(messages.dashboard.noCustomResponses)])
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${safeFilename(assessment.title)}-report.docx`);
}
