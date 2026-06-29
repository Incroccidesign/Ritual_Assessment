"use client";

const templateStorageKey = "ritual-assessment-builder:template-assessments:v1";

type TemplateRecord = {
  assessmentId: string;
  ownerId: string;
  createdAt: string;
};

function readRecords(): TemplateRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(templateStorageKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TemplateRecord[];
    return Array.isArray(parsed) ? parsed.filter((item) => item.assessmentId && item.ownerId) : [];
  } catch {
    return [];
  }
}

function writeRecords(records: TemplateRecord[]) {
  window.localStorage.setItem(templateStorageKey, JSON.stringify(records));
  window.dispatchEvent(new Event("ritual-assessment-storage"));
}

export function templateAssessmentIdsForOwner(ownerId: string) {
  return new Set(readRecords().filter((item) => item.ownerId === ownerId).map((item) => item.assessmentId));
}

export function isTemplateAssessment(assessmentId: string, ownerId: string) {
  return templateAssessmentIdsForOwner(ownerId).has(assessmentId);
}

export function markAssessmentAsTemplate(assessmentId: string, ownerId: string) {
  const records = readRecords();
  const exists = records.some((item) => item.assessmentId === assessmentId && item.ownerId === ownerId);
  if (exists) return;
  writeRecords([
    { assessmentId, ownerId, createdAt: new Date().toISOString() },
    ...records
  ]);
}

export function unmarkAssessmentAsTemplate(assessmentId: string, ownerId: string) {
  writeRecords(readRecords().filter((item) => !(item.assessmentId === assessmentId && item.ownerId === ownerId)));
}
