import { ActivityAnswer, ActivityType } from "@/types/activity";

export type ResponseStatus = "in_progress" | "submitted" | "abandoned";

export type ActivityResponse = {
  id: string;
  responseId: string;
  activityId: string;
  activityType: ActivityType;
  answer: ActivityAnswer;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentResponse = {
  id: string;
  assessmentId: string;
  participantId: string;
  status: ResponseStatus;
  activityResponses: ActivityResponse[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
};
