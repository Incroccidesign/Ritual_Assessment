"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Info, Share2, UserMinus, UserPlus, X } from "lucide-react";
import { Button, Card, Field, inputClass } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { supabase } from "@/lib/supabase/client";

type CollaborationRole = "editor" | "co_owner";
type ManagerRole = "owner" | "co_owner";

type Collaborator = {
  userId: string;
  name: string;
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

function RoleHelp({ description, label }: { description: string; label: string }) {
  return (
    <span className="group relative inline-flex items-center gap-1.5 text-bone/55 transition hover:text-bone">
      <Info size={15} aria-hidden="true" className="text-bone/45 transition group-hover:text-mint" />
      <span>{label}</span>
      <span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+0.6rem)] left-1/2 z-[120] w-60 -translate-x-1/2 rounded-md border border-bone/15 bg-night px-3 py-2 text-xs font-normal leading-5 text-bone/75 opacity-0 shadow-live transition group-hover:opacity-100">
        {description}
      </span>
    </span>
  );
}

function RoleSelector({
  value,
  onChange,
  disabled,
  ariaLabel,
  editorLabel,
  coOwnerLabel,
  editorDescription,
  coOwnerDescription,
  compact = false
}: {
  value: CollaborationRole;
  onChange: (role: CollaborationRole) => void;
  disabled: boolean;
  ariaLabel: string;
  editorLabel: string;
  coOwnerLabel: string;
  editorDescription: string;
  coOwnerDescription: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const options: Array<{ value: CollaborationRole; label: string; description: string }> = [
    { value: "editor", label: editorLabel, description: editorDescription },
    { value: "co_owner", label: coOwnerLabel, description: coOwnerDescription }
  ];
  const selected = options.find((option) => option.value === value) ?? options[0];

  function choose(nextRole: CollaborationRole) {
    setOpen(false);
    if (nextRole !== value) onChange(nextRole);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={compact
          ? "group inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-semibold text-bone/72 transition hover:bg-bone/[0.07] hover:text-bone focus:bg-bone/[0.07] focus:outline-none focus:ring-2 focus:ring-mint disabled:cursor-not-allowed disabled:opacity-50"
          : "flex min-h-12 w-full items-center justify-between rounded-md border border-bone/12 bg-night/70 px-4 text-left text-sm font-semibold text-bone outline-none transition hover:border-bone/28 hover:bg-bone/5 focus:border-mint focus:ring-2 focus:ring-mint disabled:cursor-not-allowed disabled:opacity-50"}
      >
        <span>{selected.label}</span>
        <ChevronDown size={compact ? 15 : 17} aria-hidden="true" className={compact ? "opacity-0 transition group-hover:opacity-100 group-focus:opacity-100" : "text-bone/65"} />
      </button>
      {open ? (
        <div role="listbox" aria-label={ariaLabel} className="absolute right-0 z-[130] mt-2 w-72 overflow-hidden rounded-md border border-bone/15 bg-[#171A20] p-1 shadow-live">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => choose(option.value)}
              className="flex w-full items-start gap-3 rounded px-3 py-3 text-left transition hover:bg-bone/10 focus:bg-bone/10 focus:outline-none"
            >
              <span className={option.value === value ? "mt-1 size-2 shrink-0 rounded-full bg-mint" : "mt-1 size-2 shrink-0 rounded-full border border-bone/35"} />
              <span>
                <span className="block text-sm font-semibold text-bone">{option.label}</span>
                <span className="mt-1 block text-xs leading-5 text-bone/58">{option.description}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
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
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Collaborator | null>(null);

  const load = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
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
      if (showLoading) setLoading(false);
    }
  }, [assessmentId, onManagerRoleChange]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function close() {
    setOpen(false);
    setError(null);
    setConfirmation(null);
  }

  function openDialog() {
    setError(null);
    setConfirmation(null);
    setOpen(true);
  }

  async function addCollaborator() {
    if (!validEmail(email) || saving) return;
    try {
      setSaving(true);
      setError(null);
      const response = await authorisedRequest(`/api/assessments/${assessmentId}/collaborators`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), role })
      });
      if (!response.ok) {
        const responseText = await response.text();
        setError(response.status === 400 ? messages.collaboration.emailUnavailable : responseText || messages.collaboration.error);
        return;
      }
      const collaborator = await response.json() as Collaborator;
      setEmail("");
      setRole("editor");
      setConfirmation(collaborator);
      await load(false);
    } catch {
      setError(messages.collaboration.error);
    } finally {
      setSaving(false);
    }
  }

  async function updateRole(userId: string, nextRole: CollaborationRole) {
    if (saving) return;
    try {
      setSaving(true);
      setError(null);
      const response = await authorisedRequest(`/api/assessments/${assessmentId}/collaborators`, {
        method: "PUT",
        body: JSON.stringify({ userId, role: nextRole })
      });
      if (!response.ok) throw new Error(await response.text());
      await load(false);
    } catch {
      setError(messages.collaboration.error);
    } finally {
      setSaving(false);
    }
  }

  async function revokeCollaborator(userId: string) {
    if (saving) return;
    try {
      setSaving(true);
      setError(null);
      const response = await authorisedRequest(`/api/assessments/${assessmentId}/collaborators?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error(await response.text());
      await load(false);
    } catch {
      setError(messages.collaboration.error);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !managerRole) return null;
  const emailHasValue = Boolean(email.trim());
  const emailIsValid = validEmail(email);
  const roleDetails = role === "co_owner" ? messages.collaboration.coOwnerDescription : messages.collaboration.editorDescription;

  return (
    <>
      <Button type="button" variant="secondary" aria-haspopup="dialog" aria-expanded={open} onClick={openDialog}>
        <Share2 size={16} /> {messages.collaboration.share}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-night/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <Card role="dialog" aria-modal="true" aria-label={messages.collaboration.title} className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto border-bone/15 bg-[#10131a] p-6 sm:p-7" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-5">
              <div>
                <h2 className="font-heading text-2xl font-semibold text-bone">{confirmation ? messages.collaboration.successTitle : messages.collaboration.title}</h2>
                <p className="mt-2 max-w-lg text-sm leading-6 text-bone/62">{confirmation ? messages.collaboration.successBody : messages.collaboration.body}</p>
              </div>
              <button type="button" onClick={close} aria-label={messages.common.cancel} className="rounded-md p-2 text-bone/65 transition hover:bg-bone/10 hover:text-bone focus:outline-none focus:ring-2 focus:ring-mint">
                <X size={18} />
              </button>
            </div>

            {confirmation ? (
              <div className="py-12 text-center">
                <CheckCircle2 size={40} aria-hidden="true" className="mx-auto text-mint" />
                <p className="mt-5 text-lg font-semibold text-bone">{confirmation.name}</p>
                <p className="mt-1 text-sm text-bone/55">{confirmation.email}</p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <Button type="button" variant="secondary" onClick={() => setConfirmation(null)}>{messages.collaboration.manageAccess}</Button>
                  <Button type="button" onClick={close}>{messages.collaboration.close}</Button>
                </div>
              </div>
            ) : (
              <div className="mt-7 space-y-7">
                <div className="space-y-4 border-b border-bone/10 pb-7">
                  <Field label={messages.collaboration.email}>
                    <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={saving} aria-invalid={emailHasValue && !emailIsValid} />
                  </Field>
                  {emailHasValue && !emailIsValid ? <p className="text-sm text-orange">{messages.collaboration.emailFormat}</p> : null}
                  {managerRole === "owner" ? (
                    <Field label={messages.collaboration.role}>
                      <RoleSelector
                        value={role}
                        onChange={setRole}
                        disabled={saving}
                        ariaLabel={messages.collaboration.role}
                        editorLabel={messages.collaboration.editor}
                        coOwnerLabel={messages.collaboration.coOwner}
                        editorDescription={messages.collaboration.editorDescription}
                        coOwnerDescription={messages.collaboration.coOwnerDescription}
                      />
                    </Field>
                  ) : null}
                  {managerRole === "owner" ? <RoleHelp description={roleDetails} label={messages.collaboration.roleDetails} /> : null}
                  <Button type="button" onClick={() => void addCollaborator()} disabled={saving || !emailIsValid} className="w-full">
                    <UserPlus size={16} /> {messages.collaboration.add}
                  </Button>
                  {error ? <p role="alert" className="text-sm text-orange">{error}</p> : null}
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/52">{messages.collaboration.peopleWithAccess}</h3>
                  {!collaborators.length ? <p className="mt-4 text-sm text-bone/50">{messages.collaboration.empty}</p> : null}
                  {collaborators.length ? (
                    <div className="mt-3 divide-y divide-bone/10 border-y border-bone/10">
                      {collaborators.map((collaborator) => {
                        const canManageThisCollaborator = managerRole === "owner" || collaborator.role === "editor";
                        return (
                          <div key={collaborator.userId} className="group flex min-h-20 items-center gap-4 py-4">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-semibold text-bone">{collaborator.name}</p>
                              <p className="mt-1 truncate text-sm text-bone/52">{collaborator.email}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {managerRole === "owner" ? (
                                <RoleSelector
                                  compact
                                  value={collaborator.role}
                                  onChange={(nextRole) => void updateRole(collaborator.userId, nextRole)}
                                  disabled={saving}
                                  ariaLabel={`${messages.collaboration.role}: ${collaborator.email}`}
                                  editorLabel={messages.collaboration.editor}
                                  coOwnerLabel={messages.collaboration.coOwner}
                                  editorDescription={messages.collaboration.editorDescription}
                                  coOwnerDescription={messages.collaboration.coOwnerDescription}
                                />
                              ) : (
                                <span className="text-sm font-semibold text-bone/62">{collaborator.role === "co_owner" ? messages.collaboration.coOwner : messages.collaboration.editor}</span>
                              )}
                              {canManageThisCollaborator ? (
                                <button type="button" onClick={() => void revokeCollaborator(collaborator.userId)} disabled={saving} aria-label={`${messages.collaboration.revoke}: ${collaborator.email}`} className="inline-flex size-9 items-center justify-center rounded-md text-bone/48 opacity-100 transition hover:bg-orange/10 hover:text-orange focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-orange disabled:cursor-not-allowed disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100">
                                  <UserMinus size={17} />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </>
  );
}
