import { AppShell } from "@/components/layout/AppShell";
import { DesignerSignOutButton } from "@/components/auth/DesignerAuthGate";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return <AppShell headerAction={<DesignerSignOutButton />}>{children}</AppShell>;
}
