"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import { Activity, PlanningReportActivity, PlanningReportItemConfig, PlanningReportSectionConfig } from "@/types/activity";
import { Button, Field, inputClass, selectClass, SubtlePanel } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { uid } from "@/lib/utils/ids";

function reportableActivities(activities: Activity[], reportActivityId: string) {
  return activities
    .filter((item) => item.id !== reportActivityId && item.type !== "planning_report")
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

function normalizeSections(activity: PlanningReportActivity, activities: Activity[], defaultSectionTitle: string) {
  const existingSections = activity.sections.length
    ? activity.sections
    : [{ key: uid("report_section"), title: defaultSectionTitle, visible: true, items: [] }];
  const existingActivityIds = new Set(existingSections.flatMap((section) => section.items ?? []).map((item) => item.activityId));
  const shouldSeedItems = existingActivityIds.size === 0;
  const missingItems: PlanningReportItemConfig[] = shouldSeedItems
    ? reportableActivities(activities, activity.id)
      .map((item) => ({
        id: uid("report_item"),
        activityId: item.id,
        title: item.title,
        visible: true
      }))
    : [];

  return existingSections.map((section, index) => ({
    ...section,
    items: [...(section.items ?? []), ...(index === 0 ? missingItems : [])]
  }));
}

function compactTitle(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("critic") && normalized.includes("contesto operativo")) return "Criticità attuali";
  if (normalized.includes("critic") && normalized.includes("principali")) return "Criticità attuali";
  if (normalized.includes("area principale")) return "Area principale";
  if (normalized.includes("profili coinvolti")) return "Profili coinvolti";
  if (normalized.includes("effetti della critic")) return "Effetti criticità";
  if (normalized.includes("nota aperta")) return "Nota aperta";
  if (normalized.includes("obiettivo principale a breve")) return "Obiettivo breve";
  if (normalized.includes("challenge") && normalized.includes("breve")) return "Challenge breve";
  if (normalized.includes("challenge operative")) return "Challenge breve";
  if (normalized.includes("priorit") && normalized.includes("breve")) return "Priorità breve";
  if (normalized.includes("bisogni e supporti")) return "Bisogni e supporti";
  if (normalized.includes("obiettivo principale a medio")) return "Obiettivo medio-lungo";
  if (normalized.includes("challenge") && normalized.includes("medio")) return "Challenge strategiche";
  if (normalized.includes("challenge strategiche")) return "Challenge strategiche";
  if (normalized.includes("priorit") && normalized.includes("medio")) return "Priorità strategiche";
  if (normalized.includes("bisogni e condizioni")) return "Condizioni abilitanti";
  if (normalized.includes("risorse e contributi")) return "Risorse network";
  const titles: Record<string, string> = {
    "Criticità attuali e contesto operativo": "Criticità attuali",
    "Area principale della criticità più urgente": "Area principale",
    "Effetti della criticità più urgente": "Effetti criticità",
    "Nota aperta sulla criticità": "Nota aperta",
    "Obiettivo principale a breve termine": "Obiettivo breve",
    "Challenge e priorità a breve termine": "Challenge breve",
    "Priorità a breve termine": "Priorità breve",
    "Bisogni e supporti a breve termine": "Bisogni e supporti",
    "Challenge e priorità a medio-lungo termine": "Challenge strategiche",
    "Priorità a medio-lungo termine": "Priorità strategiche",
    "Bisogni e condizioni abilitanti": "Condizioni abilitanti",
    "Risorse e contributi per il network NASIJ": "Risorse network",
    "Elementi da valorizzare": "Elementi da valorizzare",
    "CriticitÃ  attuali e contesto operativo": "Criticità attuali",
    "Area principale della criticitÃ  piÃ¹ urgente": "Area principale",
    "Profili coinvolti o impattati": "Profili coinvolti",
    "Effetti della criticitÃ  piÃ¹ urgente": "Effetti criticità",
    "Nota aperta sulla criticitÃ ": "Nota aperta",
    "Obiettivo principale a medio-lungo termine": "Obiettivo medio-lungo",
    "PrioritÃ  a breve termine": "Priorità breve",
    "PrioritÃ  a medio-lungo termine": "Priorità strategiche"
  };
  return titles[title] ?? title;
}

function activityCountLabel(count: number, singular: string, plural: string) {
  return (count === 1 ? singular : plural).replace("{count}", String(count));
}

function ActionMenu({ children }: { children: React.ReactNode }) {
  return (
    <details className="relative">
      <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-bone/10 text-bone/68 transition hover:border-bone/25 hover:bg-bone/8">
        <MoreHorizontal size={18} />
      </summary>
      <div className="absolute right-0 top-10 z-20 min-w-44 rounded-md border border-bone/12 bg-[#15181f] p-1 shadow-[0_18px_50px_rgba(0,0,0,0.55)]">
        {children}
      </div>
    </details>
  );
}

function MenuButton({
  children,
  disabled,
  danger,
  onClick
}: {
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`block w-full rounded px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${
        danger ? "text-orange hover:bg-orange/10" : "text-bone/76 hover:bg-bone/8"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function PlanningReportEditor({
  activity,
  activities,
  onChange
}: {
  activity: PlanningReportActivity;
  activities: Activity[];
  onChange: (activity: PlanningReportActivity) => void;
}) {
  const { messages } = useLocale();
  const builderMessages = messages.planningReport.builder;
  const sections = normalizeSections(activity, activities, builderMessages.defaultSection);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [editingSectionKey, setEditingSectionKey] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const usedActivityIds = new Set(sections.flatMap((section) => section.items ?? []).map((item) => item.activityId));
  const availableActivities = reportableActivities(activities, activity.id).filter((candidate) => !usedActivityIds.has(candidate.id));

  function updateSections(nextSections: PlanningReportSectionConfig[]) {
    onChange({ ...activity, sections: nextSections });
  }

  function updateSection(sectionKey: PlanningReportSectionConfig["key"], patch: Partial<PlanningReportSectionConfig>) {
    updateSections(sections.map((section) => section.key === sectionKey ? { ...section, ...patch } : section));
  }

  function updateItem(sectionKey: PlanningReportSectionConfig["key"], itemId: string, patch: Partial<PlanningReportItemConfig>) {
    updateSections(sections.map((section) => {
      if (section.key !== sectionKey) return section;
      return {
        ...section,
        items: (section.items ?? []).map((item) => item.id === itemId ? { ...item, ...patch } : item)
      };
    }));
  }

  function moveItem(itemId: string, fromSectionKey: PlanningReportSectionConfig["key"], toSectionKey: PlanningReportSectionConfig["key"]) {
    if (fromSectionKey === toSectionKey) return;
    const item = sections.flatMap((section) => section.items ?? []).find((candidate) => candidate.id === itemId);
    if (!item) return;
    updateSections(sections.map((section) => {
      if (section.key === fromSectionKey) {
        return { ...section, items: (section.items ?? []).filter((candidate) => candidate.id !== itemId) };
      }
      if (section.key === toSectionKey) {
        return { ...section, items: [...(section.items ?? []), item] };
      }
      return section;
    }));
    setMovingItemId(null);
  }

  function moveItemInSection(sectionKey: PlanningReportSectionConfig["key"], itemId: string, direction: -1 | 1) {
    updateSections(sections.map((section) => {
      if (section.key !== sectionKey) return section;
      const items = [...(section.items ?? [])];
      const index = items.findIndex((item) => item.id === itemId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return section;
      [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
      return { ...section, items };
    }));
  }

  function removeItem(sectionKey: PlanningReportSectionConfig["key"], itemId: string) {
    updateSections(sections.map((section) => (
      section.key === sectionKey
        ? { ...section, items: (section.items ?? []).filter((item) => item.id !== itemId) }
        : section
    )));
  }

  function addItemToSection(sectionKey: PlanningReportSectionConfig["key"], activityId: string) {
    const sourceActivity = activities.find((candidate) => candidate.id === activityId);
    if (!sourceActivity) return;
    updateSections(sections.map((section) => (
      section.key === sectionKey
        ? {
            ...section,
            items: [
              ...(section.items ?? []),
              {
                id: uid("report_item"),
                activityId: sourceActivity.id,
                title: sourceActivity.title,
                visible: true
              }
            ]
          }
        : section
    )));
  }

  function moveSection(sectionKey: PlanningReportSectionConfig["key"], direction: -1 | 1) {
    const index = sections.findIndex((section) => section.key === sectionKey);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= sections.length) return;
    const nextSections = [...sections];
    [nextSections[index], nextSections[nextIndex]] = [nextSections[nextIndex], nextSections[index]];
    updateSections(nextSections);
  }

  function removeSection(sectionKey: PlanningReportSectionConfig["key"]) {
    if (sections.length <= 1) return;
    updateSections(sections.filter((section) => section.key !== sectionKey));
  }

  function addSection() {
    updateSections([
      ...sections,
      {
        key: uid("report_section"),
        title: builderMessages.newSection,
        visible: true,
        items: []
      }
    ]);
  }

  function toggleSection(sectionKey: string) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      return next;
    });
  }

  return (
    <SubtlePanel className="space-y-6">
      <section className="space-y-4">
        <h3 className="font-heading text-xl font-semibold text-bone">{builderMessages.settings}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={builderMessages.reportTitle}>
            <input
              className={inputClass}
              value={activity.reportTitle}
              onChange={(event) => onChange({ ...activity, reportTitle: event.target.value })}
            />
          </Field>
          <Field label={builderMessages.subtitle}>
            <input
              className={inputClass}
              value={activity.reportSubtitle}
              onChange={(event) => onChange({ ...activity, reportSubtitle: event.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-heading text-xl font-semibold text-bone">{builderMessages.structure}</h3>
          <Button type="button" variant="secondary" className="min-h-9 px-3" onClick={addSection}>
            <Plus size={15} /> {builderMessages.addSectionShort}
          </Button>
        </div>

        <div className="space-y-2">
          {sections.map((section, sectionIndex) => {
            const isOpen = openSections.has(section.key);
            const items = section.items ?? [];
            return (
              <article key={section.key} className="rounded-md border border-bone/10 bg-night/38">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <button
                    type="button"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-bone/55 transition hover:bg-bone/8 hover:text-bone"
                    onClick={() => toggleSection(section.key)}
                  >
                    {isOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    {editingSectionKey === section.key ? (
                      <input
                        className={`${inputClass} min-h-9 py-2`}
                        autoFocus
                        value={section.title}
                        onBlur={() => setEditingSectionKey(null)}
                        onChange={(event) => updateSection(section.key, { title: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === "Escape") setEditingSectionKey(null);
                        }}
                      />
                    ) : (
                      <p className="truncate font-heading text-lg font-semibold text-bone">{compactTitle(section.title)}</p>
                    )}
                    <p className="mt-0.5 text-xs font-semibold text-bone/38">
                      {activityCountLabel(items.length, builderMessages.activityCountSingular, builderMessages.activityCountPlural)}
                      {!section.visible ? ` · ${builderMessages.hidden}` : ""}
                    </p>
                  </div>
                  <ActionMenu>
                    <MenuButton onClick={() => setEditingSectionKey(section.key)}>{builderMessages.rename}</MenuButton>
                    <MenuButton disabled={sectionIndex === 0} onClick={() => moveSection(section.key, -1)}>{builderMessages.moveUp}</MenuButton>
                    <MenuButton disabled={sectionIndex === sections.length - 1} onClick={() => moveSection(section.key, 1)}>{builderMessages.moveDown}</MenuButton>
                    <MenuButton onClick={() => updateSection(section.key, { visible: !section.visible })}>
                      {section.visible ? builderMessages.hide : builderMessages.show}
                    </MenuButton>
                    <MenuButton danger disabled={sections.length <= 1} onClick={() => removeSection(section.key)}>{builderMessages.deleteSection}</MenuButton>
                  </ActionMenu>
                </div>

                {isOpen ? (
                  <div className="space-y-2 border-t border-bone/10 px-3 py-3">
                    {items.map((item, itemIndex) => (
                      <div key={item.id} className="rounded-md border border-bone/8 bg-night/42 px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            {editingItemId === item.id ? (
                              <input
                                className={`${inputClass} min-h-9 py-2`}
                                autoFocus
                                value={item.title}
                                onBlur={() => setEditingItemId(null)}
                                onChange={(event) => updateItem(section.key, item.id, { title: event.target.value })}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === "Escape") setEditingItemId(null);
                                }}
                              />
                            ) : (
                              <p className="truncate text-sm font-semibold text-bone/84">{compactTitle(item.title)}</p>
                            )}
                            {!item.visible ? <p className="mt-0.5 text-xs font-semibold text-bone/35">{builderMessages.hidden}</p> : null}
                          </div>
                          <ActionMenu>
                            <MenuButton onClick={() => setEditingItemId(item.id)}>{builderMessages.rename}</MenuButton>
                            <MenuButton disabled={itemIndex === 0} onClick={() => moveItemInSection(section.key, item.id, -1)}>{builderMessages.moveUp}</MenuButton>
                            <MenuButton disabled={itemIndex === items.length - 1} onClick={() => moveItemInSection(section.key, item.id, 1)}>{builderMessages.moveDown}</MenuButton>
                            <MenuButton onClick={() => setMovingItemId(movingItemId === item.id ? null : item.id)}>{builderMessages.moveToSection}</MenuButton>
                            <MenuButton onClick={() => updateItem(section.key, item.id, { visible: !item.visible })}>
                              {item.visible ? builderMessages.hide : builderMessages.show}
                            </MenuButton>
                            <MenuButton danger onClick={() => removeItem(section.key, item.id)}>{builderMessages.remove}</MenuButton>
                          </ActionMenu>
                        </div>
                        {movingItemId === item.id ? (
                          <select
                            className={`${selectClass} mt-2 min-h-9 py-2`}
                            value={section.key}
                            onChange={(event) => moveItem(item.id, section.key, event.target.value)}
                          >
                            {sections.map((candidate) => (
                              <option key={candidate.key} value={candidate.key}>{compactTitle(candidate.title)}</option>
                            ))}
                          </select>
                        ) : null}
                      </div>
                    ))}

                    {availableActivities.length ? (
                      <select
                        className={`${selectClass} min-h-10 py-2`}
                        value=""
                        onChange={(event) => {
                          addItemToSection(section.key, event.target.value);
                          event.currentTarget.value = "";
                        }}
                      >
                        <option value="" disabled>{builderMessages.addActivity}</option>
                        {availableActivities.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>{compactTitle(candidate.title)}</option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </SubtlePanel>
  );
}
