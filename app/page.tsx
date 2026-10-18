"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowRight, ChevronDown, Play, X } from "lucide-react";
import { LoginContent } from "@/components/auth/LoginContent";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { LegalFooter } from "@/components/legal/LegalFooter";
import { Button } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

type HomeAuthMode = "sign-in" | "sign-up";
type ActivityIllustration = "Explore" | "Reflect" | "Prioritize" | "Agree" | "Plan";

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
  const [openActivity, setOpenActivity] = useState<ActivityIllustration | null>(null);
  const previewLabels = { play: messages.home.playPreview, pause: messages.home.pausePreview };

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

      <section className="mx-auto max-w-5xl px-5 pt-16 pb-8 md:px-10 md:pt-20 md:pb-8">
        <p className="max-w-3xl font-heading text-3xl font-semibold leading-tight text-bone md:text-4xl">
          {messages.home.overview}
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 pt-2 pb-12 md:px-10 md:pt-4 md:pb-16">
        <div className="border-t border-[#303641]">
          <ActivityCapability illustration="Explore" title={messages.home.activityExplore} body={messages.home.activityExploreBody} open={openActivity === "Explore"} onOpenChange={setOpenActivity} previewLabels={previewLabels} />
          <ActivityCapability illustration="Reflect" title={messages.home.activityReflect} body={messages.home.activityReflectBody} open={openActivity === "Reflect"} onOpenChange={setOpenActivity} previewLabels={previewLabels} />
          <ActivityCapability illustration="Prioritize" title={messages.home.activityPrioritize} body={messages.home.activityPrioritizeBody} open={openActivity === "Prioritize"} onOpenChange={setOpenActivity} previewLabels={previewLabels} />
          <ActivityCapability illustration="Agree" title={messages.home.activityAgree} body={messages.home.activityAgreeBody} open={openActivity === "Agree"} onOpenChange={setOpenActivity} previewLabels={previewLabels} />
          <ActivityCapability illustration="Plan" title={messages.home.activityPlan} body={messages.home.activityPlanBody} open={openActivity === "Plan"} onOpenChange={setOpenActivity} previewLabels={previewLabels} />
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-5xl px-5 py-16 md:px-10 md:py-20">
          <h2 className="font-heading text-4xl font-semibold leading-tight text-bone md:text-[2.5rem]">{messages.home.modesTitle}</h2>
          <div className="mt-8 grid gap-10 md:mt-12 md:grid-cols-2 md:gap-16">
            <article>
              <div className="relative h-40 overflow-hidden">
                <Image src="/illustrations/Collective.svg" alt="" width={288} height={288} aria-hidden="true" className="absolute -left-[26px] top-1/2 h-72 w-72 -translate-y-1/2" />
              </div>
              <h3 className="mt-3 font-heading text-2xl font-semibold text-bone">{messages.home.collectiveEyebrow}</h3>
              <p className="mt-3 max-w-md text-base leading-7 text-bone/68">{messages.home.collectiveTitle}</p>
            </article>
            <article>
              <div className="relative h-40 overflow-hidden">
                <Image src="/illustrations/Individual.svg" alt="" width={288} height={288} aria-hidden="true" className="absolute -left-[73px] top-1/2 h-72 w-72 -translate-y-1/2" />
              </div>
              <h3 className="mt-3 font-heading text-2xl font-semibold text-bone">{messages.home.individualEyebrow}</h3>
              <p className="mt-3 max-w-md text-base leading-7 text-bone/68">{messages.home.individualTitle}</p>
            </article>
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

function ActivityCapability({ illustration, title, body, open, onOpenChange, previewLabels }: { illustration: ActivityIllustration; title: string; body: string; open: boolean; onOpenChange: Dispatch<SetStateAction<ActivityIllustration | null>>; previewLabels: { play: string; pause: string } }) {
  const [hasOpened, setHasOpened] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const articleRef = useRef<HTMLElement | null>(null);
  const pointerInside = useRef(false);
  const lastPointerPosition = useRef<{ x: number; y: number } | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewId = `activity-preview-${illustration.toLowerCase()}`;

  useEffect(() => () => {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!open) video.pause();
    else if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) void video.play().catch(() => {});
  }, [open, hasOpened]);

  useEffect(() => {
    if (!open) return;
    function handlePointerMove(event: PointerEvent) {
      const article = articleRef.current;
      if (event.pointerType !== "mouse" || !article || article.contains(event.target as Node) || article.contains(document.activeElement)) return;
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => {
        onOpenChange((current) => current === illustration ? null : current);
      }, 600);
    }
    document.addEventListener("pointermove", handlePointerMove);
    return () => document.removeEventListener("pointermove", handlePointerMove);
  }, [open, illustration, onOpenChange]);

  function clearTimers() {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }

  function closePreview() {
    onOpenChange((current) => current === illustration ? null : current);
  }

  function showPreview() {
    setHasOpened(true);
    onOpenChange(illustration);
  }

  return (
    <article
      ref={articleRef}
      className="home-editorial-row border-b border-[#303641]"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") {
          pointerInside.current = true;
          clearTimers();
        }
      }}
      onPointerMove={(event) => {
        if (event.pointerType === "mouse") {
          lastPointerPosition.current = { x: event.clientX, y: event.clientY };
          if (!open && openTimer.current === null) openTimer.current = window.setTimeout(() => {
            openTimer.current = null;
            showPreview();
          }, 450);
        }
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") {
          pointerInside.current = false;
          clearTimers();
          const moved = lastPointerPosition.current?.x !== event.clientX || lastPointerPosition.current?.y !== event.clientY;
          if (moved && !event.currentTarget.contains(document.activeElement)) closeTimer.current = window.setTimeout(closePreview, 600);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget) && !pointerInside.current) {
          clearTimers();
          closePreview();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          clearTimers();
          closePreview();
        }
      }}
    >
      <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-5 gap-y-2 py-4 sm:grid-cols-[7rem_7rem_minmax(0,1fr)] sm:gap-x-5 sm:py-5">
        <Image src={`/illustrations/${illustration}.svg`} alt="" width={112} height={112} aria-hidden="true" className="row-span-2 h-24 w-24 sm:row-span-1 sm:h-28 sm:w-28" />
        <h3 className="self-end font-heading text-xl font-semibold text-bone sm:self-center">
          <button type="button" aria-expanded={open} aria-controls={previewId} onClick={() => { clearTimers(); if (open) closePreview(); else showPreview(); }} className="inline-flex min-h-11 items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone">
            {title}<ChevronDown size={16} aria-hidden="true" className={`shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
          </button>
        </h3>
        <p className="col-start-2 self-start text-sm leading-6 text-bone/62 sm:col-start-auto sm:self-center">{body}</p>
      </div>
      <div id={previewId} aria-hidden={!open} inert={!open} className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="min-h-0 overflow-hidden">
        {hasOpened ? <div className="pb-6 sm:pb-8">
          {illustration === "Plan" ? (
            <Image src="/video/activity-previews/plan.webp" alt={title} width={1917} height={833} className="h-auto w-full" />
          ) : (
            <button
              type="button"
              aria-label={`${isPlaying ? previewLabels.pause : previewLabels.play}: ${title}`}
              className="relative block w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
              onClick={() => {
                const video = videoRef.current;
                if (!video) return;
                if (video.paused) void video.play().catch(() => {});
                else video.pause();
              }}
            >
              <video
                ref={videoRef}
                src={`/video/activity-previews/${illustration.toLowerCase()}.webm`}
                aria-hidden="true"
                className="block aspect-[1920/500] w-full bg-[#01060e] object-contain"
                loop
                muted
                playsInline
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              {!isPlaying ? <span className="pointer-events-none absolute inset-0 grid place-items-center"><span className="rounded-full bg-night/75 p-4 text-bone"><Play size={24} aria-hidden="true" /></span></span> : null}
            </button>
          )}
        </div> : null}
        </div>
      </div>
    </article>
  );
}

function ResultsPreview() {
  return <div className="grid grid-cols-3 items-center gap-2 sm:gap-4">{["Word", "Excel", "Json"].map((format) => <Image key={format} src={`/illustrations/${format}.svg`} alt={format === "Json" ? "JSON" : format} width={160} height={160} className="h-auto w-full" />)}</div>;
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
