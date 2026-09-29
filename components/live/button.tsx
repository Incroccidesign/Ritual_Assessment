import Link from "next/link";
import { cn } from "@/lib/live/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-mint disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-bone text-night hover:bg-mint",
        variant === "secondary" && "border border-bone/15 bg-bone/5 text-bone hover:border-mint/70",
        variant === "ghost" && "text-bone/72 hover:text-bone",
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
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-mint",
        variant === "primary" && "bg-bone text-night hover:bg-mint",
        variant === "secondary" && "border border-bone/15 bg-bone/5 text-bone hover:border-mint/70",
        variant === "ghost" && "text-bone/72 hover:text-bone",
        className
      )}
    >
      {children}
    </Link>
  );
}
