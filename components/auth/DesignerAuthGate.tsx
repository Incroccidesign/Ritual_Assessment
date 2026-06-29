"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Designer, getCurrentDesigner, signOutDesigner } from "@/lib/auth/designerAuth";
import { Button } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

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
    return () => {
      active = false;
      window.removeEventListener("ritual-designer-auth", refresh);
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
