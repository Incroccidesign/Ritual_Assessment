"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ritual-ui";
import { type LegalDocumentId, getLegalDocument } from "@/lib/legal/documents";
import { useLocale } from "@/lib/i18n/useLocale";

export function LegalDocumentPage({ document }: { document: LegalDocumentId }) {
  const { href, locale } = useLocale();
  const content = getLegalDocument(locale, document);

  return (
    <AppShell compact>
      <article className="pb-2">
        <Link href={href("/")} className="text-sm text-bone/58 transition hover:text-bone">← Ritual</Link>
        <h1 className="mt-6 font-heading text-4xl font-semibold text-bone">{content.title}</h1>
        {locale !== "it" ? <p className="mt-3 rounded-md border border-mint/20 bg-mint/5 p-3 text-xs leading-5 text-bone/65">The governing legal text is currently published in Italian.</p> : null}
        <p className="mt-4 text-sm leading-6 text-bone/68">{content.intro}</p>
        <p className="mt-3 text-xs text-bone/45">{content.updatedLabel}</p>
        <div className="mt-7 space-y-4">
          {content.sections.map((section) => (
            <Card key={section.heading} className="p-5">
              <h2 className="font-heading text-xl font-semibold text-bone">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-6 text-bone/70">{paragraph}</p>)}
              {section.bullets ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-bone/70">
                  {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              ) : null}
            </Card>
          ))}
        </div>
      </article>
    </AppShell>
  );
}
