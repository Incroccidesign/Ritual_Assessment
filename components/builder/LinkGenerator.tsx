"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { Assessment } from "@/types/assessment";
import { Button, ButtonLink, SubtlePanel } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { publishSupabaseAssessment } from "@/lib/supabase/assessmentRepository";
import { getErrorMessage } from "@/lib/utils/errors";

export function LinkGenerator({
  assessment,
  onPublish,
  disabled = false
}: {
  assessment: Assessment;
  onPublish: (assessment: Assessment) => void;
  disabled?: boolean;
}) {
  const { messages, href } = useLocale();
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicPath = assessment.publicToken ? `/participate/${assessment.publicToken}` : "";
  const publicLink = useMemo(() => {
    if (!assessment.publicToken || typeof window === "undefined") return "";
    return `${window.location.origin}${href(publicPath)}`;
  }, [assessment.publicToken, href, publicPath]);

  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      const published = await publishSupabaseAssessment(assessment);
      onPublish(published);
      window.dispatchEvent(new Event("ritual-assessment-storage"));
    } catch (publishError) {
      setError(getErrorMessage(publishError, messages.auth.signInError));
    } finally {
      setPublishing(false);
    }
  }

  async function copyLink() {
    if (!publicLink) return;
    await navigator.clipboard.writeText(publicLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <SubtlePanel className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/45">{messages.builder.participantPreview}</p>
        <p className="mt-2 text-sm leading-6 text-bone/56">{disabled ? messages.builder.templatePublishHint : messages.builder.publishHint}</p>
      </div>
      {disabled ? (
        <p className="rounded-md border border-mint/20 bg-mint/10 px-4 py-3 text-sm text-bone/72">
          {messages.builder.templateSaveHint}
        </p>
      ) : null}
      {!disabled && (assessment.status !== "published" || !assessment.publicToken) ? (
        <Button type="button" onClick={() => void publish()} disabled={publishing}>
          {publishing ? messages.app.loading : messages.common.publish}
        </Button>
      ) : !disabled ? (
        <>
          <p className="break-all rounded-md border border-mint/20 bg-mint/10 px-4 py-3 text-sm text-bone">
            {publicLink}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => void copyLink()}>
              {copied ? <Check size={17} /> : <Copy size={17} />}
              {copied ? messages.builder.copied : messages.common.copyPublicLink}
            </Button>
            <ButtonLink href={href(publicPath)} variant="ghost">
              {messages.common.open} <ExternalLink size={17} />
            </ButtonLink>
          </div>
        </>
      ) : null}
      {error ? <p className="text-sm text-orange">{error}</p> : null}
    </SubtlePanel>
  );
}
