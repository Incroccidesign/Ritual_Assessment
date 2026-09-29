import { LiveParticipant as Participant } from "@/types/live";

export function buildDisplayName(firstName: string, organization: string) {
  const trimmedFirstName = firstName.trim();
  const trimmedOrganization = organization.trim();
  if (trimmedFirstName && trimmedOrganization) return `${trimmedFirstName} · ${trimmedOrganization}`;
  if (trimmedFirstName) return trimmedFirstName;
  if (trimmedOrganization) return trimmedOrganization;
  return "";
}

export function participantDisplayName(participant: Pick<Participant, "display_name" | "nickname" | "organization" | "first_name"> | null | undefined, fallback: string) {
  if (!participant) return fallback;
  return participant.display_name?.trim() || participant.nickname?.trim() || buildDisplayName(participant.first_name ?? "", participant.organization ?? "") || fallback;
}
