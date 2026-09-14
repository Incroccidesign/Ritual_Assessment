export function uid(prefix = "id") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  const fallback = Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join("");
  return `${prefix}_${fallback}`;
}
