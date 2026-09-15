"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Assessment } from "@/types/assessment";
import { Button, ButtonLink, SubtlePanel } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { publishSupabaseAssessment } from "@/lib/supabase/assessmentRepository";
import { getErrorMessage } from "@/lib/utils/errors";

export function LinkGenerator({
  assessment,
  onPublish,
  disabled = false,
  compact = false
}: {
  assessment: Assessment;
  onPublish: (assessment: Assessment) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const { messages, href } = useLocale();
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicPath = assessment.publicToken ? `/participate/${assessment.publicToken}` : "";
  const publicLink = useMemo(() => {
    if (!assessment.publicToken || typeof window === "undefined") return "";
    return `${window.location.origin}${publicPath}`;
  }, [assessment.publicToken, publicPath]);

  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      const resumesCollection = Boolean(assessment.publicToken && assessment.status !== "published");
      const published = await publishSupabaseAssessment(assessment);
      window.dispatchEvent(new Event("ritual-assessment-storage"));

      if (resumesCollection) {
        router.replace(href("/dashboard"));
        return;
      }

      onPublish(published);
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

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {!disabled && !assessment.publicToken ? (
          <Button type="button" onClick={() => void publish()} disabled={publishing}>
            {publishing ? messages.app.loading : messages.common.publish}
          </Button>
        ) : !disabled ? (
          <>
            <Button type="button" variant="secondary" onClick={() => void copyLink()}>
              {copied ? <Check size={17} /> : <Copy size={17} />}
              {copied ? messages.builder.copied : messages.common.copyPublicLink}
            </Button>
            <ButtonLink href={publicPath} variant="ghost">
              {messages.common.open} <ExternalLink size={17} />
            </ButtonLink>
            {assessment.status !== "published" ? (
              <Button type="button" onClick={() => void publish()} disabled={publishing}>
                {publishing ? messages.app.loading : assessment.status === "closed" ? messages.dashboard.reopenCollection : messages.dashboard.resumeCollection}
              </Button>
            ) : null}
          </>
        ) : null}
        {error ? <p className="w-full text-sm text-orange">{error}</p> : null}
      </div>
    );
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
      {!disabled && !assessment.publicToken ? (
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
            <ButtonLink href={publicPath} variant="ghost">
              {messages.common.open} <ExternalLink size={17} />
            </ButtonLink>
            {assessment.status !== "published" ? (
              <Button type="button" onClick={() => void publish()} disabled={publishing}>
                {publishing ? messages.app.loading : assessment.status === "closed" ? messages.dashboard.reopenCollection : messages.dashboard.resumeCollection}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
      {error ? <p className="text-sm text-orange">{error}</p> : null}
    </SubtlePanel>
  );
}
