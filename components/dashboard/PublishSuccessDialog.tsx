"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, X } from "lucide-react";
import { Assessment } from "@/types/assessment";
import { Button, Card } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

export function PublishSuccessDialog({
  assessment,
  onClose
}: {
  assessment: Assessment;
  onClose: () => void;
}) {
  const { messages, href } = useLocale();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const participantPath = assessment.publicToken ? href(`/participate/${assessment.publicToken}`) : "";
  const titleId = `publish-success-title-${assessment.id}`;

  if (typeof document === "undefined") return null;

  async function copyParticipantLink() {
    if (!participantPath) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${participantPath}`);
      setCopyError(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopyError(true);
    }
  }

  return createPortal((
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020611]/[0.82] p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="ritual-overlay-surface relative w-full max-w-lg border !p-6 shadow-2xl"
      >
        <button
          type="button"
          aria-label={messages.account.close}
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-bone/55 transition hover:text-bone focus-visible:outline focus-visible:outline-2 focus-visible:outline-mint"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <div className="flex items-center gap-3 pr-8">
          <CheckCircle2 className="shrink-0 text-mint" size={22} aria-hidden="true" />
          <h2 id={titleId} className="font-heading text-xl font-semibold text-bone">
            {messages.dashboard.publishSuccessTitle}
          </h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-bone/65">{messages.dashboard.publishSuccessBody}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button type="button" className="flex-1 whitespace-nowrap !px-3 text-xs sm:text-sm" onClick={() => void copyParticipantLink()} disabled={!participantPath}>
            {copied ? <Check size={16} aria-hidden="true" className="dashboard-card-copy-check shrink-0 text-mint" /> : <Image src="/icons/dashboard-copy-participant-link.svg" alt="" aria-hidden="true" width={16} height={16} className="size-4 shrink-0" />}
            {copied ? messages.builder.copied : messages.dashboard.copyParticipantLink}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1 whitespace-nowrap !px-3 text-xs sm:text-sm"
            onClick={() => {
              onClose();
              router.replace(href("/dashboard"));
            }}
          >
            {messages.builder.backToDashboard}
          </Button>
        </div>
        {copyError ? <p role="alert" className="mt-3 text-sm text-orange">{messages.reports.copyLinkError}</p> : null}
        {copied ? <p role="status" className="sr-only">{messages.builder.copied}</p> : null}
      </Card>
    </div>
  ), document.body);
}
