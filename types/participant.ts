export type ParticipantStatus = "started" | "submitted" | "abandoned";

export type Participant = {
  id: string;
  assessmentId: string;
  participantToken: string;
  companyName?: string;
  contactEmail?: string;
  status: ParticipantStatus;
  createdAt: string;
  startedAt?: string;
  submittedAt?: string;
};
