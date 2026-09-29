import { activityName, type Language } from "@/lib/live/i18n";
import type { ActivityType } from "@/types/live";

export function ActivityBadge({ type, language = "it" }: { type: ActivityType; language?: Language }) {
  return <span className="inline-flex items-center rounded-full border border-violet/45 bg-violet/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-bone">{activityName(type, language)}</span>;
}
