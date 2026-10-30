"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import { SetupContent } from "@/app/live/setup/SetupContent";
import { AssessmentBuilder } from "@/components/builder/AssessmentBuilder";
import { Designer } from "@/lib/auth/designerAuth";
import { DesignerAuthGate } from "@/components/auth/DesignerAuthGate";
import { AssessmentCreationCard } from "@/components/dashboard/AssessmentCreationCard";
import { AssessmentManagementCard } from "@/components/dashboard/AssessmentManagementCard";
import { PublishSuccessDialog } from "@/components/dashboard/PublishSuccessDialog";
import { LiveSessionCard } from "@/components/dashboard/LiveSessionCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button, Card } from "@/components/ritual-ui";
import { AssessmentTemplate } from "@/data/templates/nasijSustainabilityAssessmentTemplate";
import { Assessment } from "@/types/assessment";
import {
  AssessmentBundle,
  createSupabaseAssessment,
  createSupabaseDateFindingAssessment,
  createSupabaseAssessmentFromExistingTemplate,
  createSupabaseAssessmentFromTemplate,
  deleteSupabaseAssessment,
  fetchDesignerAssessmentBundles
} from "@/lib/supabase/assessmentRepository";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { markAssessmentAsTemplate, templateAssessmentIdsForOwner, unmarkAssessmentAsTemplate } from "@/lib/templates/templateStore";
import { useLocale } from "@/lib/i18n/useLocale";
import { getErrorMessage } from "@/lib/utils/errors";
import { listLiveSessions } from "@/lib/live/repository";
import { stashPendingRitualFile, validateRitualFile } from "@/lib/live/ritual-file";
import { useDismissiblePopover } from "@/lib/ui/use-dismissible-popover";
import type { DashboardLiveSession } from "@/types/live";

type RitualGroup = "inProgress" | "drafts" | "completed" | "paused";
type RitualTypeFilter = "all" | "individual" | "collective";
type DashboardEntry = {
  id: string;
  type: "individual" | "collective";
  title: string;
  updatedAt: string;
  group: RitualGroup;
  bundle?: AssessmentBundle;
  session?: DashboardLiveSession;
};
type DashboardDateGroupId = "today" | "yesterday" | "last7Days" | "older";
type DashboardDateGroup = { id: DashboardDateGroupId; label: string; entries: DashboardEntry[] };
type DashboardSection = { id: string; label: string; entries: DashboardEntry[]; dateGroups?: DashboardDateGroup[] };

function updatedDateGroup(updatedAt: string, todayOrdinal: number): DashboardDateGroupId {
  const date = new Date(updatedAt);
  if (!Number.isFinite(date.getTime())) return "older";
  const dateOrdinal = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.max(0, Math.floor((todayOrdinal - dateOrdinal) / 86_400_000));
  if (daysAgo === 0) return "today";
  if (daysAgo === 1) return "yesterday";
  if (daysAgo <= 7) return "last7Days";
  return "older";
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DesignerAuthGate>
        {(designer) => (
          <DashboardShell designer={designer}>
            <DashboardContent designer={designer} />
          </DashboardShell>
        )}
      </DesignerAuthGate>
    </Suspense>
  );
}

function DashboardContent({ designer }: { designer: Designer }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, messages, href } = useLocale();
  const [bundles, setBundles] = useState<AssessmentBundle[]>([]);
  const [liveSessions, setLiveSessions] = useState<DashboardLiveSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<RitualTypeFilter>("all");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [templateIds, setTemplateIds] = useState<Set<string>>(new Set());
  const [favoritesAvailable, setFavoritesAvailable] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [creationOpen, setCreationOpen] = useState(false);
  const [creationAnchor, setCreationAnchor] = useState<"header" | "empty">("header");
  const [creationType, setCreationType] = useState<"choose" | "assessment">("choose");
  const [liveCloseRequested, setLiveCloseRequested] = useState(false);
  const [publishedAssessment, setPublishedAssessment] = useState<Assessment | null>(null);
  const setupType = searchParams.get("setup");
  const collectiveSessionId = setupType === "collective" ? searchParams.get("id") : null;
  const individualAssessmentId = setupType === "individual" ? searchParams.get("assessment") : null;
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creationPopoverRef = useRef<HTMLSpanElement | null>(null);
  const ritualFileInputRef = useRef<HTMLInputElement | null>(null);
  const templateBundles = useMemo(
    () => bundles.filter((bundle) => templateIds.has(bundle.assessment.id)),
    [bundles, templateIds]
  );
  const assessmentBundles = useMemo(
    () => bundles.filter((bundle) => !templateIds.has(bundle.assessment.id)),
    [bundles, templateIds]
  );
  const dashboardEntries = useMemo<DashboardEntry[]>(() => [
    ...assessmentBundles.map((bundle): DashboardEntry => ({
      id: bundle.assessment.id,
      type: "individual",
      title: bundle.assessment.title,
      updatedAt: bundle.assessment.updatedAt,
      group: bundle.assessment.status === "draft" ? "drafts" : bundle.assessment.status === "closed" ? "completed" : bundle.assessment.status === "paused" ? "paused" : "inProgress",
      bundle
    })),
    ...liveSessions.map((session): DashboardEntry => ({
      id: session.id,
      type: "collective",
      title: session.title,
      updatedAt: session.updated_at,
      group: session.status === "draft" || session.status === "setup" ? "drafts" : session.status === "closed" ? "completed" : "inProgress",
      session
    }))
  ], [assessmentBundles, liveSessions]);
  const filteredEntries = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase(locale).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return dashboardEntries
      .filter((entry) => {
        const matchesQuery = !normalizedQuery || entry.title.toLocaleLowerCase(locale).normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalizedQuery);
        const matchesType = typeFilter === "all" || entry.type === typeFilter;
        return matchesQuery && matchesType;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [dashboardEntries, locale, searchQuery, typeFilter]);
  const today = new Date();
  const todayOrdinal = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const dateGroupDefinitions: { id: DashboardDateGroupId; label: string }[] = [
    { id: "today", label: messages.dashboard.sectionToday },
    { id: "yesterday", label: messages.dashboard.sectionYesterday },
    { id: "last7Days", label: messages.dashboard.sectionLast7Days },
    { id: "older", label: messages.dashboard.sectionOlder }
  ];
  const allDateGroups: DashboardDateGroup[] = dateGroupDefinitions.map((group) => ({
    ...group,
    entries: filteredEntries.filter((entry) => updatedDateGroup(entry.updatedAt, todayOrdinal) === group.id)
  }));
  const dashboardSections: DashboardSection[] = [
    { id: "favorites", label: "Favorites", entries: filteredEntries.filter((entry) => favoriteIds.has(`${entry.type}:${entry.id}`)) },
    { id: "drafts", label: messages.dashboard.sectionDrafts, entries: filteredEntries.filter((entry) => entry.group === "drafts") },
    { id: "all", label: "All Rituals", entries: filteredEntries, dateGroups: allDateGroups }
  ];

  function resetDashboardFilters() {
    setSearchQuery("");
    setTypeFilter("all");
  }

  useDismissiblePopover(creationOpen, creationPopoverRef, () => {
    setCreationOpen(false);
    setCreationType("choose");
  });

  useEffect(() => {
    const refreshTemplateIds = () => setTemplateIds(templateAssessmentIdsForOwner(designer.id));
    refreshTemplateIds();
    window.addEventListener("ritual-assessment-storage", refreshTemplateIds);
    window.addEventListener("storage", refreshTemplateIds);
    return () => {
      window.removeEventListener("ritual-assessment-storage", refreshTemplateIds);
      window.removeEventListener("storage", refreshTemplateIds);
    };
  }, [designer.id]);

  useEffect(() => {
    let active = true;
    async function refresh() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      setError(null);
      try {
        const [nextBundles, nextLiveSessions] = await Promise.all([fetchDesignerAssessmentBundles(designer.id), listLiveSessions()]);
        if (!active) return;
        setBundles(nextBundles);
        setLiveSessions(nextLiveSessions);
        const favoritesResult = await supabase!.from("dashboard_favorites").select("resource_type,resource_id").eq("user_id", designer.id);
        if (!active) return;
        if (favoritesResult.error) {
          setFavoritesAvailable(false);
          setFavoriteIds(new Set());
        } else {
          setFavoritesAvailable(true);
          setFavoriteIds(new Set((favoritesResult.data ?? []).map((item) => `${item.resource_type}:${item.resource_id}`)));
        }
      } catch (dashboardError) {
        if (!active) return;
        setError(getErrorMessage(dashboardError, messages.auth.signInError));
      } finally {
        if (active) setLoading(false);
      }
    }
    void refresh();
    return () => {
      active = false;
    };
  }, [designer.id, messages.auth.signInError]);

  useEffect(() => {
    async function bootstrapPlatformAdmin() {
      if (!supabase) return;
      const bootstrapKey = `ritual-admin-bootstrap:${designer.id}`;
      if (window.sessionStorage.getItem(bootstrapKey)) return;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/admin/bootstrap", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => null);
      if (response?.ok) window.sessionStorage.setItem(bootstrapKey, "1");
    }
    void bootstrapPlatformAdmin();
  }, [designer.id]);

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCreationOpen(true);
    router.replace(href("/dashboard"));
  }, [href, router, searchParams]);

  function handleDeleteAssessment(assessmentId: string) {
    setBundles((current) => current.filter((bundle) => bundle.assessment.id !== assessmentId));
  }

  async function handleToggleFavorite(entry: DashboardEntry) {
    if (!supabase || !favoritesAvailable) return;
    const key = `${entry.type}:${entry.id}`;
    const isFavorite = favoriteIds.has(key);
    setFavoriteIds((current) => { const next = new Set(current); if (isFavorite) next.delete(key); else next.add(key); return next; });
    const result = isFavorite
      ? await supabase.from("dashboard_favorites").delete().eq("user_id", designer.id).eq("resource_type", entry.type).eq("resource_id", entry.id)
      : await supabase.from("dashboard_favorites").insert({ user_id: designer.id, resource_type: entry.type, resource_id: entry.id });
    if (result.error) setFavoriteIds((current) => { const next = new Set(current); if (isFavorite) next.add(key); else next.delete(key); return next; });
  }

  async function handleDuplicateAssessment(assessment: AssessmentBundle["assessment"]) {
    setError(null);
    try {
      const duplicate = await createSupabaseAssessmentFromExistingTemplate(assessment);
      setBundles((current) => [{ assessment: duplicate, participants: [], responses: [], responseCount: 0 }, ...current]);
    } catch (duplicateError) {
      setError(getErrorMessage(duplicateError, messages.assessmentCreate.createError));
    }
  }

  function handleResetAssessmentResults(assessmentId: string) {
    setBundles((current) => current.map((bundle) =>
      bundle.assessment.id === assessmentId
        ? { ...bundle, participants: [], responses: [], responseCount: 0 }
        : bundle
    ));
  }

  function handleUpdateAssessment(nextAssessment: AssessmentBundle["assessment"]) {
    setBundles((current) =>
      current.map((bundle) =>
        bundle.assessment.id === nextAssessment.id ? { ...bundle, assessment: nextAssessment } : bundle
      )
    );
  }

  function handleDeleteLiveSession(sessionId: string) {
    setLiveSessions((current) => current.filter((session) => session.id !== sessionId));
  }

  async function handleCloseLiveSetup() {
    router.replace(href("/dashboard"), { scroll: false });
    setCreationOpen(false);
    setCreationType("choose");
    setLiveCloseRequested(false);
    try {
      setLiveSessions(await listLiveSessions());
    } catch (liveError) {
      setError(getErrorMessage(liveError, messages.auth.signInError));
    }
  }

  async function handleCloseIndividualSetup() {
    router.replace(href("/dashboard"), { scroll: false });
    setCreationOpen(false);
    setCreationType("choose");
    try {
      setBundles(await fetchDesignerAssessmentBundles(designer.id));
    } catch (dashboardError) {
      setError(getErrorMessage(dashboardError, messages.auth.signInError));
    }
  }

  async function handleCreateBlankAssessment() {
    if (!isSupabaseConfigured || creating) return;
    setCreating(true);
    setError(null);
    try {
      const assessment = await createSupabaseAssessment(locale);
      setCreationOpen(false);
      setCreationType("choose");
      router.push(href(`/dashboard?setup=individual&assessment=${encodeURIComponent(assessment.id)}`), { scroll: false });
    } catch (createError) {
      setError(getErrorMessage(createError, messages.auth.signInError));
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateDateFindingAssessment() {
    if (!isSupabaseConfigured || creating) return;
    setCreating(true);
    setError(null);
    try {
      const assessment = await createSupabaseDateFindingAssessment(locale);
      setCreationOpen(false);
      setCreationType("choose");
      router.push(href(`/dashboard?setup=individual&assessment=${encodeURIComponent(assessment.id)}&findDate=1`), { scroll: false });
    } catch (createError) {
      setError(getErrorMessage(createError, messages.assessmentCreate.createError));
    } finally {
      setCreating(false);
    }
  }

  async function handleBuildTemplate() {
    if (!isSupabaseConfigured || creating) return;
    setCreating(true);
    setError(null);
    try {
      const assessment = await createSupabaseAssessment(locale);
      markAssessmentAsTemplate(assessment.id, designer.id);
      setCreationOpen(false);
      setCreationType("choose");
      router.push(href(`/dashboard?setup=individual&assessment=${encodeURIComponent(assessment.id)}&template=1`), { scroll: false });
    } catch (createError) {
      setError(getErrorMessage(createError, messages.assessmentCreate.createError));
    } finally {
      setCreating(false);
    }
  }

  async function handleUseTemplate(template: AssessmentTemplate) {
    if (!isSupabaseConfigured || creating) return;
    setCreating(true);
    setError(null);
    try {
      const assessment = await createSupabaseAssessmentFromTemplate(template);
      setCreationOpen(false);
      setCreationType("choose");
      router.push(href(`/dashboard?setup=individual&assessment=${encodeURIComponent(assessment.id)}`), { scroll: false });
    } catch (createError) {
      setError(getErrorMessage(createError, messages.assessmentCreate.createError));
    } finally {
      setCreating(false);
    }
  }

  async function handleUseUserTemplate(templateAssessment: AssessmentBundle["assessment"]) {
    if (!isSupabaseConfigured || creating) return;
    setCreating(true);
    setError(null);
    try {
      const assessment = await createSupabaseAssessmentFromExistingTemplate(templateAssessment);
      setCreationOpen(false);
      setCreationType("choose");
      router.push(href(`/dashboard?setup=individual&assessment=${encodeURIComponent(assessment.id)}`), { scroll: false });
    } catch (createError) {
      setError(getErrorMessage(createError, messages.assessmentCreate.createError));
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteTemplate(templateAssessment: AssessmentBundle["assessment"]) {
    try {
      await deleteSupabaseAssessment(templateAssessment.id);
      unmarkAssessmentAsTemplate(templateAssessment.id, designer.id);
      setBundles((current) => current.filter((bundle) => bundle.assessment.id !== templateAssessment.id));
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, messages.template.delete.error));
    }
  }

  async function handleRitualFile(file: File | null) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setError("The Ritual file is too large. Choose a file smaller than 1 MB.");
      return;
    }
    try {
      const parsed = validateRitualFile(JSON.parse(await file.text()));
      stashPendingRitualFile(parsed);
      setCreationOpen(false);
      setLiveCloseRequested(false);
      router.push(href("/dashboard?setup=collective"), { scroll: false });
    } catch {
      setError("This is not a valid Ritual file.");
    }
  }

  function renderCreationTrigger(anchor: "header" | "empty") {
    const open = creationOpen && creationAnchor === anchor;
    return (
          <span ref={creationAnchor === anchor ? creationPopoverRef : undefined} className="relative inline-flex">
            <Button
              type="button"
              disabled={!isSupabaseConfigured}
              aria-expanded={open}
              onClick={() => {
                setCreationAnchor(anchor);
                setCreationOpen(!open);
                setCreationType("choose");
              }}
            >
              {messages.dashboard.newRitual}
            </Button>
            {open ? (
              <div className={`absolute top-[calc(100%+0.625rem)] z-50 ${anchor === "empty" ? "left-1/2 -translate-x-1/2" : "left-0"}`}>
                {creationType === "choose" ? (
                  <Card className="ritual-popover-surface w-[min(calc(100vw-2rem),24rem)] border p-3">
                    <div className="space-y-1">
                      <button type="button" className="block w-full rounded-md px-3 py-3 text-left transition hover:bg-bone/6 focus:outline-none focus:ring-2 focus:ring-mint" onClick={() => {
                        setCreationOpen(false);
                        setLiveCloseRequested(false);
                        router.push(href("/dashboard?setup=collective"), { scroll: false });
                      }}>
                        <div className="flex items-center gap-3"><Image src="/illustrations/Collective.svg" alt="" width={48} height={48} aria-hidden="true" className="shrink-0" /><div><h2 className="font-heading text-xl font-semibold text-bone">Collective</h2><p className="mt-1 text-sm leading-5 text-bone/60">Together, in real time.</p></div></div>
                      </button>
                      <button type="button" className="block w-full rounded-md px-3 py-3 text-left transition hover:bg-bone/6 focus:outline-none focus:ring-2 focus:ring-mint" onClick={() => setCreationType("assessment")}>
                        <div className="flex items-center gap-3"><Image src="/illustrations/Individual.svg" alt="" width={48} height={48} aria-hidden="true" className="shrink-0" /><div><h2 className="font-heading text-xl font-semibold text-bone">Individual</h2><p className="mt-1 text-sm leading-5 text-bone/60">Completed independently.</p></div></div>
                      </button>
                      <div className="mx-3 border-t border-bone/10" />
                      <button type="button" className="w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-bone/62 transition hover:bg-bone/6 hover:text-bone focus:outline-none focus:ring-2 focus:ring-mint" onClick={() => ritualFileInputRef.current?.click()}>Import ritual</button>
                    </div>
                  </Card>
                ) : <AssessmentCreationCard
                  creating={creating}
                  userTemplates={templateBundles.map((bundle) => bundle.assessment)}
                  onCreateBlank={() => void handleCreateBlankAssessment()}
                  onUseDefaultTemplate={(template) => void handleUseTemplate(template)}
                  onUseUserTemplate={(assessment) => void handleUseUserTemplate(assessment)}
                  onBuildTemplate={() => void handleBuildTemplate()}
                  onDeleteTemplate={(assessment) => void handleDeleteTemplate(assessment)}
                />}
              </div>
            ) : null}
          </span>
    );
  }

  function renderFindDateTrigger() {
    return <Button type="button" variant="secondary" className="border-2 !border-bone" disabled={!isSupabaseConfigured || creating} onClick={() => void handleCreateDateFindingAssessment()}>
      {creating ? messages.app.loading : messages.dashboard.findDate}
    </Button>;
  }

  function renderEntryCards(entries: DashboardEntry[]) {
    return <div className="grid gap-4 xl:grid-cols-3">
      {entries.map((entry) => entry.type === "collective" && entry.session ? (
        <LiveSessionCard
          key={`live:${entry.id}`}
          session={entry.session}
          onDelete={handleDeleteLiveSession}
          favorite={favoriteIds.has(`collective:${entry.id}`)}
          onToggleFavorite={favoritesAvailable ? () => void handleToggleFavorite(entry) : undefined}
        />
      ) : entry.type === "individual" && entry.bundle ? (
        <AssessmentManagementCard
          key={`assessment:${entry.id}`}
          assessment={entry.bundle.assessment}
          responses={entry.bundle.responses}
          currentUserId={designer.id}
          favorite={favoriteIds.has(`individual:${entry.id}`)}
          responseCount={entry.bundle.responseCount}
          onToggleFavorite={favoritesAvailable ? () => void handleToggleFavorite(entry) : undefined}
          onDuplicate={(assessment) => void handleDuplicateAssessment(assessment)}
          onResetResults={handleResetAssessmentResults}
          onDelete={handleDeleteAssessment}
          onUpdate={handleUpdateAssessment}
        />
      ) : null)}
    </div>;
  }

  return (
    <>
      <input
        ref={ritualFileInputRef}
        type="file"
        accept="application/json,.json,.ritual"
        className="sr-only"
        onChange={(event) => {
          void handleRitualFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
      <div className="relative">
        <h1 className="font-heading text-4xl font-semibold leading-none text-bone sm:text-5xl">{messages.dashboard.title}</h1>
      </div>
      <div className="mt-6 sm:mt-8">
        {!isSupabaseConfigured ? (
          <Card>
            <p className="text-bone/62">{messages.auth.supabaseRequired}</p>
          </Card>
        ) : loading ? (
          <Card><p className="text-bone/50">{messages.app.loading}</p></Card>
        ) : error ? (
          <Card><p className="text-orange">{error}</p></Card>
        ) : dashboardEntries.length ? (
          <div className="space-y-7">
            <div className="flex w-full flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
              <div className="flex shrink-0 items-center gap-2">{renderCreationTrigger("header")}{renderFindDateTrigger()}</div>
              <div className="flex w-full flex-col gap-4 md:w-auto md:flex-1 md:flex-row md:items-end md:justify-end md:gap-6">
                <div role="group" aria-label={messages.dashboard.filterTypes} className="w-full md:w-auto">
                  <div className="flex flex-nowrap gap-1.5">
                    {(["all", "individual", "collective"] as RitualTypeFilter[]).map((type) => {
                      const label = type === "all" ? messages.dashboard.allTypes : type === "individual" ? messages.dashboard.individual : messages.dashboard.collective;
                      const selected = typeFilter === type;
                      return <button key={type} type="button" aria-pressed={selected} onClick={() => setTypeFilter(type)} className={`min-h-8 rounded-full border px-2.5 py-1 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-bone/60 ${selected ? "border-bone/40 bg-bone/10 text-bone" : "border-bone/10 text-bone/60 hover:border-bone/30 hover:text-bone"}`}>{label}</button>;
                    })}
                  </div>
                </div>
                <label className="relative block w-full md:max-w-sm md:w-72">
                <span className="sr-only">{messages.dashboard.searchLabel}</span>
                <Search aria-hidden="true" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bone/45" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={messages.dashboard.searchPlaceholder}
                  className="min-h-9 w-full rounded-md border border-bone/12 bg-bone/[0.025] py-1.5 pl-10 pr-3 text-sm text-bone placeholder:text-bone/40 focus:border-bone/40 focus:outline-none focus:ring-2 focus:ring-bone/30"
                />
                </label>
              </div>
            </div>

            {filteredEntries.length ? dashboardSections.filter((section) => section.entries.length > 0).map((section) => {
              const collapsed = Boolean(collapsedSections[section.id]);
              return (
                <section key={section.id} aria-labelledby={`dashboard-section-${section.id}`}>
                  <button
                    type="button"
                    id={`dashboard-section-${section.id}`}
                    aria-expanded={!collapsed}
                    onClick={() => setCollapsedSections((current) => ({ ...current, [section.id]: !current[section.id] }))}
                    className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-md pr-2 text-left focus:outline-none focus:ring-2 focus:ring-mint"
                  >
                    <ChevronDown aria-hidden="true" size={17} className={`text-bone/55 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
                    <span className="font-heading text-xl font-semibold text-bone">{section.label}</span>
                  </button>
                  {!collapsed ? section.dateGroups ? (
                    <div className="space-y-4">
                      {section.dateGroups.filter((group) => group.entries.length > 0).map((group) => {
                        const groupKey = `all-${group.id}`;
                        const groupCollapsed = Boolean(collapsedSections[groupKey]);
                        return <section key={group.id} aria-labelledby={`dashboard-section-${groupKey}`}>
                          <button
                            type="button"
                            id={`dashboard-section-${groupKey}`}
                            aria-expanded={!groupCollapsed}
                            onClick={() => setCollapsedSections((current) => ({ ...current, [groupKey]: !current[groupKey] }))}
                            className="mb-2 inline-flex min-h-8 items-center gap-2 rounded-md pr-2 text-left focus:outline-none focus:ring-2 focus:ring-mint"
                          >
                            <ChevronDown aria-hidden="true" size={15} className={`text-bone/45 transition-transform ${groupCollapsed ? "-rotate-90" : ""}`} />
                            <span className="text-sm font-semibold text-bone/78">{group.label}</span>
                            <span className="text-xs tabular-nums text-bone/40">{group.entries.length}</span>
                          </button>
                          {!groupCollapsed ? renderEntryCards(group.entries) : null}
                        </section>;
                      })}
                    </div>
                  ) : renderEntryCards(section.entries) : null}
                </section>
              );
            }) : (
              <Card className="!p-6 text-center">
                <p className="text-sm text-bone/65">{messages.dashboard.noFilterResults}</p>
                <Button type="button" variant="ghost" onClick={resetDashboardFilters} className="mt-2">{messages.dashboard.resetFilters}</Button>
              </Card>
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <h2 className="font-heading text-3xl font-semibold text-bone">{messages.dashboard.emptyTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-bone/58">{messages.dashboard.emptyBody}</p>
            <div className="mt-6 flex justify-center gap-2">{renderCreationTrigger("empty")}{renderFindDateTrigger()}</div>
          </div>
        )}
      </div>
      {setupType === "collective" ? <CreationDialog label={messages.home.collectiveEyebrow} closing={liveCloseRequested} onClose={() => setLiveCloseRequested(true)}>
        <SetupContent key={collectiveSessionId ?? "new"} embedded sessionId={collectiveSessionId} closeRequested={liveCloseRequested} onDismiss={() => void handleCloseLiveSetup()} onCloseCancelled={() => setLiveCloseRequested(false)} />
      </CreationDialog> : null}
      {individualAssessmentId ? <CreationDialog mobileFullScreen label={messages.builder.individualTitle} onClose={() => void handleCloseIndividualSetup()}>
        <AssessmentBuilder
          key={individualAssessmentId}
          assessmentId={individualAssessmentId}
          ownerId={designer.id}
          initialTemplateMode={searchParams.get("template") === "1"}
          initiallyOpenSchedulingActivity={searchParams.get("findDate") === "1"}
          embedded
          onDismiss={() => void handleCloseIndividualSetup()}
          onPublishSuccess={(published) => {
            setPublishedAssessment(published);
            void handleCloseIndividualSetup();
          }}
        />
      </CreationDialog> : null}
      {publishedAssessment ? <PublishSuccessDialog assessment={publishedAssessment} onClose={() => setPublishedAssessment(null)} /> : null}
    </>
  );
}

function CreationDialog({ children, label, onClose, closing = false, mobileFullScreen = false }: { children: React.ReactNode; label: string; onClose?: () => void; closing?: boolean; mobileFullScreen?: boolean }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className={`ritual-dialog-backdrop fixed inset-0 z-50 flex ${mobileFullScreen ? "items-stretch p-0 sm:items-center sm:justify-center sm:p-4" : "items-center justify-center p-4"}`} onMouseDown={() => !closing && onClose?.()}>
      <div role="dialog" aria-modal="true" aria-label={label} className={`ritual-overlay-surface ritual-dialog-panel modal-scroll relative w-full overflow-y-auto ${mobileFullScreen ? "h-[100dvh] max-h-[100dvh] max-w-none rounded-none border-0 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+3.5rem)] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-5xl sm:rounded-lg sm:border sm:p-8" : "max-h-[calc(100dvh-2rem)] max-w-5xl rounded-lg border p-5 sm:p-8"}`} onMouseDown={(event) => event.stopPropagation()}>
        {onClose ? <button type="button" aria-label="Close" disabled={closing} onClick={onClose} className="absolute right-3 top-3 z-10 rounded-md p-2 text-bone/55 transition hover:bg-bone/10 hover:text-bone focus:outline-none focus:ring-2 focus:ring-mint disabled:cursor-not-allowed disabled:opacity-50 sm:right-4 sm:top-4"><X size={18} aria-hidden="true" /></button> : null}
        {children}
      </div>
    </div>
  );
}
