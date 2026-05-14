import { supabase } from "@/features/auth/supabaseClient";

export interface Profile {
  id: string;
  full_name?: string;
  race?: string;
  province?: string;
  grade?: string;
  education_level?: string;
  home_language?: string;
  subjects?: Array<{ name: string; code: string; mark: number; aps_points: number }>;
  aps_score?: number;
  personality_answers?: Record<string, string>;
  personality_type?: string;
  preferred_fields?: string[];
  funding_type?: string;
  household_income?: string;
  sa_citizen?: boolean;
  id_number?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  onboarding_complete?: boolean;
  onboarding_step?: number;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Application {
  id: string;
  user_id: string;
  type: "university" | "tvet" | "nsfas" | "bursary" | "learnership" | "internship" | "apprenticeship" | "graduate_programme";
  institution: string;
  programme?: string;
  status: "todo" | "in_progress" | "submitted" | "accepted" | "rejected" | "waitlisted";
  deadline?: string;
  submission_date?: string;
  reference_number?: string;
  notes?: string;
  documents?: Array<{ name: string; uploaded: boolean; required: boolean }>;
  form_data?: Record<string, unknown>;
  priority?: "high" | "medium" | "low";
  province?: string;
  amount?: string;
  created_at?: string;
  updated_at?: string;
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data as Profile;
}

export async function upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ ...profile, updated_at: new Date().toISOString() }, { onConflict: "id" })
    .select()
    .single();
  if (error) { console.error("upsertProfile error:", error); return null; }
  return data as Profile;
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) { console.error("updateProfile error:", error); return false; }
  return true;
}

// ─── APPLICATIONS ─────────────────────────────────────────────────────────────

export async function getApplications(userId: string): Promise<Application[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) { console.error("getApplications error:", error); return []; }
  return (data ?? []) as Application[];
}

export async function createApplication(
  userId: string,
  application: Omit<Application, "id" | "user_id" | "created_at" | "updated_at">
): Promise<Application | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("applications")
    .insert({ ...application, user_id: userId })
    .select()
    .single();
  if (error) { console.error("createApplication error:", error); return null; }
  return data as Application;
}

export async function updateApplication(
  id: string,
  updates: Partial<Application>
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("applications")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) { console.error("updateApplication error:", error); return false; }
  return true;
}

export async function deleteApplication(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("applications").delete().eq("id", id);
  if (error) { console.error("deleteApplication error:", error); return false; }
  return true;
}

// ─── NSFAS APPLICATION ────────────────────────────────────────────────────────

export async function getNsfasApplication(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("nsfas_applications")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return data;
}

export async function upsertNsfasApplication(userId: string, fields: Record<string, unknown>) {
  if (!supabase) return null;
  const { data: existing } = await supabase
    .from("nsfas_applications")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("nsfas_applications")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) { console.error("upsertNsfas error:", error); return null; }
    return data;
  } else {
    const { data, error } = await supabase
      .from("nsfas_applications")
      .insert({ ...fields, user_id: userId })
      .select()
      .single();
    if (error) { console.error("upsertNsfas error:", error); return null; }
    return data;
  }
}
