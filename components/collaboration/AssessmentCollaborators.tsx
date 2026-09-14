"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { Button, Card, Field, inputClass } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { supabase } from "@/lib/supabase/client";

type Collaborator = {
  userId: string;
  email: string;
  role: "editor";
};

async function authorisedRequest(url: string, init?: RequestInit) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Authentication required.");
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {})
    }
  });
}

export function AssessmentCollaborators({ assessmentId }: { assessmentId: string }) {
  const { messages } = useLocale();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authorisedRequest(`/api/assessments/${assessmentId}/collaborators`);
      if (!response.ok) throw new Error(await response.text());
      const body = await response.json() as { collaborators?: Collaborator[] };
      setCollaborators(body.collaborators ?? []);
    } catch {
      setNotice(messages.collaboration.error);
    } finally {
      setLoading(false);
    }
  }, [assessmentId, messages.collaboration.error]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addCollaborator() {
    if (!email.trim() || saving) return;
    try {
      setSaving(true);
      setNotice(null);
      const response = await authorisedRequest(`/api/assessments/${assessmentId}/collaborators`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim() })
      });
      if (!response.ok) throw new Error(await response.text());
      setEmail("");
      setNotice(messages.collaboration.added);
      await load();
    } catch {
      setNotice(messages.collaboration.error);
    } finally {
      setSaving(false);
    }
  }

  async function revokeCollaborator(userId: string) {
    if (saving) return;
    try {
      setSaving(true);
      setNotice(null);
      const response = await authorisedRequest(`/api/assessments/${assessmentId}/collaborators?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error(await response.text());
      await load();
    } catch {
      setNotice(messages.collaboration.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-bone">{messages.collaboration.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-bone/60">{messages.collaboration.body}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label={messages.collaboration.email}>
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={saving}
            />
          </Field>
        </div>
        <Button type="button" onClick={() => void addCollaborator()} disabled={saving || !email.trim()}>
          <UserPlus size={16} /> {messages.collaboration.add}
        </Button>
      </div>
      {loading ? <p className="text-sm text-bone/50">{messages.app.loading}</p> : null}
      {!loading && collaborators.length === 0 ? <p className="text-sm text-bone/50">{messages.collaboration.empty}</p> : null}
      {collaborators.map((collaborator) => (
        <div key={collaborator.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-bone/10 bg-night/35 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-bone">{collaborator.email}</p>
            <p className="mt-1 text-xs text-bone/55">{messages.collaboration.editor}</p>
          </div>
          <Button type="button" variant="ghost" onClick={() => void revokeCollaborator(collaborator.userId)} disabled={saving}>
            <X size={16} /> {messages.collaboration.revoke}
          </Button>
        </div>
      ))}
      {notice ? <p className="text-sm text-mint">{notice}</p> : null}
    </Card>
  );
}
