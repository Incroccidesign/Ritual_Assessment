import { Activity } from "@/types/activity";
import { Locale } from "@/types/locale";

const markerWords: Record<Locale, ReadonlySet<string>> = {
  en: new Set(["the", "and", "what", "which", "how", "your", "you", "this", "that", "are", "is", "for", "to", "of", "in", "with", "about", "tell", "thinking", "please", "would", "should", "can"]),
  fr: new Set(["le", "la", "les", "et", "de", "des", "du", "un", "une", "que", "quel", "quelle", "quels", "quelles", "comment", "vous", "votre", "dans", "pour", "avec", "sur", "est", "sont", "ce", "cette", "ces", "au", "aux"]),
  it: new Set(["il", "lo", "la", "gli", "le", "e", "di", "del", "della", "delle", "che", "come", "cosa", "quale", "quali", "tu", "voi", "questa", "questo", "questi", "queste", "per", "con", "nel", "nella", "sono", "hai", "avete", "pensi", "descrivi"])
};

function activityQuestions(activity: Activity) {
  const prompts = [activity.prompt];
  if (activity.type === "profiling") prompts.push(...activity.fields.map((field) => field.label));
  if (activity.type === "framing") prompts.push(...activity.questions.map((question) => question.prompt));
  return prompts;
}

/**
 * Detects a questionnaire's language from its participant-facing questions.
 * It deliberately returns undefined when there is not enough evidence.
 */
export function detectAssessmentLocale(activities: Activity[]): Locale | undefined {
  const words = activities
    .flatMap(activityQuestions)
    .join(" ")
    .toLocaleLowerCase()
    .match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g) ?? [];

  if (words.length < 4) return undefined;

  const scores = (Object.keys(markerWords) as Locale[]).map((locale) => ({
    locale,
    score: words.reduce((total, word) => total + (markerWords[locale].has(word) ? 1 : 0), 0)
  })).sort((left, right) => right.score - left.score);

  const [winner, runnerUp] = scores;
  return winner.score >= 2 && winner.score > runnerUp.score ? winner.locale : undefined;
}
