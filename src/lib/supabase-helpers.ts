import { supabase } from "@/features/auth/supabaseClient";

export interface Profile {
  id: string;
  email?: string;
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
  certified_documents?: Array<{ type: string; name: string; uploaded: boolean; uploaded_at?: string }>;
  selected_plan?: "priority_unlimited" | "standard" | "basic";
  plan_payment_status?: "unpaid" | "paid";
  plan_paid_at?: string;
  profile_submission_status?: "draft" | "submitted" | "processing" | "completed";
  profile_submitted_at?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  onboarding_complete?: boolean;
  onboarding_step?: number;
  avatar_url?: string;
  // Location-based access
  latitude?: number;
  longitude?: number;
  province_detected?: string;
  access_tier?: "free" | "paid";
  location_requested_at?: string;
  selected_universities?: Array<{ name: string; code?: string }>;
  selected_tvet_colleges?: Array<{ name: string; code?: string }>;
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
  application_fee?: number;
  fee_payment_status?: "paid" | "unpaid" | "not_required";
  fee_paid_at?: string;
  status_updates?: Array<{ message: string; at: string; by?: string }>;
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

// ─── INSTITUTION APPLICATIONS (Universities & TVET Colleges) ──────────────────

export interface InstitutionApplication {
  id: string;
  user_id: string;
  institution_type: "university" | "tvet";
  institution_name: string;
  programme?: string;
  application_fee: number;
  fee_payment_status: "paid" | "unpaid" | "not_required";
  fee_paid_at?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getInstitutionApplications(
  userId: string,
  type?: "university" | "tvet"
): Promise<InstitutionApplication[]> {
  if (!supabase) return [];
  let query = supabase
    .from("institution_applications")
    .select("*")
    .eq("user_id", userId);
  
  if (type) {
    query = query.eq("institution_type", type);
  }
  
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) { console.error("getInstitutionApplications error:", error); return []; }
  return (data ?? []) as InstitutionApplication[];
}

export async function createInstitutionApplication(
  userId: string,
  application: Omit<InstitutionApplication, "id" | "user_id" | "created_at" | "updated_at">
): Promise<InstitutionApplication | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("institution_applications")
    .insert({ ...application, user_id: userId })
    .select()
    .single();
  if (error) { console.error("createInstitutionApplication error:", error); return null; }
  return data as InstitutionApplication;
}

export async function updateInstitutionApplication(
  id: string,
  updates: Partial<InstitutionApplication>
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("institution_applications")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) { console.error("updateInstitutionApplication error:", error); return false; }
  return true;
}

export async function deleteInstitutionApplication(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("institution_applications").delete().eq("id", id);
  if (error) { console.error("deleteInstitutionApplication error:", error); return false; }
  return true;
}

export async function markFeeAsPaid(applicationId: string): Promise<boolean> {
  return updateInstitutionApplication(applicationId, {
    fee_payment_status: "paid",
    fee_paid_at: new Date().toISOString(),
  });
}

