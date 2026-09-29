export function getPublicBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";

  if (browserOrigin && isLocalhostUrl(browserOrigin)) {
    return browserOrigin.replace(/\/$/, "");
  }

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  return browserOrigin.replace(/\/$/, "");
}

export function getJoinUrl(sessionId: string, joinToken?: string | null) {
  const tokenParam = joinToken ? `&join=${encodeURIComponent(joinToken)}` : "";
  return `${getPublicBaseUrl()}/live/join?id=${encodeURIComponent(sessionId)}${tokenParam}`;
}

export function isLocalhostUrl(value: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(value);
}
