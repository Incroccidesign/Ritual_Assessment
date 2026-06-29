"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DesignerAuthGate } from "@/components/auth/DesignerAuthGate";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ritual-ui";
import { createSupabaseAssessment } from "@/lib/supabase/assessmentRepository";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/useLocale";
import { getErrorMessage } from "@/lib/utils/errors";

export default function NewAssessmentPage() {
  return (
    <Suspense fallback={null}>
      <AppShell>
        <DesignerAuthGate>
          {() => <NewAssessmentContent />}
        </DesignerAuthGate>
      </AppShell>
    </Suspense>
  );
}

function NewAssessmentContent() {
  const router = useRouter();
  const { href, locale, messages } = useLocale();
  const createStarted = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function create() {
      if (createStarted.current) return;
      if (!isSupabaseConfigured) return;
      createStarted.current = true;
      setError(null);
      try {
        const assessment = await createSupabaseAssessment(locale);
        router.replace(href(`/assessments/${assessment.id}/builder`));
      } catch (createError) {
        createStarted.current = false;
        setError(getErrorMessage(createError, messages.auth.signInError));
      }
    }
    void create();
  }, [href, locale, messages.auth.signInError, router]);

  if (!isSupabaseConfigured) return <Card><p className="text-bone/62">{messages.auth.supabaseRequired}</p></Card>;
  if (error) return <Card><p className="text-orange">{error}</p></Card>;
  return <p className="text-bone/50">{messages.app.loading}</p>;
}
