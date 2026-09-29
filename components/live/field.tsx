import { cn } from "@/lib/live/utils";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-bone/58">{label}</span>
      {children}
      {hint ? <span className="mt-2 block text-[13px] leading-5 text-bone/56">{hint}</span> : null}
    </label>
  );
}

export const inputClass = cn(
  "w-full rounded-md border border-bone/12 bg-night/70 px-4 py-3 text-bone outline-none transition placeholder:text-bone/30 focus:border-mint"
);

export const selectClass = cn(
  inputClass,
  "border-bone/12 bg-[#171A20] text-bone [color-scheme:dark] hover:border-violet/55 focus:border-mint focus:bg-[#191d24] [&_option]:bg-[#171A20] [&_option]:text-bone"
);

export const panelClass = cn("rounded-lg border border-bone/10 bg-bone/[0.045] p-5 shadow-live");
