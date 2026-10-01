"use client";

import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { LiveSessionSnapshot } from "@/types/live";
import type { Language } from "@/lib/live/i18n";
import { getMessages } from "@/lib/live/i18n";
import { participantDisplayName } from "@/lib/live/participant-identity";
import { buildLiveReport } from "@/lib/live/report-data";

const safeName = (value: string) => (value || "live-session").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
const filename = (snapshot: LiveSessionSnapshot) => `${safeName(snapshot.session.title)}-run-${snapshot.session.run_number ?? 1}-report`;
const download = (blob: Blob, name: string) => { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url); };

export function buildLiveDocx(snapshot: LiveSessionSnapshot, language: Language = "it") {
  const data = buildLiveReport(snapshot, language);
  const messages = getMessages(language);
  const rows = [
    ["Run", snapshot.session.run_number ?? 1], ["Status", snapshot.session.status],
    ["Facilitator", snapshot.session.facilitator_name], ["Context", snapshot.session.context_label],
    ["Started", snapshot.session.ritual_started_at], ["Ended", snapshot.session.ritual_ended_at],
    ["Participants", snapshot.participants.length], ["Responses", snapshot.responses.length]
  ].map(([label, value]) => new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(label), bold: true })] })] }), new TableCell({ children: [new Paragraph(value == null ? "" : String(value))] })] }));
  const blocks = snapshot.activities.flatMap((activity) => [
    new Paragraph({ text: `${activity.order_index + 1}. ${messages.activities[activity.activity_type].name}: ${activity.instance_label ?? ""} ${activity.prompt}`, heading: "Heading2" }),
    ...(activity.facilitator_note ? [new Paragraph(activity.facilitator_note)] : []),
    ...data.responses.filter((r) => r.activity_id === activity.id).map((r) => new Paragraph(`• ${r.category ? `[${r.category}] ` : ""}${r.response} — ${r.participant}${r.role ? ` (${r.role})` : ""}`)),
    ...data.priority.filter((r) => r.activity_id === activity.id).map((r) => new Paragraph(`• ${r.item}: ${r.votes} ${language === "it" ? "voti" : "votes"}`)),
    ...data.pacts.filter((r) => r.activity_id === activity.id).map((r) => new Paragraph(`${language === "it" ? "Proposta finale" : "Final proposal"}: ${r.final_statement} (${r.confirmed_round ? `${language === "it" ? "confermata, turno" : "confirmed, round"} ${r.confirmed_round}` : language === "it" ? "non confermata" : "unconfirmed"})`)),
    ...data.pactRounds.filter((r) => r.activity_id === activity.id).map((r) => new Paragraph(`${language === "it" ? "Turno" : "Round"} ${r.round}: ${r.proposal} — ${messages.adhesionLabels.Concordo}: ${r.agree}; ${messages.adhesionLabels.Parzialmente}: ${r.partial}; ${messages.adhesionLabels["Non concordo"]}: ${r.disagree}`))
  ]);
  return new Document({ sections: [{ children: [new Paragraph({ text: snapshot.session.title, heading: "Title" }), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }), ...blocks] }] });
}

export async function exportLiveDocx(snapshot: LiveSessionSnapshot, language: Language = "it") {
  download(await Packer.toBlob(buildLiveDocx(snapshot, language)), `${filename(snapshot)}.docx`);
}

export async function buildLiveWorkbook(snapshot: LiveSessionSnapshot, language: Language = "it") {
  const XLSX = await import("xlsx"); const data = buildLiveReport(snapshot, language); const book = XLSX.utils.book_new();
  const add = (name: string, rows: object[]) => XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), name);
  add("Session", [{ id: snapshot.session.id, run: snapshot.session.run_number ?? 1, title: snapshot.session.title, status: snapshot.session.status, facilitator: snapshot.session.facilitator_name, context: snapshot.session.context_label, started_at: snapshot.session.ritual_started_at, ended_at: snapshot.session.ritual_ended_at }]);
  add("Activities", snapshot.activities.map((a) => ({ activity_id: a.id, order: a.order_index + 1, type: a.activity_type, label: a.instance_label, prompt: a.prompt, state: a.state, note: a.facilitator_note, votes_per_participant: a.votes_per_participant, started_at: a.started_at, ended_at: a.ended_at, categories: JSON.stringify(a.surface_input_types) })));
  add("Participants", snapshot.participants.map((p) => ({ participant_id: p.id, role: p.role_name, name: participantDisplayName(p, getMessages(language).common.participant), organization: p.organization, joined_at: p.joined_at })));
  add("Responses", data.responses);
  add("Priority", data.priority);
  add("Priority votes", data.priorityVotes);
  add("Pacts", data.pacts);
  add("Pact rounds", data.pactRounds);
  add("Pact votes", data.pactVotes);
  return book;
}

export async function exportLiveXlsx(snapshot: LiveSessionSnapshot, language: Language = "it") {
  const XLSX = await import("xlsx");
  XLSX.writeFileXLSX(await buildLiveWorkbook(snapshot, language), `${filename(snapshot)}.xlsx`);
}
