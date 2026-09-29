"use client";

import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { LiveSessionSnapshot } from "@/types/live";
import { getLiveExportData } from "@/lib/live/repository";

const safeName = (value: string) => (value || "live-session").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
const download = (blob: Blob, name: string) => { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url); };
const text = (value: unknown) => value == null ? "" : String(value);

export async function exportLiveDocx(snapshot: LiveSessionSnapshot) {
  const data = getLiveExportData(snapshot);
  const rows = [
    ["Status", data.session.status], ["Facilitator", data.session.facilitator_name], ["Context", data.session.context_label],
    ["Participants", data.participants.length], ["Responses", data.responses.length]
  ].map(([label, value]) => new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: text(label), bold: true })] })] }), new TableCell({ children: [new Paragraph(text(value))] })] }));
  const blocks = data.activities.flatMap((activity) => {
    const responses = data.responses.filter((item) => item.live_activity_id === activity.id);
    const priority = data.results.priorityRanking.filter((item) => item.live_activity_id === activity.id);
    const pact = data.pacts.find((item) => item.live_activity_id === activity.id);
    return [new Paragraph({ text: `${activity.order_index + 1}. ${activity.activity_type}: ${activity.prompt}`, heading: "Heading2" }), ...responses.map((item) => new Paragraph(`• ${item.response_text}`)), ...priority.map((item) => new Paragraph(`• ${item.label}: ${item.votes} votes`)), ...(pact ? [new Paragraph(`Pact: ${pact.resolved_final_statement}`)] : [])];
  });
  const document = new Document({ sections: [{ children: [new Paragraph({ text: data.session.title, heading: "Title" }), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }), ...blocks] }] });
  download(await Packer.toBlob(document), `${safeName(data.session.title)}-live-report.docx`);
}

export async function exportLiveXlsx(snapshot: LiveSessionSnapshot) {
  const XLSX = await import("xlsx"); const data = getLiveExportData(snapshot); const book = XLSX.utils.book_new();
  const add = (name: string, rows: Record<string, unknown>[]) => XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), name);
  add("Session", [{ title: data.session.title, status: data.session.status, facilitator: data.session.facilitator_name, context: data.session.context_label, started_at: data.session.ritual_started_at, ended_at: data.session.ritual_ended_at }]);
  add("Activities", data.activities.map((item) => ({ order: item.order_index + 1, type: item.activity_type, prompt: item.prompt, state: item.state, started_at: item.started_at, ended_at: item.ended_at })));
  add("Participants", data.participants.map((item) => ({ role: item.role_name, name: item.display_name || item.nickname, organization: item.organization, joined_at: item.joined_at })));
  add("Responses", data.responses.map((item) => ({ activity_id: item.live_activity_id, type: item.activity_type, response: item.response_text, category: item.response_category, created_at: item.created_at })));
  add("Priority", data.results.priorityRanking.map((item) => ({ activity_id: item.live_activity_id, item: item.label, votes: item.votes })));
  add("Pacts", data.pacts.map((item) => ({ activity_id: item.live_activity_id, final_statement: item.resolved_final_statement, confirmed_round: item.confirmed_round_number })));
  XLSX.writeFileXLSX(book, `${safeName(data.session.title)}-live-report.xlsx`);
}
