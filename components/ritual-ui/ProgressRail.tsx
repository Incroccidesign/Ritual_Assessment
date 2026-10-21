import { cn } from "@/lib/utils/cn";

export function ProgressRail({
  total,
  current
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 shrink-0 rounded-full transition",
            index === current ? "w-16 bg-mint sm:w-20" : index < current ? "w-3 bg-[#747986] sm:w-4" : "w-3 bg-[#3d4350] sm:w-4"
          )}
        />
      ))}
    </div>
  );
}
