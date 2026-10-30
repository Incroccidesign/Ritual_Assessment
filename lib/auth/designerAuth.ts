"use client";

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { isProfileAvatarId, type ProfileAvatarId } from "@/lib/auth/profileAvatars";

export type Designer = {
  id: string;
  email: string;
  avatarId: ProfileAvatarId;
};

export function designerFromUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Designer {
  const avatarId = user.user_metadata?.profile_avatar_id;
  return {
    id: user.id,
    email: user.email ?? "designer",
    avatarId: isProfileAvatarId(avatarId) ? avatarId : "01"
  };
}

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
  return user ? designerFromUser(user) : null;
}

export async function signInDesigner(email: string, password: string, captchaToken?: string) {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase Auth is not configured.");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: captchaToken ? { captchaToken } : undefined
  });
  if (error) throw error;
  if (!data.user) throw new Error("No user returned by Supabase Auth.");
  const designer = designerFromUser(data.user);
  await syncDesignerProfile(designer);
  window.dispatchEvent(new Event("ritual-designer-auth"));
  return designer;
}

export async function signUpDesigner(email: string, password: string, fullName: string, avatarId: ProfileAvatarId, captchaToken?: string) {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase Auth is not configured.");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
      data: { full_name: fullName, profile_avatar_id: avatarId },
      ...(captchaToken ? { captchaToken } : {})
    }
  });
  if (error) throw error;
  if (!data.user) throw new Error("No user returned by Supabase Auth.");
  const designer = designerFromUser(data.user);
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

export async function resendDesignerEmailConfirmation(email: string, captchaToken?: string) {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase Auth is not configured.");
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
      ...(captchaToken ? { captchaToken } : {})
    }
  });
  if (error) throw error;
}

export async function requestDesignerPasswordReset(email: string, captchaToken?: string) {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase Auth is not configured.");
  const redirectTo = `${window.location.origin}/login?reset=1`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
    ...(captchaToken ? { captchaToken } : {})
  });
  if (error) throw error;
}

export async function updateDesignerPassword(password: string) {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase Auth is not configured.");
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error || !data.user) throw error ?? new Error("Unable to update password.");
  window.dispatchEvent(new Event("ritual-designer-auth"));
}

export async function signOutDesigner() {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }
  window.dispatchEvent(new Event("ritual-designer-auth"));
}

export { isSupabaseConfigured };
