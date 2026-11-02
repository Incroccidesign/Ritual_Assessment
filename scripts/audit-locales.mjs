import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const source = JSON.parse(readFileSync(resolve(root, "messages/en.json"), "utf8"));
const locales = ["fr", "it", "bg", "pl", "tr", "de", "pt-PT"];
const strict = process.argv.includes("--strict");
const leaves = (value, path = [], output = new Map()) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => leaves(item, [...path, String(index)], output));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) leaves(item, [...path, key], output);
  } else if (typeof value === "string") {
    output.set(path.join("."), value);
  }
  return output;
};
const sourceLeaves = leaves(source);
const placeholders = (value) => [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort().join("|");
// These labels are intentionally shared across languages (brand, standard UI
// vocabulary, or internationally understood notation), not missed translations.
const unchangedAllowed = new Set([
  "app.name",
  "nav.dashboard",
  "common.optional",
  "dashboard.filterStatuses",
  "dashboard.sortTitleAsc",
  "dashboard.sortTitleDesc",
  "dashboard.status",
  "dashboard.individual",
  "home.individualEyebrow",
  "auth.acceptanceGateVersion",
  "presets.assessment.dateFindingParticipantName",
  "activities.profiling.label",
  "activityTypes.text"
]);
const unchangedAllowedByLocale = {
  fr: new Set([
    "common.actions", "dashboard.filterTypes", "dashboard.exploration", "auth.email",
    "home.heroWords.0", "home.heroWords.1", "home.heroWords.4", "home.heroWords.5",
    "builder.descriptionLabel", "builder.estimatedDurationMin", "builder.estimatedDurationMax",
    "activities.exploration.label", "activities.exploration.optionSingular", "activities.exploration.optionPlural",
    "activities.framing.questionPrompt", "activityTypes.email", "reports.participants", "exports.participants", "exports.type"
  ]),
  it: new Set([
    "nav.dashboard", "auth.email", "auth.password", "builder.estimatedDurationMin",
    "builder.estimatedDurationMax", "activityTypes.email"
  ])
};
let failed = false;

for (const locale of locales) {
  const translation = JSON.parse(readFileSync(resolve(root, `messages/${locale}.json`), "utf8"));
  const translatedLeaves = leaves(translation);
  const missing = [...sourceLeaves.keys()].filter((path) => !translatedLeaves.has(path));
  const unknown = [...translatedLeaves.keys()].filter((path) => !sourceLeaves.has(path));
  const placeholderMismatches = [...translatedLeaves].filter(([path, value]) => {
    const original = sourceLeaves.get(path);
    return original !== undefined && placeholders(original) !== placeholders(value);
  }).map(([path]) => path);
  const localeAllowlist = unchangedAllowedByLocale[locale] ?? new Set();
  const unchanged = [...sourceLeaves].filter(([path, value]) => value.trim() && translatedLeaves.get(path) === value && !unchangedAllowed.has(path) && !localeAllowlist.has(path)).map(([path]) => path);
  const total = sourceLeaves.size;
  const coverage = Math.round(((total - missing.length) / total) * 100);
  const heroWords = translation.home?.heroWords;
  const heroWordCountOk = !heroWords || (Array.isArray(heroWords) && heroWords.length === 7);
  console.log(`${locale}: ${coverage}% (${total - missing.length}/${total} strings); ${missing.length} missing; ${unknown.length} unknown; ${placeholderMismatches.length} placeholder mismatches; ${unchanged.length} untranslated exact matches; hero words ${heroWords?.length ?? "inherited"}`);
  if (unknown.length || placeholderMismatches.length || !heroWordCountOk || unchanged.length || (strict && missing.length)) failed = true;
  if (unchanged.length) console.log(`  untranslated exact matches: ${unchanged.join(", ")}`);
}

if (failed) process.exitCode = 1;
