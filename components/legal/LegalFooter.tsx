"use client";

import Link from "next/link";
import { legalDocumentLinks } from "@/lib/legal/documents";
import { useLocale } from "@/lib/i18n/useLocale";

export function LegalFooter() {
  const { href, locale } = useLocale();

  return (
    <footer className="mt-12 border-t border-bone/10 pt-5 text-xs text-bone/48">
      <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-2">
        {legalDocumentLinks.map((document) => (
          <Link key={document.id} href={href(`/${document.id}`)} className="transition hover:text-bone">
            {document.label[locale]}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
