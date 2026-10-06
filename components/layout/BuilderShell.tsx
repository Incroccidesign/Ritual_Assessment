import { AppShell } from "@/components/layout/AppShell";

export function BuilderShell({ children }: { children: React.ReactNode }) {
  return <AppShell logoHref="/dashboard">{children}</AppShell>;
}
