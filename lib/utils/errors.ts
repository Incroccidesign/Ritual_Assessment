export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null) {
    const maybeMessage = "message" in error ? error.message : null;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;
  }
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}
