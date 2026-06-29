"use client";

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type Designer = {
  id: string;
  email: string;
};

async function syncDesignerProfile(designer: Designer) {
  if (!supabase) return;
  const { error } = await supabase.from("profiles").upsert(
    {
      id: designer.id,
      email: designer.email
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

export async function getCurrentDesigner(): Promise<Designer | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  return user ? { id: user.id, email: user.email ?? "designer" } : null;
}

export async function signInDesigner(email: string, password: string) {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase Auth is not configured.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("No user returned by Supabase Auth.");
  const designer = { id: data.user.id, email: data.user.email ?? email };
  await syncDesignerProfile(designer);
  window.dispatchEvent(new Event("ritual-designer-auth"));
  return designer;
}

export async function signUpDesigner(email: string, password: string) {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase Auth is not configured.");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("No user returned by Supabase Auth.");
  const designer = { id: data.user.id, email: data.user.email ?? email };
  if (data.session) {
    await syncDesignerProfile(designer);
    window.dispatchEvent(new Event("ritual-designer-auth"));
    return {
      designer,
      requiresEmailConfirmation: false
    };
  }
  return {
    designer,
    requiresEmailConfirmation: true
  };
}

export async function signOutDesigner() {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }
  window.dispatchEvent(new Event("ritual-designer-auth"));
}

export { isSupabaseConfigured };
