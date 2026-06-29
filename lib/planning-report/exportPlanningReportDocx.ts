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
import { PlanningReportField, PlanningReportModel } from "@/lib/planning-report/generatePlanningReport";
import { safeFilename } from "@/lib/utils/text";

function p(text: string, options: { bold?: boolean; muted?: boolean } = {}) {
  return new Paragraph({
    spacing: { after: 160, line: 276 },
    children: [new TextRun({ text, bold: options.bold, color: options.muted ? "6B7280" : "111827", size: 22 })]
  });
}

function heading(text: string, level: 1 | 2 | 3 = 1) {
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 180 },
    children: [new TextRun({ text, bold: true, color: "243044", size: level === 1 ? 36 : level === 2 ? 28 : 24 })]
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

function labelValueTable(fields: PlanningReportField[], emptyText: string) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: fields.map((field) =>
      new TableRow({
        children: [
          cell(field.label, true),
          cell(field.value || emptyText)
        ]
      })
    )
  });
}

function bulletList(values: string[], emptyText: string) {
  if (!values.length) return [p(emptyText, { muted: true })];
  return values.map((value) =>
    new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 100 },
      children: [new TextRun({ text: value || emptyText, size: 21 })]
    })
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadPlanningReportDocx(model: PlanningReportModel) {
  const children: Array<Paragraph | Table> = [
    heading(model.title),
    p(model.subtitle, { muted: true })
  ];

  model.sections.forEach((section) => {
    children.push(heading(section.title, 2));
    section.blocks.forEach((block) => {
      children.push(heading(block.title, 3));
      if (block.fields.length) children.push(labelValueTable(block.fields, model.emptyText));
      if (block.values.length) children.push(...bulletList(block.values, model.emptyText));
      if (!block.fields.length && !block.values.length) children.push(p(model.emptyText, { muted: true }));
    });
  });

  const doc = new Document({
    creator: "Ritual Assessments",
    title: model.title,
    sections: [{ children }]
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${safeFilename(model.title)}.docx`);
}
