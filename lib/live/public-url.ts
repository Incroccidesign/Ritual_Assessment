export function getPublicBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const localJoinUrl = process.env.NEXT_PUBLIC_LIVE_JOIN_URL?.trim();
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";

  if (browserOrigin && isLocalDevelopmentUrl(browserOrigin)) {
    if (localJoinUrl) return localJoinUrl.replace(/\/$/, "");
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

export function isLocalDevelopmentUrl(value: string) {
  return isLocalhostUrl(value) || /^https?:\/\/(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?/i.test(value);
}
