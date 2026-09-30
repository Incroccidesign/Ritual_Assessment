import { ButtonLink, Card } from "@/components/ritual-ui";
import type { LiveSession } from "@/types/live";

export function liveDashboardDestination(session: LiveSession) {
  if (session.status === "draft" || session.status === "setup") return `/live/setup?id=${session.id}`;
  if (session.status === "lobby") return `/live/lobby?id=${session.id}`;
  if (session.status === "closed") return `/live/results?id=${session.id}`;
  return `/live?id=${session.id}`;
}

export function LiveSessionCard({ session }: { session: LiveSession }) {
  const date = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(session.updated_at));
  const status = session.status === "lobby" ? "ready" : session.status;
  const canManageActivities = ["draft", "setup", "lobby"].includes(session.status);
  return <Card className="flex h-full flex-col space-y-5"><div className="flex items-start justify-between gap-3"><span className="rounded-full border border-bone/15 bg-night/50 px-3 py-1 text-sm text-bone/70">Live</span><span className="rounded-full border border-bone/10 px-3 py-1 text-sm text-bone/60">{status}</span></div><div><h2 className="line-clamp-2 font-heading text-2xl font-semibold text-bone">{session.title}</h2>{session.context_label ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-bone/62">{session.context_label}</p> : null}</div><p className="text-xs text-bone/48">Updated {date}</p><div className="mt-auto grid gap-3"><ButtonLink className="w-full" href={liveDashboardDestination(session)}> {session.status === "closed" ? "View results" : session.status === "lobby" ? "Open lobby" : "Open session"} </ButtonLink>{canManageActivities ? <ButtonLink className="w-full" variant="secondary" href={`/live/setup?id=${encodeURIComponent(session.id)}`}>Manage activities</ButtonLink> : null}</div></Card>;
}
