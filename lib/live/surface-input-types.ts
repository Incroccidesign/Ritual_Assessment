import { Language } from "@/lib/live/i18n";
import { SurfaceColorKey, SurfaceInputType } from "@/types/live";

export const surfaceColorPalette: Array<{
  key: SurfaceColorKey;
  textClass: string;
  borderClass: string;
  bgClass: string;
  dotClass: string;
}> = [
  { key: "orange", textClass: "text-orange", borderClass: "border-orange/30", bgClass: "bg-orange/10", dotClass: "bg-orange" },
  { key: "mint", textClass: "text-mint", borderClass: "border-mint/30", bgClass: "bg-mint/10", dotClass: "bg-mint" },
  { key: "violet", textClass: "text-violet", borderClass: "border-violet/30", bgClass: "bg-violet/10", dotClass: "bg-violet" },
  { key: "blue", textClass: "text-sky-300", borderClass: "border-sky-400/30", bgClass: "bg-sky-400/10", dotClass: "bg-sky-400" },
  { key: "yellow", textClass: "text-yellow-300", borderClass: "border-yellow-300/30", bgClass: "bg-yellow-300/10", dotClass: "bg-yellow-300" },
  { key: "rose", textClass: "text-rose-300", borderClass: "border-rose-300/30", bgClass: "bg-rose-300/10", dotClass: "bg-rose-300" },
  { key: "gray", textClass: "text-bone/72", borderClass: "border-bone/18", bgClass: "bg-bone/6", dotClass: "bg-bone/55" }
];

export function defaultSurfaceInputTypes(): SurfaceInputType[] {
  return [
    { id: "issues", label: { it: "Criticità", en: "Issues" }, color: "orange" },
    { id: "barriers", label: { it: "Barriere", en: "Barriers" }, color: "blue" },
    { id: "opportunities", label: { it: "Opportunità", en: "Opportunities" }, color: "mint" },
    { id: "signals", label: { it: "Segnali", en: "Signals" }, color: "blue" }
  ];
}

export function cloneSurfaceInputTypes(input?: SurfaceInputType[] | null) {
  return (input ?? []).map((item) => ({
    id: item.id,
    label: { it: item.label.it, en: item.label.en },
    color: item.color
  }));
}

export function normalizeSurfaceInputTypes(input?: SurfaceInputType[] | null) {
  if (!input?.length) return defaultSurfaceInputTypes();
  const normalized = input
    .filter((item): item is SurfaceInputType => Boolean(item?.id))
    .map((item) => ({
      id: item.id,
      label: {
        it: item.label?.it?.trim() || item.label?.en?.trim() || item.id,
        en: item.label?.en?.trim() || item.label?.it?.trim() || item.id
      },
      color: surfaceColorPalette.some((color) => color.key === item.color) ? item.color : "gray"
    }));
  return normalized.length ? normalized : defaultSurfaceInputTypes();
}

export function surfaceLabel(item: SurfaceInputType, language: Language) {
  return item.label[language] || item.label.it || item.label.en || item.id;
}

export function surfaceColorClasses(color: SurfaceColorKey) {
  return surfaceColorPalette.find((item) => item.key === color) ?? surfaceColorPalette[surfaceColorPalette.length - 1];
}

export function surfaceColorName(color: SurfaceColorKey, language: Language) {
  const names = {
    orange: { it: "Arancione", en: "Orange" },
    mint: { it: "Menta", en: "Mint" },
    violet: { it: "Viola", en: "Violet" },
    blue: { it: "Blu", en: "Blue" },
    yellow: { it: "Giallo", en: "Yellow" },
    rose: { it: "Rosa", en: "Rose" },
    gray: { it: "Grigio", en: "Gray" }
  } satisfies Record<SurfaceColorKey, { it: string; en: string }>;
  return names[color][language];
}

export function mapLegacySurfaceCategory(category: string | null | undefined) {
  if (!category) return null;
  const normalized = category.trim().toLowerCase();
  if (["criticality", "criticity", "criticita", "criticità", "criticism", "issue", "issues"].includes(normalized)) return "issues";
  if (["opportunity", "opportunities", "opportunita", "opportunità"].includes(normalized)) return "opportunities";
  return null;
}

export function resolveSurfaceCategoryId(category: string | null | undefined, categories: SurfaceInputType[]) {
  if (!category) return categories[0]?.id ?? null;
  if (categories.some((item) => item.id === category)) return category;
  const legacy = mapLegacySurfaceCategory(category);
  if (legacy && categories.some((item) => item.id === legacy)) return legacy;
  return categories[0]?.id ?? null;
}
