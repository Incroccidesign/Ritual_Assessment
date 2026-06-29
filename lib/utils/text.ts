export function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function safeFilename(value: string, fallback = "assessment") {
  return (
    cleanText(value)
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-|-$/g, "") || fallback
  );
}
