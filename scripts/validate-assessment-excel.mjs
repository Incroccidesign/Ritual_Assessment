import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { parseArgs } from "./test-data/simulated-assessment-data.mjs";

const args = parseArgs(process.argv.slice(2));
const file = args.file;

if (!file) {
  console.error("Missing --file=<path-to-export.xlsx>.");
  process.exit(1);
}

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(await readFile(file));
const errors = [];
const sheetNames = workbook.worksheets.map((sheet) => sheet.name);

expect(sheetNames[0] === "00_Overview", "First sheet must be 00_Overview.");
expect(sheetNames[1] === "01_Participants", "Second sheet must be 01_Participants.");
expect(sheetNames[sheetNames.length - 1] === "99_Raw_json", "Last sheet must be 99_Raw_json.");

const participants = sheetRows("01_Participants");
if (participants.length) {
  expect("organization_name" in participants[0], "01_Participants must include organization_name.");
  expect(participants.some((row) => String(row.organization_name ?? "").trim()), "01_Participants has no populated organization_name values.");
}

for (const sheetName of sheetNames.slice(2, -1)) {
  const rows = sheetRows(sheetName);
  if (!rows.length) continue;
  const first = rows[0];
  expect("participant_id" in first, `${sheetName} must include participant_id.`);
  expect("organization_name" in first, `${sheetName} must include organization_name.`);
  expect(rows.every((row) => String(row.organization_name ?? "").trim()), `${sheetName} contains empty organization_name values.`);
  expect("activity_order" in first, `${sheetName} must include activity_order.`);
  expect("question_label" in first, `${sheetName} must include question_label.`);
  expect("answer_value" in first, `${sheetName} must include answer_value.`);

  const rankingRows = rows.filter((row) => row.answer_type === "ranking");
  if (rankingRows.length) {
    expect(rankingRows.every((row) => Number.isFinite(Number(row.rank_position))), `${sheetName} has ranking rows without rank_position.`);
  }
}

if (errors.length) {
  console.error("Excel export validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Excel export validation passed.");
console.log(`Sheets: ${sheetNames.join(", ")}`);

function sheetRows(sheetName) {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet || sheet.rowCount < 2) return [];
  const headers = sheet.getRow(1).values.slice(1).map((value) => String(value ?? ""));
  return Array.from({ length: sheet.rowCount - 1 }, (_, rowIndex) => {
    const row = sheet.getRow(rowIndex + 2);
    return Object.fromEntries(headers.map((header, columnIndex) => [header, row.getCell(columnIndex + 1).value ?? ""]));
  });
}

function expect(condition, message) {
  if (!condition) errors.push(message);
}
