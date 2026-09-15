export function uid(prefix = "id") {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.randomUUID) throw new Error("Secure random number generation is unavailable.");
  return `${prefix}_${cryptoApi.randomUUID().replace(/-/g, "")}`;
}
