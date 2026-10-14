"use client";

import { useEffect, type RefObject } from "react";

/** Closes an anchored menu consistently when its trigger/menu loses focus context. */
export function useDismissiblePopover(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void
) {
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) onDismiss();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [containerRef, onDismiss, open]);
}
