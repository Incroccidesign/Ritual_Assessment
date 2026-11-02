import { Activity } from "@/types/activity";
import { Locale } from "@/types/locale";
import { defaultLocale, locales } from "@/lib/i18n/config";

const markerWords: Record<Locale, ReadonlySet<string>> = {
  en: new Set(["the", "and", "what", "which", "how", "your", "you", "this", "that", "are", "is", "for", "to", "of", "in", "with", "about", "tell", "please", "would", "should", "can", "choose", "select", "when", "where", "why", "available", "together"]),
  fr: new Set(["le", "les", "et", "des", "du", "un", "une", "quel", "quelle", "quels", "quelles", "comment", "vous", "votre", "dans", "pour", "avec", "sur", "est", "sont", "ce", "cette", "ces", "au", "aux", "nous", "notre", "choisissez", "repondez", "disponible"]),
  it: new Set(["il", "lo", "gli", "del", "della", "delle", "che", "come", "cosa", "qual", "quale", "quali", "tu", "tuo", "tua", "voi", "questa", "questo", "questi", "queste", "per", "con", "nel", "nella", "sono", "hai", "avete", "pensi", "descrivi", "scegli", "scegliete", "rispondi", "disponibile", "puoi", "vuoi"]),
  bg: new Set(["и", "на", "за", "да", "се", "ли", "какво", "как", "кой", "коя", "кои", "вашата", "вашият", "този", "това", "с", "от", "в", "е", "са", "може", "споделете", "изберете", "участници", "наличност"]),
  pl: new Set(["jak", "co", "ktory", "ktora", "ktore", "twoje", "wasze", "ten", "ta", "to", "jest", "sa", "mozesz", "opisz", "wybierz", "czy", "prosze", "odpowiedz", "dostepny", "spotkanie", "termin", "pasuje"]),
  tr: new Set(["ve", "bir", "bu", "su", "icin", "ile", "nasil", "ne", "hangi", "sen", "siz", "sizin", "olarak", "degil", "olan", "gibi", "paylas", "sec", "yaz", "nedir", "uygun", "tarihler", "toplanti", "birlikte"]),
  de: new Set(["der", "die", "das", "und", "von", "zu", "ein", "eine", "was", "wie", "welche", "welcher", "dein", "deine", "ihr", "ist", "sind", "mit", "fur", "uber", "beschreibe", "nicht", "konnen", "bitte", "oder", "heissen", "termin", "termine", "passen", "verfugbar"]),
  "pt-PT": new Set(["os", "as", "que", "como", "qual", "quais", "seu", "sua", "vosso", "esta", "este", "para", "com", "sao", "descreve", "disponivel", "escolha", "responda", "consegue", "partilhe", "pode", "todos", "data", "encontro"])
};

const strongMarkerWords: Record<Locale, ReadonlySet<string>> = {
  en: new Set(["what", "which", "how", "your", "please", "available", "choose", "select"]),
  fr: new Set(["votre", "vous", "comment", "quelle", "quelles", "choisissez", "selectionnez", "repondez"]),
  it: new Set(["cosa", "quale", "quali", "pensi", "descrivi", "scegli", "seleziona", "rispondi", "vuoi", "puoi", "disponibile"]),
  bg: new Set(["какво", "как", "кой", "коя", "кои", "изберете", "споделете"]),
  pl: new Set(["jak", "ktory", "ktora", "ktore", "wybierz", "zaznacz", "prosze", "odpowiedz", "dostepny"]),
  tr: new Set(["nasıl", "hangi", "icin", "nedir", "uygun", "paylas", "sec", "secin", "tarih"]),
  de: new Set(["welche", "welcher", "nicht", "bitte", "konnen", "heissen", "verfugbar"]),
  "pt-PT": new Set(["seu", "sua", "vosso", "nao", "disponivel", "escolha", "escolhe", "selecione", "partilhe", "responda"])
};

function participantQuestionText(activity: Activity): string[] {
  const text = [activity.prompt];

  if (activity.type === "profiling") {
    for (const field of activity.fields) text.push(field.label, ...(field.options ?? []));
  } else if (activity.type === "exploration") {
    text.push(activity.itemTypeCustomLabel ?? "", ...activity.options, ...(activity.optionGroups ?? []).map((group) => group.label));
  } else if (activity.type === "framing") {
    for (const question of activity.questions) text.push(question.title, question.prompt, question.placeholder ?? "");
  } else if (activity.type === "planning_report") {
    text.push(activity.reportTitle, activity.reportSubtitle);
    for (const section of activity.sections) {
      text.push(section.title, ...(section.items ?? []).map((item) => item.title));
    }
  }

  return text.filter((value) => value.trim().length > 0);
}

/**
 * Detects a ritual language from participant-facing prompts and answer labels.
 * Ambiguous or very short content returns undefined so callers can use English.
 */
export function detectAssessmentLocale(activities: Activity[]): Locale | undefined {
  const source = activities.flatMap(participantQuestionText).join(" ").slice(0, 24_000).normalize("NFC");
  if (!source.trim()) return undefined;

  // Normalize accents for word matching while retaining the original text for
  // language-specific spelling signals such as Polish and Turkish characters.
  const normalized = source.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]+/g, "");
  const words = Array.from(new Set(normalized.match(/[A-Za-z\u00C0-\u024F\u0400-\u04FF]+/g) ?? []));
  const cyrillicLetters = source.match(/[\u0400-\u04FF]/g)?.length ?? 0;
  const latinLetters = source.match(/[A-Za-z\u00C0-\u024F]/g)?.length ?? 0;
  const hasBulgarianScript = cyrillicLetters >= 6 && cyrillicLetters >= latinLetters * 0.6;
  if (words.length < 2 && !hasBulgarianScript) return undefined;

  const scores = new Map<Locale, number>(locales.map((locale) => [
    locale,
    words.reduce((score, word) => score + (strongMarkerWords[locale].has(word) ? 2 : markerWords[locale].has(word) ? 1 : 0), 0)
  ]));

  const signal = (locale: Locale, pattern: RegExp, weight: number, minimum = 1) => {
    const count = source.match(pattern)?.length ?? 0;
    if (count >= minimum) scores.set(locale, (scores.get(locale) ?? 0) + weight);
  };

  // Bulgarian is the only supported locale using Cyrillic script.
  if (hasBulgarianScript) scores.set("bg", (scores.get("bg") ?? 0) + 6);
  signal("pl", /[ąćęłńśźż]/gi, 1, 2);
  signal("tr", /[ıİşğ]/g, 1.5, 1);
  signal("de", /ß/gi, 2.5, 1);
  signal("pt-PT", /[ãõ]/gi, 1.5, 1);
  signal("fr", /œ/gi, 2.5, 1);

  const ranked = locales
    .map((locale) => [locale, scores.get(locale) ?? 0] as [Locale, number])
    .sort((left, right) => right[1] - left[1]);
  const [winner, runnerUp] = ranked;
  if (!winner || winner[1] < 2 || winner[1] - (runnerUp?.[1] ?? 0) < 1.5) return undefined;
  return winner[0];
}

export function participantLocaleForAssessment(activities: Activity[]): Locale {
  return detectAssessmentLocale(activities) ?? defaultLocale;
}

export function participantPathForAssessment(publicToken: string, activities: Activity[]): string {
  const query = new URLSearchParams({ locale: participantLocaleForAssessment(activities) });
  return `/participate/${encodeURIComponent(publicToken)}?${query.toString()}`;
}
