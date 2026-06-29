import { Card } from "@/components/ritual-ui/Card";

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <Card className="text-center">
      <h2 className="font-heading text-3xl font-semibold text-bone">{title}</h2>
      {body ? <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-bone/58">{body}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </Card>
  );
}
