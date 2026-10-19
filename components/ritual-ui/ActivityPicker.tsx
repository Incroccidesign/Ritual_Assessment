"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ritual-ui/Button";
import { useDismissiblePopover } from "@/lib/ui/use-dismissible-popover";

type PickerItem<T extends string> = {
  id: T;
  label: string;
  description: string;
  illustration: ReactNode;
  count?: number;
};

export function ActivityPicker<T extends string>({ label, items, onAdd }: {
  label: string;
  items: PickerItem<T>[];
  onAdd: (type: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useDismissiblePopover(open, containerRef, () => setOpen(false));

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button type="button" variant="secondary" className="min-h-11 px-4" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((current) => !current)}>
        <Plus size={16} aria-hidden="true" /> {label}
      </Button>
      {open ? (
        <div id={menuId} aria-label={label} className="ritual-popover-surface modal-scroll absolute right-0 top-[calc(100%+0.5rem)] z-30 max-h-[min(60dvh,32rem)] w-[min(26rem,calc(100vw-3rem))] overflow-y-auto rounded-lg border p-2">
          {items.map((item) => (
            <button key={item.id} type="button" className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition hover:bg-bone/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-bone/70" onClick={() => { onAdd(item.id); setOpen(false); }}>
              <span className="grid h-11 w-11 shrink-0 place-items-center text-bone/75">{item.illustration}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-bone">{item.label}{item.count ? <span className="ml-2 text-sm font-normal text-bone/50">× {item.count}</span> : null}</span>
                <span className="mt-1 block text-sm leading-5 text-bone/58">{item.description}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
