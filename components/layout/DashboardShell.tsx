import { AppShell } from "@/components/layout/AppShell";
import { AccountMenu } from "@/components/dashboard/AccountMenu";
import { Designer } from "@/lib/auth/designerAuth";

export function DashboardShell({ children, designer }: { children: React.ReactNode; designer: Designer }) {
  return <AppShell logoHref="/dashboard" logoClassName="w-[91px] sm:w-[91px] md:w-[91px]" showHeaderDivider={false} showLanguageSwitcher={false} headerAction={<AccountMenu designer={designer} />}>{children}</AppShell>;
}
