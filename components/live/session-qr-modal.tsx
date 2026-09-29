"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SessionQr } from "@/components/live/qr-code";

export function SessionQrModal({
  open,
  joinUrl,
  instruction,
  closeLabel,
  onClose
}: {
  open: boolean;
  joinUrl: string;
  instruction: string;
  closeLabel: string;
  onClose: () => void;
}) {
  const [fullscreenQrSize, setFullscreenQrSize] = useState(420);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const updateQrSize = () => {
      const width = window.innerWidth * 0.82;
      const height = window.innerHeight * 0.72;
      setFullscreenQrSize(Math.max(280, Math.floor(Math.min(width, height))));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    updateQrSize();
    window.addEventListener("resize", updateQrSize);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("resize", updateQrSize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(15,17,21,0.92)] p-4 backdrop-blur-xl md:p-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-full border border-bone/12 bg-night/70 px-4 text-bone transition hover:border-mint/70 hover:text-bone md:right-8 md:top-8"
        aria-label={closeLabel}
      >
        <X size={20} />
        <span className="hidden text-sm font-semibold md:inline">{closeLabel}</span>
      </button>
      <div className="flex w-full flex-col items-center justify-center gap-6" onClick={(event) => event.stopPropagation()}>
        <SessionQr value={joinUrl} size={fullscreenQrSize} className="p-4 shadow-[0_0_0_1px_rgba(15,17,21,0.15)] md:p-5" />
        <div className="max-w-3xl space-y-3 text-center">
          <p className="text-sm tracking-[0.02em] text-bone/58">{instruction}</p>
          <p className="break-all rounded-md border border-bone/10 bg-night/65 px-4 py-3 text-sm text-bone/58">{joinUrl}</p>
        </div>
      </div>
    </div>
  );
}
