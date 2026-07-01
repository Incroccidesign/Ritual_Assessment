"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Assessment } from "@/types/assessment";
import { Participant } from "@/types/participant";
import { AssessmentResponse } from "@/types/response";
import { Button } from "@/components/ritual-ui";
import { exportAssessmentExcel } from "@/lib/exports/exportExcel";
import { exportAssessmentJson } from "@/lib/exports/exportJson";
import { useLocale } from "@/lib/i18n/useLocale";

export function ExportMenuButton({
  assessment,
  participants,
  responses,
  disabled = false
}: {
  assessment: Assessment;
  participants: Participant[];
  responses: AssessmentResponse[];
  disabled?: boolean;
}) {
  const { messages } = useLocale();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  async function exportExcel() {
    setOpen(false);
    await exportAssessmentExcel(assessment, participants, responses, messages);
  }

  function exportJson() {
    setOpen(false);
    exportAssessmentJson(assessment, participants, responses);
  }

  return (
    <div ref={menuRef} className="relative inline-flex">
      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <Download size={16} /> {messages.dashboard.export}
      </Button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-56 rounded-md border border-bone/15 bg-night p-2 shadow-2xl shadow-black/45">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-bone transition hover:bg-bone/8"
            onClick={() => void exportExcel()}
          >
            <FileSpreadsheet size={16} /> {messages.common.exportExcel}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-bone transition hover:bg-bone/8"
            onClick={exportJson}
          >
            <Download size={16} /> {messages.common.exportJson}
          </button>
        </div>
      ) : null}
    </div>
  );
}
