export function StepHeader({
  eyebrow,
  title,
  body
}: {
  eyebrow?: string;
  title: string;
  body?: string;
}) {
  return (
    <div>
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mint">{eyebrow}</p> : null}
      <h1 className="mt-3 font-heading text-4xl font-semibold leading-tight text-bone md:text-5xl">{title}</h1>
      {body ? <p className="mt-4 max-w-2xl text-base leading-7 text-bone/62">{body}</p> : null}
    </div>
  );
}
