import { AppShell } from "@/components/layout/AppShell";

export function ParticipantShell({ children }: { children: React.ReactNode }) {
  return <AppShell compact>{children}</AppShell>;
}
