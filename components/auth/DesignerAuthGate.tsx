"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Designer, getCurrentDesigner, signOutDesigner } from "@/lib/auth/designerAuth";
import { Button } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { supabase } from "@/lib/supabase/client";

export function DesignerAuthGate({ children }: { children: (designer: Designer) => React.ReactNode }) {
  const { messages, href } = useLocale();
  const router = useRouter();
  const [designer, setDesigner] = useState<Designer | null>(null);
  const [loading, setLoading] = useState(true);

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
        const next = `${window.location.pathname}${window.location.search}`;
        router.replace(href(`/login?next=${encodeURIComponent(next)}`));
      }
    }).data.subscription;
    return () => {
      active = false;
      window.removeEventListener("ritual-designer-auth", refresh);
      authSubscription?.unsubscribe();
    };
  }, [href, router]);

  if (loading) return null;
  if (designer) return <>{children(designer)}</>;
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
