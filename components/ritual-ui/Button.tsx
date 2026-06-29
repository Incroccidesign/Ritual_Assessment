import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variants = {
  primary: "bg-bone text-night hover:bg-mint",
  secondary: "border border-bone/15 bg-bone/5 text-bone hover:border-mint/70",
  ghost: "text-bone/72 hover:text-bone",
  danger: "border border-orange/35 bg-orange/10 text-orange hover:border-orange"
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-mint disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  children,
  className,
  variant = "primary"
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof variants;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-mint",
        variants[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}
