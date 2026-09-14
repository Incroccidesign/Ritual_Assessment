"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Share2, UserPlus, X } from "lucide-react";
import { Button, Card, Field, inputClass } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { supabase } from "@/lib/supabase/client";

type CollaborationRole = "editor" | "co_owner";
type ManagerRole = "owner" | "co_owner";

type Collaborator = {
  userId: string;
  email: string;
  role: CollaborationRole;
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

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function AssessmentCollaborators({
  assessmentId,
  onManagerRoleChange
}: {
  assessmentId: string;
  onManagerRoleChange?: (role: ManagerRole | null) => void;
}) {
  const { messages } = useLocale();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [managerRole, setManagerRole] = useState<ManagerRole | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaborationRole>("editor");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authorisedRequest(`/api/assessments/${assessmentId}/collaborators`);
      if (response.status === 403) {
        setManagerRole(null);
        onManagerRoleChange?.(null);
        return;
      }
      if (!response.ok) throw new Error(await response.text());
      const body = await response.json() as { collaborators?: Collaborator[]; managerRole?: ManagerRole };
      setCollaborators(body.collaborators ?? []);
      setManagerRole(body.managerRole ?? null);
      onManagerRoleChange?.(body.managerRole ?? null);
    } catch {
      setManagerRole(null);
      onManagerRoleChange?.(null);
    } finally {
      setLoading(false);
    }
  }, [assessmentId, onManagerRoleChange]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!popoverRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function addCollaborator() {
    if (!validEmail(email) || saving) return;
    try {
      setSaving(true);
      setNotice(null);
      const response = await authorisedRequest(`/api/assessments/${assessmentId}/collaborators`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), role })
      });
      if (!response.ok) {
        const responseText = await response.text();
        setNotice(response.status === 400 ? messages.collaboration.emailUnavailable : responseText || messages.collaboration.error);
        return;
      }
      setEmail("");
      setRole("editor");
      setNotice(messages.collaboration.added);
      await load();
    } catch {
      setNotice(messages.collaboration.error);
    } finally {
      setSaving(false);
    }
  }

  async function updateRole(userId: string, nextRole: CollaborationRole) {
    if (saving) return;
    try {
      setSaving(true);
      setNotice(null);
      const response = await authorisedRequest(`/api/assessments/${assessmentId}/collaborators`, {
        method: "PUT",
        body: JSON.stringify({ userId, role: nextRole })
      });
      if (!response.ok) throw new Error(await response.text());
      setNotice(messages.collaboration.roleUpdated);
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

  if (loading || !managerRole) return null;
  const emailHasValue = Boolean(email.trim());
  const emailIsValid = validEmail(email);

  return (
    <div ref={popoverRef} className="relative">
      <Button
        type="button"
        variant="secondary"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Share2 size={16} /> {messages.collaboration.share}
      </Button>
      {open ? (
        <Card role="dialog" aria-label={messages.collaboration.title} className="absolute right-0 z-50 mt-3 w-[min(26rem,calc(100vw-2rem))] space-y-5 shadow-live">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-bone">{messages.collaboration.title}</h2>
              <p className="mt-2 text-sm leading-6 text-bone/60">{messages.collaboration.body}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={messages.common.cancel} className="rounded-md p-2 text-bone/65 hover:bg-bone/10 hover:text-bone focus:outline-none focus:ring-2 focus:ring-mint">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3 rounded-md border border-bone/10 bg-night/35 p-4">
            <Field label={messages.collaboration.email}>
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={saving}
                aria-invalid={emailHasValue && !emailIsValid}
              />
            </Field>
            {emailHasValue && !emailIsValid ? <p className="text-sm text-orange">{messages.collaboration.emailFormat}</p> : null}
            {managerRole === "owner" ? (
              <Field label={messages.collaboration.role}>
                <select className={inputClass} value={role} onChange={(event) => setRole(event.target.value as CollaborationRole)} disabled={saving}>
                  <option value="editor">{messages.collaboration.editor}</option>
                  <option value="co_owner">{messages.collaboration.coOwner}</option>
                </select>
              </Field>
            ) : null}
            <Button type="button" onClick={() => void addCollaborator()} disabled={saving || !emailIsValid} className="w-full">
              <UserPlus size={16} /> {messages.collaboration.add}
            </Button>
          </div>

          <div className="space-y-3">
            {!collaborators.length ? <p className="text-sm text-bone/50">{messages.collaboration.empty}</p> : null}
            {collaborators.map((collaborator) => {
              const canManageThisCollaborator = managerRole === "owner" || collaborator.role === "editor";
              return (
                <div key={collaborator.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-bone/10 bg-night/35 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-bone">{collaborator.email}</p>
                    {managerRole === "owner" ? (
                      <select
                        className="mt-1 bg-transparent text-xs font-semibold text-bone/60 outline-none focus:text-bone"
                        value={collaborator.role}
                        onChange={(event) => void updateRole(collaborator.userId, event.target.value as CollaborationRole)}
                        disabled={saving}
                        aria-label={`${messages.collaboration.role}: ${collaborator.email}`}
                      >
                        <option value="editor">{messages.collaboration.editor}</option>
                        <option value="co_owner">{messages.collaboration.coOwner}</option>
                      </select>
                    ) : (
                      <p className="mt-1 text-xs text-bone/55">{collaborator.role === "co_owner" ? messages.collaboration.coOwner : messages.collaboration.editor}</p>
                    )}
                  </div>
                  {canManageThisCollaborator ? (
                    <Button type="button" variant="ghost" onClick={() => void revokeCollaborator(collaborator.userId)} disabled={saving} className="min-h-9 px-3 text-xs">
                      <X size={15} /> {messages.collaboration.revoke}
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
          {notice ? <p className="text-sm text-mint">{notice}</p> : null}
        </Card>
      ) : null}
    </div>
  );
}
