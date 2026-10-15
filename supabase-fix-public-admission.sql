-- =========================================================================
-- SUPABASE MIGRATION: FIX PUBLIC ADMISSION & ANON POLICIES
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/dhugnuamyqczvptmvlnq/sql
-- =========================================================================

-- 1. Ensure RLS is enabled on schools, online_admissions, admissions
ALTER TABLE IF EXISTS public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.online_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admissions ENABLE ROW LEVEL SECURITY;

-- 2. Allow anon & authenticated users to read schools table for validation & public branding
DROP POLICY IF EXISTS "Allow public read schools" ON public.schools;
DROP POLICY IF EXISTS "tenant_isolation_schools" ON public.schools;
CREATE POLICY "Allow public read schools" 
ON public.schools FOR SELECT 
TO anon, authenticated 
USING (true);

-- 3. Allow anon & authenticated parents to submit (INSERT) into online_admissions
DROP POLICY IF EXISTS "Allow public to submit admission" ON public.online_admissions;
DROP POLICY IF EXISTS "public_online_admissions_insert" ON public.online_admissions;
CREATE POLICY "Allow public to submit admission" 
ON public.online_admissions FOR INSERT 
TO anon, authenticated 
WITH CHECK (school_id IS NOT NULL AND school_id::text != '');

-- 4. Allow anon & authenticated parents to submit (INSERT) into admissions table
DROP POLICY IF EXISTS "Allow public to submit to admissions" ON public.admissions;
DROP POLICY IF EXISTS "public_admissions_insert" ON public.admissions;
CREATE POLICY "Allow public to submit to admissions" 
ON public.admissions FOR INSERT 
TO anon, authenticated 
WITH CHECK (school_id IS NOT NULL AND school_id::text != '');

-- 5. Ensure school staff can only SELECT their own school's records (Tenant Isolation)
DROP POLICY IF EXISTS "tenant_isolation_select_online_admissions" ON public.online_admissions;
CREATE POLICY "tenant_isolation_select_online_admissions" 
ON public.online_admissions FOR SELECT 
TO authenticated 
USING (
    school_id::text = (
        SELECT id::text FROM public.schools 
        WHERE owner_id::text = auth.uid()::text 
           OR user_id::text = auth.uid()::text 
           OR LOWER(owner_email) = LOWER(auth.jwt()->>'email') 
           OR LOWER(email) = LOWER(auth.jwt()->>'email')
        LIMIT 1
    )
);

DROP POLICY IF EXISTS "tenant_isolation_select_admissions" ON public.admissions;
CREATE POLICY "tenant_isolation_select_admissions" 
ON public.admissions FOR SELECT 
TO authenticated 
USING (
    school_id::text = (
        SELECT id::text FROM public.schools 
        WHERE owner_id::text = auth.uid()::text 
           OR user_id::text = auth.uid()::text 
           OR LOWER(owner_email) = LOWER(auth.jwt()->>'email') 
           OR LOWER(email) = LOWER(auth.jwt()->>'email')
        LIMIT 1
    )
);
