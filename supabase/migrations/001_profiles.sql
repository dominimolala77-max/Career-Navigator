-- CareerPath SA — Database Schema
-- Migration: 001_profiles.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT,
  race                  TEXT,           -- 'Black African' | 'Colored' | 'Indian/Asian' | 'White' | 'Other'
  province              TEXT,           -- for SA users
  grade                 TEXT,           -- e.g. 'Grade 12', 'Grade 11', 'Matric passed'
  education_level       TEXT,           -- 'high_school' | 'matric_passed' | 'undergraduate' | 'working_adult'
  home_language         TEXT,
  subjects              JSONB,          -- [{ name, mark, aps_points }]
  aps_score             INTEGER,
  personality_answers   JSONB,          -- { q1: 'a', q2: 'b', ... }
  personality_type      TEXT,           -- 'analytical' | 'creative' | 'social' | 'technical' | 'business' | 'outdoors'
  preferred_fields      TEXT[],         -- e.g. ['Engineering', 'Technology']
  funding_type          TEXT,           -- 'nsfas' | 'bursary' | 'self' | 'unknown'
  household_income      TEXT,           -- income bracket for NSFAS check
  sa_citizen            BOOLEAN,        -- for NSFAS eligibility
  id_number             TEXT,           -- SA ID number (encrypted at rest)
  phone                 TEXT,
  address               TEXT,
  city                  TEXT,
  postal_code           TEXT,
  onboarding_complete   BOOLEAN DEFAULT false,
  onboarding_step       INTEGER DEFAULT 0,
  avatar_url            TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── APPLICATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type            TEXT NOT NULL,        -- 'university' | 'nsfas' | 'bursary' | 'learnership' | 'internship'
  institution     TEXT NOT NULL,
  programme       TEXT,
  status          TEXT DEFAULT 'todo', -- 'todo' | 'in_progress' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted'
  deadline        DATE,
  submission_date DATE,
  reference_number TEXT,
  notes           TEXT,
  documents       JSONB DEFAULT '[]'::JSONB,  -- [{ name, uploaded: bool, required: bool }]
  form_data       JSONB DEFAULT '{}'::JSONB,  -- all in-app form fields
  priority        TEXT DEFAULT 'medium',      -- 'high' | 'medium' | 'low'
  province        TEXT,
  amount          TEXT,                       -- for bursaries/stipends
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NSFAS APPLICATIONS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nsfas_applications (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status                  TEXT DEFAULT 'draft',  -- 'draft' | 'ready' | 'submitted' | 'approved' | 'rejected' | 'appealing'
  -- Personal details
  id_number               TEXT,
  full_name               TEXT,
  date_of_birth           DATE,
  gender                  TEXT,
  race                    TEXT,
  disability              BOOLEAN DEFAULT false,
  disability_description  TEXT,
  phone                   TEXT,
  email                   TEXT,
  address                 TEXT,
  city                    TEXT,
  province                TEXT,
  postal_code             TEXT,
  -- Academic
  current_institution     TEXT,
  intended_institution    TEXT,
  intended_qualification  TEXT,
  year_of_study           INTEGER,
  -- Financial
  household_income        NUMERIC,
  father_employed         BOOLEAN,
  mother_employed         BOOLEAN,
  guardian_name           TEXT,
  guardian_id             TEXT,
  guardian_income         NUMERIC,
  grant_sassa             BOOLEAN DEFAULT false,
  sassa_amount            NUMERIC,
  -- Documents checklist
  docs_id                 BOOLEAN DEFAULT false,
  docs_matric             BOOLEAN DEFAULT false,
  docs_income_parents     BOOLEAN DEFAULT false,
  docs_sassa              BOOLEAN DEFAULT false,
  docs_bank_statement     BOOLEAN DEFAULT false,
  docs_acceptance_letter  BOOLEAN DEFAULT false,
  -- Tracking
  nsfas_reference         TEXT,
  submitted_at            TIMESTAMPTZ,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ROW-LEVEL SECURITY ───────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsfas_applications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Applications policies
CREATE POLICY "Users can manage own applications"
  ON public.applications FOR ALL
  USING (auth.uid() = user_id);

-- NSFAS applications policies
CREATE POLICY "Users can manage own nsfas applications"
  ON public.nsfas_applications FOR ALL
  USING (auth.uid() = user_id);

-- ─── TRIGGERS ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_nsfas_updated_at
  BEFORE UPDATE ON public.nsfas_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
