import { SchedulingActivity, SchedulingAnswer } from "@/types/activity";
import { slotLabel } from "@/lib/activities/scheduling";
import { useLocale } from "@/lib/i18n/useLocale";
export function SchedulingSummary({ activity, answer }: { activity: SchedulingActivity; answer: SchedulingAnswer }) { const { locale } = useLocale(); return <ul className="divide-y divide-bone/10 border-y border-bone/10 text-bone/72">{activity.slots.filter((slot) => answer.slotIds.includes(slot.id)).map((slot) => <li key={slot.id} className="py-3">{slotLabel(slot, locale, activity.timezone)}</li>)}</ul>; }
