import { expect, test } from "@playwright/test";
import { downloadPlanningReportDocx } from "../../lib/planning-report/exportPlanningReportDocx";
import type { PlanningReportModel } from "../../lib/planning-report/generatePlanningReport";
import { documentXml } from "../helpers/docx";

async function exportXml(model: PlanningReportModel) {
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const blobs: Blob[] = [];
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: () => ({ href: "", download: "", click() {} }) }
  });
  URL.createObjectURL = (blob) => {
    if (!(blob instanceof Blob)) throw new Error("Expected a DOCX blob");
    blobs.push(blob);
    return "blob:docx-layout-test";
  };
  URL.revokeObjectURL = () => {};
  try {
    await downloadPlanningReportDocx(model);
    expect(blobs).toHaveLength(1);
    return documentXml(Buffer.from(await blobs[0].arrayBuffer()));
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor);
    else Reflect.deleteProperty(globalThis, "document");
  }
}

for (const value of ["A meaningful answer", ""]) {
  test(`DOCX tables fill the text area with explicit column and cell widths, answer=${JSON.stringify(value)}`, async () => {
    const model: PlanningReportModel = {
      title: "Area Value Perspectives", subtitle: "Area report", emptyText: "No answer provided.",
      sections: [{
        key: "responses", title: "Assessment responses", visible: true,
        blocks: [
          { id: "profile", title: "About you", activityType: "profiling", values: [], fields: [{ label: "Connection with the area", value: "Resident" }] },
          { id: "concrete", title: "Make it concrete", activityType: "framing", values: [], fields: [
            { label: "Nature and environment", value },
            { label: "Social life and community", value: "Meeting places" }
          ] }
        ]
      }]
    };
    const xml = await exportXml(model);
    const tables = [...xml.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)].map(match => match[0]);
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      const width = table.match(/<w:tblW\b[^>]*\/>/)?.[0];
      expect(width).toContain('w:type="dxa"');
      expect(width).toContain('w:w="9026"');
      expect(table).toContain('<w:tblLayout w:type="fixed"/>');
      const grid = [...table.matchAll(/<w:gridCol\b[^>]*w:w="(\d+)"[^>]*\/>/g)].map(match => Number(match[1]));
      expect(grid).toEqual([4062, 4964]);
      expect(grid.reduce((total, column) => total + column, 0)).toBe(11906 - 2 * 1440);
      const cells = [...table.matchAll(/<w:tcW\b[^>]*\/>/g)].map(match => match[0]);
      expect(cells.length).toBeGreaterThan(0);
      cells.forEach((cell, index) => {
        expect(cell).toContain('w:type="dxa"');
        expect(cell).toContain(`w:w="${grid[index % 2]}"`);
      });
    }
    expect(xml).toContain('w:w="11906"');
    expect(xml).toContain('w:h="16838"');
    expect(xml).toContain("Resident");
    expect(xml).toContain("Nature and environment");
    expect(xml).toContain("Social life and community");
    expect(xml).toContain(value || model.emptyText);
    expect(xml).toContain("Meeting places");
  });
}
