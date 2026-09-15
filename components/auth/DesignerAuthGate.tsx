"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Designer, getCurrentDesigner, signOutDesigner } from "@/lib/auth/designerAuth";
import { Button } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { supabase } from "@/lib/supabase/client";
import { getLegalAcceptanceStatus } from "@/lib/legal/acceptance";
import { LegalAcceptanceGate } from "@/components/legal/LegalAcceptanceGate";

export function DesignerAuthGate({ children }: { children: (designer: Designer) => React.ReactNode }) {
  const { messages, href } = useLocale();
  const router = useRouter();
  const [designer, setDesigner] = useState<Designer | null>(null);
  const [loading, setLoading] = useState(true);
  const [legalAccepted, setLegalAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    async function refresh() {
      const current = await getCurrentDesigner();
      if (!active) return;
      setDesigner(current);
      setLoading(false);
      if (!current) {
        const next = `${window.location.pathname}${window.location.search}`;
        router.replace(href(`/login?next=${encodeURIComponent(next)}`));
        return;
      }
      try {
        const acceptance = await getLegalAcceptanceStatus();
        if (active) setLegalAccepted(acceptance.accepted);
      } catch {
        if (active) setLegalAccepted(false);
      }
    }
    void refresh();
    window.addEventListener("ritual-designer-auth", refresh);
    const authSubscription = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const user = session?.user;
      setDesigner(user ? { id: user.id, email: user.email ?? "designer" } : null);
      setLoading(false);
      if (!user) {
        setLegalAccepted(null);
        const next = `${window.location.pathname}${window.location.search}`;
        router.replace(href(`/login?next=${encodeURIComponent(next)}`));
        return;
      }
      void getLegalAcceptanceStatus()
        .then((acceptance) => {
          if (active) setLegalAccepted(acceptance.accepted);
        })
        .catch(() => {
          if (active) setLegalAccepted(false);
        });
    }).data.subscription;
    return () => {
      active = false;
      window.removeEventListener("ritual-designer-auth", refresh);
      authSubscription?.unsubscribe();
    };
  }, [href, router]);

  if (loading || (designer && legalAccepted === null)) return null;
  if (designer && legalAccepted === false) return <LegalAcceptanceGate onAccepted={() => setLegalAccepted(true)} />;
  if (designer && legalAccepted) return <>{children(designer)}</>;
  return <p className="text-bone/50">{messages.auth.redirecting}</p>;
}

export function DesignerSignOutButton() {
  const { messages, href } = useLocale();
  const router = useRouter();
  return (
    <Button type="button" variant="ghost" onClick={async () => {
      await signOutDesigner();
      router.replace(href("/"));
    }}>
      {messages.auth.signOut}
    </Button>
  );
}
