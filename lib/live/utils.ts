import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function uid(prefix = "id") {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function sessionCode(id: string) {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
}

export function toCsv(rows: Record<string, string | number | null | undefined>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | null | undefined) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

export function downloadFile(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
