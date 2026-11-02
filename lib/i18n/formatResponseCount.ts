import type { Locale } from "@/types/locale";

export function formatResponseCount(
  count: number,
  locale: Locale,
  labels: { one: string; few: string; many: string; other: string }
) {
  const category = new Intl.PluralRules(locale).select(count) as keyof typeof labels;
  return labels[category].replace("{count}", new Intl.NumberFormat(locale).format(count));
}
