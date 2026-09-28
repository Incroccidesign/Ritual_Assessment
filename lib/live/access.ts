"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { LiveParticipantAccess } from "@/types/live";

const prefix = "ritual-live-participant:";
const joinPrefix = "ritual-live-join:";

export function generateLiveToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...Array.from(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function storeLiveParticipantAccess(sessionId: string, access: LiveParticipantAccess) { sessionStorage.setItem(`${prefix}${sessionId}`, JSON.stringify(access)); }
export function getLiveParticipantAccess(sessionId: string): LiveParticipantAccess | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(`${prefix}${sessionId}`);
  try { return raw ? JSON.parse(raw) as LiveParticipantAccess : null; } catch { return null; }
}
export function storeLiveJoinToken(sessionId: string, token: string) { localStorage.setItem(`${joinPrefix}${sessionId}`, token); }
export function getLiveJoinToken(sessionId: string) { return typeof window === "undefined" ? null : localStorage.getItem(`${joinPrefix}${sessionId}`); }

export function liveClient(access?: LiveParticipantAccess | null): SupabaseClient {
  if (!access) { if (!supabase) throw new Error("Supabase is not configured."); return supabase; }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  return createClient(url, key, { global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("x-live-participant-id", access.participantId);
    headers.set("x-live-participant-token", access.participantToken);
    if (access.joinToken) headers.set("x-live-join-token", access.joinToken);
    return fetch(input, { ...init, headers });
  } } });
}
