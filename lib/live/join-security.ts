import { createHmac } from "crypto";

export const LIVE_JOIN_RATE_LIMIT_WINDOW_SECONDS = 600;

export function liveJoinClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = request.headers.get("x-vercel-forwarded-for")?.trim() || forwarded || request.headers.get("x-real-ip")?.trim();
  return address?.slice(0, 200) || "unknown";
}

export function liveJoinRateLimitKey(sessionId: string, clientIp: string, secret: string) {
  return createHmac("sha256", secret).update(`${sessionId}:${clientIp}`).digest("hex");
}

export function isConfiguredLiveRole(roleName: string, configuredRoles: readonly string[]) {
  return configuredRoles.length === 0 || configuredRoles.includes(roleName);
}
