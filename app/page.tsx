"use client";

import { Suspense } from "react";
import { ArrowRight, LogIn } from "lucide-react";
import { AmbientBackground } from "@/components/ambient/AmbientBackground";
import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

const introOffsets = [
  { x: "-10px", y: "16px" },
  { x: "8px", y: "18px" },
  { x: "-12px", y: "14px" },
  { x: "10px", y: "20px" },
  { x: "-8px", y: "12px" },
  { x: "12px", y: "16px" }
];

function AnimatedHeadline({ text }: { text: string }) {
  const segments = text.split(" ");

  return (
    <h1 className="max-w-6xl font-heading text-6xl font-semibold leading-[0.94] text-bone md:text-8xl">
      {segments.map((segment, index) => {
        const offset = introOffsets[index % introOffsets.length];
        return (
          <span
            key={`${segment}-${index}`}
            className="innesco-word mr-[0.22em] inline-block"
            style={{
              animationDelay: `${index * 55}ms`,
              ["--intro-x" as string]: offset.x,
              ["--intro-y" as string]: offset.y
            }}
          >
            {segment}
          </span>
        );
      })}
    </h1>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { messages, href } = useLocale();

  return (
    <AppShell wide showHeaderDivider={false}>
      <div className="pointer-events-none fixed inset-0 z-0">
        <AmbientBackground intensity="medium" />
      </div>
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, rgba(8, 13, 20, 0.78) 0%, rgba(8, 13, 20, 0.34) 24%, rgba(8, 13, 20, 0) 52%), radial-gradient(ellipse at 28% 66%, rgba(8, 13, 20, 0.66) 0%, rgba(8, 13, 20, 0.28) 34%, rgba(8, 13, 20, 0) 66%)"
        }}
      />
      <section className="relative z-10 flex min-h-[70vh] items-end pb-24">
        <div className="max-w-5xl">
          <AnimatedHeadline text={messages.home.title} />
          <p className="mt-5 max-w-2xl text-lg leading-8 text-bone/78">
            {messages.home.body}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href={href("/login?next=%2Fdashboard%3Fcreate%3D1")} className="min-h-12 bg-mint px-6 py-3 text-base text-night hover:bg-mint/85">
              {messages.home.cta} <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink href={href("/login?next=%2Fdashboard")} variant="secondary" className="min-h-12 border-bone/10 bg-night/50 px-6 py-3 text-base hover:bg-night/65">
              {messages.home.secondary} <LogIn size={17} />
            </ButtonLink>
            <ButtonLink href={href("/login?mode=sign-up&next=%2Fdashboard")} variant="ghost" className="min-h-12 px-4 py-3 text-base">
              {messages.home.tertiary}
            </ButtonLink>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
