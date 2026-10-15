"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, UserRound, UsersRound, X } from "lucide-react";
import { LoginContent } from "@/components/auth/LoginContent";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { LegalFooter } from "@/components/legal/LegalFooter";
import { Button } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

type HomeAuthMode = "sign-in" | "sign-up";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { messages, href, direction } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth");
  const authMode: HomeAuthMode | null = authParam === "sign-in" || authParam === "sign-up" ? authParam : null;
  const [authPending, setAuthPending] = useState(false);

  const openAuth = useCallback((mode: HomeAuthMode, next?: string) => {
    const params = new URLSearchParams({ auth: mode });
    if (next) params.set("next", next);
    setAuthPending(false);
    router.replace(href(`/?${params.toString()}`));
  }, [href, router]);

  const closeAuth = useCallback(() => {
    if (!authPending) router.replace(href("/"));
  }, [authPending, href, router]);

  return (
    <>
    <main dir={direction} className="min-h-screen bg-night text-bone">
      <section className="relative flex min-h-[100svh] overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
        >
          <source media="(max-width: 767px)" src="/video/Hero_Ritual_Mobile.webm" type="video/webm" />
          <source src="/video/Hero_Ritual.webm" type="video/webm" />
        </video>
        <div className="pointer-events-none absolute inset-0 bg-[#01060e]/45" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-[#01060e]/80 to-transparent" />

        <PublicHeader className="absolute inset-x-0 top-0 mx-auto max-w-[92rem] px-5 py-7 md:px-10" onSignIn={() => openAuth("sign-in")} onSignUp={() => openAuth("sign-up")} />

        <div className="relative z-10 flex w-full items-center justify-center px-5 py-28 text-center">
          <div className="flex max-w-2xl flex-col items-center">
            <p className="font-heading text-4xl font-semibold leading-tight text-bone sm:text-5xl md:text-6xl">
              {messages.home.heroClaim}
            </p>
            <Button
              type="button"
              onClick={() => openAuth("sign-up", "/dashboard?create=1")}
              className="mt-8 min-h-14 bg-bone px-7 py-3 text-base text-night hover:bg-bone/90"
            >
              {messages.home.heroCta} <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 md:px-10 md:py-20">
        <p className="max-w-3xl font-heading text-3xl font-semibold leading-tight text-bone md:text-4xl">
          {messages.home.overview}
        </p>
      </section>

      <section>
        <div className="mx-auto max-w-5xl px-5 py-16 md:px-10 md:py-20">
          <div className="grid gap-10 md:grid-cols-2 md:gap-16">
            <article>
              <UsersRound aria-hidden="true" size={56} strokeWidth={1.35} className="text-bone/80" />
              <h2 className="mt-6 font-heading text-2xl font-semibold text-bone">{messages.home.collectiveEyebrow}</h2>
              <p className="mt-3 max-w-md text-base leading-7 text-bone/68">{messages.home.collectiveTitle}</p>
            </article>
            <article>
              <UserRound aria-hidden="true" size={56} strokeWidth={1.35} className="text-bone/80" />
              <h2 className="mt-6 font-heading text-2xl font-semibold text-bone">{messages.home.individualEyebrow}</h2>
              <p className="mt-3 max-w-md text-base leading-7 text-bone/68">{messages.home.individualTitle}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 md:px-10 md:py-20">
        <h2 className="max-w-3xl font-heading text-4xl font-semibold leading-tight text-bone md:text-5xl">{messages.home.howTitle}</h2>
        <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          <EditorialStep number="01" title={messages.home.howCreateTitle} body={messages.home.howCreateBody} visual="builder" />
          <EditorialStep number="02" title={messages.home.howEngageTitle} body={messages.home.howEngageBody} visual="participant" />
          <EditorialStep number="03" title={messages.home.howUnderstandTitle} body={messages.home.howUnderstandBody} visual="results" />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 md:px-10 md:py-20">
        <div className="grid gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-16">
          <div>
            <h2 className="font-heading text-4xl font-semibold leading-tight text-bone md:text-5xl">{messages.home.activitiesTitle}</h2>
          </div>
          <div className="border-t border-bone/14">
            <ActivityCapability title={messages.home.activityExplore} body={messages.home.activityExploreBody} />
            <ActivityCapability title={messages.home.activityReflect} body={messages.home.activityReflectBody} />
            <ActivityCapability title={messages.home.activityPrioritize} body={messages.home.activityPrioritizeBody} />
            <ActivityCapability title={messages.home.activityAgree} body={messages.home.activityAgreeBody} />
            <ActivityCapability title={messages.home.activityPlan} body={messages.home.activityPlanBody} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 md:px-10 md:py-20">
        <div className="grid items-end gap-10 md:grid-cols-[minmax(0,1fr)_minmax(17rem,0.72fr)] md:gap-16">
          <div>
            <h2 className="max-w-2xl font-heading text-4xl font-semibold leading-tight text-bone md:text-5xl">{messages.home.resultsTitle}</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-bone/64">{messages.home.resultsBody}</p>
          </div>
          <ResultsPreview />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 md:px-10 md:py-28">
        <h2 className="max-w-3xl font-heading text-5xl font-semibold leading-[1.02] text-bone md:text-7xl">{messages.home.finalTitle}</h2>
        <Button type="button" onClick={() => openAuth("sign-up", "/dashboard?create=1")} className="mt-8 min-h-14 bg-bone px-7 py-3 text-base text-night hover:bg-bone/90">
          {messages.home.heroCta} <ArrowRight size={18} />
        </Button>
      </section>

      <div className="mx-auto max-w-5xl px-5 pb-8 md:px-10">
        <LegalFooter />
      </div>
    </main>
    {authMode ? <HomeAuthDialog pending={authPending} onClose={closeAuth}>
      <LoginContent embedded onBusyChange={setAuthPending} className="ritual-overlay-surface auth-dialog-panel auth-dialog-scroll max-h-[calc(100dvh-3rem)] overflow-y-auto p-6 pb-12 sm:p-8 sm:pb-12" />
    </HomeAuthDialog> : null}
    </>
  );
}

function EditorialStep({ number, title, body, visual }: { number: string; title: string; body: string; visual: "builder" | "participant" | "results" }) {
  return <article className="border-t border-bone/14 pt-5"><p className="text-sm font-semibold text-bone/45">{number}</p><h3 className="mt-8 font-heading text-2xl font-semibold text-bone">{title}</h3><p className="mt-3 text-base leading-7 text-bone/64">{body}</p><ProductMoment type={visual} /></article>;
}

function ProductMoment({ type }: { type: "builder" | "participant" | "results" }) {
  if (type === "builder") return <div aria-hidden="true" className="mt-8 border-y border-bone/12 py-5"><div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-bone" /><span className="h-px flex-1 bg-bone/25" /><span className="h-1.5 w-1.5 rounded-full bg-bone/45" /><span className="h-px flex-1 bg-bone/25" /><span className="h-1.5 w-1.5 rounded-full bg-bone/25" /></div><div className="mt-5 space-y-2"><span className="block h-px w-full bg-bone/25" /><span className="block h-px w-4/5 bg-bone/25" /><span className="block h-px w-3/5 bg-bone/25" /></div></div>;
  if (type === "participant") return <div aria-hidden="true" className="mt-8 border-y border-bone/12 py-5"><span className="block h-2 w-1/3 bg-bone/25" /><span className="mt-4 block h-3 w-full bg-bone/80" /><span className="mt-2 block h-3 w-4/5 bg-bone/80" /><span className="mt-6 block h-10 w-full border border-bone/35" /></div>;
  return <div aria-hidden="true" className="mt-8 border-y border-bone/12 py-5"><div className="flex items-end gap-2"><span className="h-7 w-1/5 bg-bone/28" /><span className="h-12 w-1/5 bg-bone/48" /><span className="h-20 w-1/5 bg-bone" /><span className="h-10 w-1/5 bg-bone/38" /></div></div>;
}

function ActivityCapability({ title, body }: { title: string; body: string }) {
  return <article className="home-editorial-row grid gap-3 border-b border-bone/14 py-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6"><h3 className="font-heading text-xl font-semibold text-bone">{title}</h3><p className="text-sm leading-6 text-bone/62">{body}</p></article>;
}

function ResultsPreview() {
  return <div aria-hidden="true" className="border-y border-bone/14 py-5"><div className="flex items-end gap-2"><span className="h-7 w-1/5 bg-bone/28" /><span className="h-12 w-1/5 bg-bone/48" /><span className="h-20 w-1/5 bg-bone" /><span className="h-10 w-1/5 bg-bone/38" /></div><div className="mt-8 space-y-4">{[78, 16, 6].map((value) => <span key={value} className="block h-px bg-bone/15"><span className="block h-px bg-bone" style={{ width: `${value}%` }} /></span>)}</div></div>;
}

function HomeAuthDialog({ children, onClose, pending }: { children: React.ReactNode; onClose: () => void; pending: boolean }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFirst = () => {
      const focusable = dialogRef.current?.querySelector<HTMLElement>("button:not([disabled]), input:not([disabled]), a[href], select:not([disabled]), textarea:not([disabled])");
      focusable?.focus();
    };
    const frame = window.requestAnimationFrame(focusFirst);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), a[href], select:not([disabled]), textarea:not([disabled])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose, pending]);

  return (
    <div className="auth-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#01060e]/74 px-4 py-6 backdrop-blur-md" onMouseDown={() => !pending && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Authentication"
        className="relative w-full max-w-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" aria-label="Close" disabled={pending} onClick={onClose} className="absolute right-4 top-4 z-10 rounded-md p-2 text-bone/55 transition hover:bg-bone/10 hover:text-bone focus:outline-none focus:ring-2 focus:ring-mint disabled:cursor-not-allowed disabled:opacity-50">
          <X size={18} aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
}
