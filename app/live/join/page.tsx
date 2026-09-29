"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/live/button";
import { Field, inputClass, panelClass } from "@/components/live/field";
import { AppShell } from "@/components/live/shell";
import { buildDisplayName } from "@/lib/live/participant-identity";
import { joinLiveSession as joinSession, useLiveSessionSnapshot as useSessionSnapshot } from "@/lib/live/repository";
import { useLanguage } from "@/lib/live/use-language";
import { cn } from "@/lib/live/utils";

export default function JoinPage() {
  return (
    <Suspense fallback={<AppShell compact><p className="text-bone/50">Caricamento.</p></AppShell>}>
      <JoinContent />
    </Suspense>
  );
}

function JoinContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { messages, href } = useLanguage();
  const sessionId = params.get("id");
  const joinToken = params.get("join") ?? params.get("joinToken");
  const publicAccess = joinToken ? { joinToken } : undefined;
  const { snapshot, loading } = useSessionSnapshot(sessionId, publicAccess);
  const [role, setRole] = useState("");
  const [nickname, setNickname] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organization, setOrganization] = useState("");
  const [contact, setContact] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [displayNameEdited, setDisplayNameEdited] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const participantDetailsMode = snapshot?.session.participant_details_mode ?? "nickname_only";

  const effectiveDisplayName = participantDetailsMode === "identified" && !displayNameEdited
    ? buildDisplayName(firstName, organization)
    : displayName;

  async function join() {
    if (!sessionId || !snapshot) return;
    setJoinError(null);
    if (participantDetailsMode === "identified") {
      if (!firstName.trim()) {
        setJoinError(messages.join.firstNameRequired);
        return;
      }
      if (!lastName.trim()) {
        setJoinError(messages.join.lastNameRequired);
        return;
      }
      if (!effectiveDisplayName.trim()) {
        setJoinError(messages.join.displayNameRequired);
        return;
      }
    } else if (!nickname.trim()) {
      setJoinError(messages.join.nicknameRequired);
      return;
    }
    setJoining(true);
    try {
      const fallbackRole = snapshot.roles[0]?.role_name || "";
      if (!joinToken) throw new Error("Missing join token.");
      const participantAccess = await joinSession(sessionId, joinToken, role || fallbackRole || messages.common.participant, participantDetailsMode === "identified"
        ? {
            nickname: null,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            organization: organization.trim() || null,
            contact: contact.trim() || null,
            display_name: effectiveDisplayName.trim()
          }
        : {
            nickname: nickname.trim(),
            first_name: null,
            last_name: null,
            organization: null,
            contact: null,
            display_name: nickname.trim()
          });
      const participantTokenParam = `&participantToken=${encodeURIComponent(participantAccess.access.participantToken)}`;
      const joinTokenParam = joinToken ? `&join=${encodeURIComponent(joinToken)}` : "";
      router.push(href(`/live?id=${sessionId}&participant=${participantAccess.access.participantId}${participantTokenParam}${joinTokenParam}`));
    } finally {
      setJoining(false);
    }
  }

  if (!sessionId) {
    return (
      <AppShell compact claim={messages.chrome.claim} homeHref={href("/")}>
        <div className={panelClass}>
          <h1 className="font-heading text-4xl font-semibold">{messages.join.title}</h1>
          <p className="mt-3 text-bone/52">{messages.join.noLink}</p>
        </div>
      </AppShell>
    );
  }
  if (loading) return <AppShell compact claim={messages.chrome.claim} homeHref={href("/")}><p className="text-bone/50">{messages.join.loading}</p></AppShell>;
  if (!snapshot) return <AppShell compact claim={messages.chrome.claim} homeHref={href("/")}><p className="text-bone/50">{messages.common.sessionNotFound}</p></AppShell>;

  const selectedRole = role || snapshot.roles[0]?.role_name || "";
  const hasRoles = snapshot.roles.length > 0;

  return (
    <AppShell compact claim={messages.chrome.claim} homeHref={href("/")}>
      <section className={cn(panelClass, "px-5 py-6 sm:px-7")}>
        <h1 className="mt-2 font-heading text-4xl font-semibold leading-tight text-bone sm:text-5xl">{snapshot.session.title}</h1>
        <p className="mt-4 text-base leading-7 text-bone/68">{participantDetailsMode === "identified" ? messages.join.identifiedBody : messages.join.noLink}</p>
        <form
          className="mt-8 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            join();
          }}
        >
          {hasRoles ? (
            <Field label={messages.join.role}>
              <select className={inputClass} value={selectedRole} onChange={(event) => setRole(event.target.value)}>
                <option value="">{messages.common.optional}</option>
                {snapshot.roles.map((item) => (
                  <option key={item.id} value={item.role_name}>
                    {item.role_name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <p className="text-sm text-bone/45">{messages.join.roleOptional}</p>
          )}
          {participantDetailsMode === "identified" ? (
            <>
              <h2 className="font-heading text-2xl text-bone">{messages.join.identifiedTitle}</h2>
              <Field label={messages.join.firstName}>
                <input className={inputClass} value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder={messages.join.firstNamePlaceholder} />
              </Field>
              <Field label={messages.join.lastName}>
                <input className={inputClass} value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder={messages.join.lastNamePlaceholder} />
              </Field>
              <Field label={messages.join.organization}>
                <input className={inputClass} value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder={messages.join.organizationPlaceholder} />
              </Field>
              <Field label={messages.join.contact}>
                <input className={inputClass} value={contact} onChange={(event) => setContact(event.target.value)} placeholder={messages.join.contactPlaceholder} />
              </Field>
              <Field label={messages.join.displayName} hint={messages.join.displayNameHint}>
                <input
                  className={inputClass}
                value={effectiveDisplayName}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setDisplayName(nextValue);
                    setDisplayNameEdited(nextValue.trim().length > 0);
                  }}
                  onBlur={() => {
                    if (!displayName.trim()) {
                      setDisplayNameEdited(false);
                      setDisplayName(buildDisplayName(firstName, organization));
                    }
                  }}
                  placeholder={messages.join.displayNamePlaceholder}
                />
              </Field>
              <p className="rounded-md border border-bone/10 bg-night/55 p-4 text-sm leading-6 text-bone/62">{messages.join.identifiedPrivacyNote}</p>
            </>
          ) : (
            <Field label={messages.join.nickname} hint={messages.join.nicknameHint}>
              <input className={inputClass} value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder={messages.common.optional} />
            </Field>
          )}
          {joinError ? <p className="text-sm text-orange">{joinError}</p> : null}
          <Button className="w-full" disabled={joining}>
            {messages.join.cta} <ArrowRight size={17} />
          </Button>
        </form>
      </section>
    </AppShell>
  );
}
