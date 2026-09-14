import { AppShell } from "@/components/layout/AppShell";
import { AccountMenu } from "@/components/dashboard/AccountMenu";
import { Designer } from "@/lib/auth/designerAuth";

export function DashboardShell({ children, designer }: { children: React.ReactNode; designer: Designer }) {
  return <AppShell showLanguageSwitcher={false} headerAction={<AccountMenu designer={designer} />}>{children}</AppShell>;
}
