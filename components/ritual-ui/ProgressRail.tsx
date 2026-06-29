import { cn } from "@/lib/utils/cn";

export function ProgressRail({
  total,
  current
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="flex gap-2" aria-hidden="true">
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 flex-1 rounded-full transition",
            index <= current ? "bg-mint" : "bg-bone/12"
          )}
        />
      ))}
    </div>
  );
}
