import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-bone/10 bg-bone/[0.045] p-5 shadow-live", className)}
      {...props}
    />
  );
}

export function SubtlePanel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-bone/10 bg-night/45 p-4", className)}
      {...props}
    />
  );
}
