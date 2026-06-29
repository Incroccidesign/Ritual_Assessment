"use client";

import { Assessment } from "@/types/assessment";
import { ActivityAnswer } from "@/types/activity";
import { Participant } from "@/types/participant";
import { ActivityResponse, AssessmentResponse } from "@/types/response";
import { createAssessmentDraft } from "@/lib/assessment/createAssessment";
import { generatePublicToken } from "@/lib/assessment/generatePublicToken";
import { nowIso } from "@/lib/utils/dates";
import { uid } from "@/lib/utils/ids";

const storageKey = "ritual-assessment-builder:v1";

export type AssessmentDb = {
  assessments: Assessment[];
  participants: Participant[];
  responses: AssessmentResponse[];
};

function emptyDb(): AssessmentDb {
  return {
    assessments: [],
    participants: [],
    responses: []
  };
}

export function readAssessmentDb(): AssessmentDb {
  if (typeof window === "undefined") return emptyDb();
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return emptyDb();
  try {
    const parsed = JSON.parse(raw) as AssessmentDb;
    return {
      assessments: parsed.assessments ?? [],
      participants: parsed.participants ?? [],
      responses: parsed.responses ?? []
    };
  } catch {
    return emptyDb();
  }
}

export function writeAssessmentDb(db: AssessmentDb) {
  window.localStorage.setItem(storageKey, JSON.stringify(db));
  window.dispatchEvent(new Event("ritual-assessment-storage"));
}

function withOwner(assessment: Assessment, ownerId?: string) {
  return ownerId && !assessment.ownerId ? { ...assessment, ownerId } : assessment;
}

export function ensureSeedAssessment(ownerId?: string) {
  const db = readAssessmentDb();
  if (db.assessments.length) {
    if (!ownerId) return db;
    const needsOwnership = db.assessments.some((assessment) => !assessment.ownerId);
    if (!needsOwnership) return db;
    const nextDb = {
      ...db,
      assessments: db.assessments.map((assessment) => withOwner(assessment, ownerId))
    };
    writeAssessmentDb(nextDb);
    return nextDb;
  }
  const nextDb = { ...db, assessments: [withOwner(createAssessmentDraft(), ownerId)] };
  writeAssessmentDb(nextDb);
  return nextDb;
}

export function createLocalAssessment(ownerId?: string) {
  const db = ensureSeedAssessment(ownerId);
  const assessment = withOwner(createAssessmentDraft(), ownerId);
  const nextDb = { ...db, assessments: [assessment, ...db.assessments] };
  writeAssessmentDb(nextDb);
  return assessment;
}

export function saveLocalAssessment(assessment: Assessment) {
  const db = ensureSeedAssessment();
  const updated = { ...assessment, updatedAt: nowIso() };
  writeAssessmentDb({
    ...db,
    assessments: db.assessments.map((item) => (item.id === updated.id ? updated : item))
  });
  return updated;
}

export function publishLocalAssessment(assessmentId: string) {
  const db = ensureSeedAssessment();
  const now = nowIso();
  let published: Assessment | null = null;
  const assessments = db.assessments.map((assessment) => {
    if (assessment.id !== assessmentId) return assessment;
    published = {
      ...assessment,
      status: "published",
      publicToken: assessment.publicToken ?? generatePublicToken(),
      publishedAt: assessment.publishedAt ?? now,
      updatedAt: now
    };
    return published;
  });
  writeAssessmentDb({ ...db, assessments });
  return published;
}

export function findAssessment(id: string) {
  return ensureSeedAssessment().assessments.find((assessment) => assessment.id === id) ?? null;
}

export function findDesignerAssessment(id: string, ownerId: string) {
  return ensureSeedAssessment(ownerId).assessments.find((assessment) => assessment.id === id && assessment.ownerId === ownerId) ?? null;
}

export function findAssessmentByToken(token: string) {
  return ensureSeedAssessment().assessments.find((assessment) => assessment.publicToken === token) ?? null;
}

export function startOrResumeResponse(assessmentId: string) {
  const db = ensureSeedAssessment();
  const sessionKey = `ritual-assessment-response:${assessmentId}`;
  const storedResponseId = window.sessionStorage.getItem(sessionKey);
  const existing = storedResponseId ? db.responses.find((response) => response.id === storedResponseId) : null;
  if (existing && existing.status !== "submitted") return existing;

  const participant: Participant = {
    id: uid("participant"),
    assessmentId,
    participantToken: uid("pt"),
    status: "started",
    createdAt: nowIso(),
    startedAt: nowIso()
  };
  const response: AssessmentResponse = {
    id: uid("response"),
    assessmentId,
    participantId: participant.id,
    status: "in_progress",
    activityResponses: [],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  writeAssessmentDb({
    ...db,
    participants: [participant, ...db.participants],
    responses: [response, ...db.responses]
  });
  window.sessionStorage.setItem(sessionKey, response.id);
  return response;
}

export function saveActivityResponse(responseId: string, activityId: string, activityType: ActivityResponse["activityType"], answer: ActivityAnswer) {
  const db = ensureSeedAssessment();
  const now = nowIso();
  let nextResponse: AssessmentResponse | null = null;
  const responses = db.responses.map((response) => {
    if (response.id !== responseId) return response;
    const current = response.activityResponses.find((item) => item.activityId === activityId);
    const activityResponse: ActivityResponse = {
      id: current?.id ?? uid("activity_response"),
      responseId,
      activityId,
      activityType,
      answer,
      createdAt: current?.createdAt ?? now,
      updatedAt: now
    };
    nextResponse = {
      ...response,
      status: "in_progress",
      updatedAt: now,
      activityResponses: [
        ...response.activityResponses.filter((item) => item.activityId !== activityId),
        activityResponse
      ]
    };
    return nextResponse;
  });
  writeAssessmentDb({ ...db, responses });
  return nextResponse;
}

export function submitAssessmentResponse(responseId: string) {
  const db = ensureSeedAssessment();
  const now = nowIso();
  const responses = db.responses.map((response) =>
    response.id === responseId
      ? { ...response, status: "submitted" as const, updatedAt: now, submittedAt: now }
      : response
  );
  const target = responses.find((response) => response.id === responseId);
  const participants = db.participants.map((participant) =>
    participant.id === target?.participantId
      ? { ...participant, status: "submitted" as const, submittedAt: now }
      : participant
  );
  writeAssessmentDb({ ...db, participants, responses });
  return responses.find((response) => response.id === responseId) ?? null;
}

export function responsesForAssessment(assessmentId: string) {
  return ensureSeedAssessment().responses.filter((response) => response.assessmentId === assessmentId);
}

export function participantsForAssessment(assessmentId: string) {
  return ensureSeedAssessment().participants.filter((participant) => participant.assessmentId === assessmentId);
}

export function assessmentsForDesigner(ownerId: string) {
  return ensureSeedAssessment(ownerId).assessments.filter((assessment) => assessment.ownerId === ownerId);
}
