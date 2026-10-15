import { SchedulingActivity, SchedulingAnswer } from "@/types/activity";
import { slotLabel } from "@/lib/activities/scheduling";
export function SchedulingSummary({ activity, answer }: { activity: SchedulingActivity; answer: SchedulingAnswer }) { return <ul className="space-y-2 text-bone/72">{activity.slots.filter((slot) => answer.slotIds.includes(slot.id)).map((slot) => <li key={slot.id}>{slotLabel(slot, "en", activity.timezone)}</li>)}</ul>; }
