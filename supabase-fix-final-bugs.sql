-- =========================================================================
-- SUPABASE FIX: ALLOW ANON INSERT ADMISSIONS + READ SCHOOLS + RECOVER LOST ADMISSIONS
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/dhugnuamyqczvptmvlnq/sql
-- =========================================================================

-- 1. Ensure online_admissions allows anon insert without being blocked
DROP POLICY IF EXISTS "Allow anon insert admissions" ON public.online_admissions;
DROP POLICY IF EXISTS "Allow public to submit admission" ON public.online_admissions;
DROP POLICY IF EXISTS "public_online_admissions_insert" ON public.online_admissions;

CREATE POLICY "Allow anon insert admissions" 
ON public.online_admissions FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- 2. Ensure schools table allows anon read so public apply form can load branding
DROP POLICY IF EXISTS "Allow anon read schools" ON public.schools;
DROP POLICY IF EXISTS "Allow public read schools" ON public.schools;

CREATE POLICY "Allow anon read schools" 
ON public.schools FOR SELECT 
TO anon, authenticated 
USING (true);

-- 3. Ensure admissions table allows anon insert as backup
DROP POLICY IF EXISTS "Allow anon insert admissions backup" ON public.admissions;
DROP POLICY IF EXISTS "Allow public to submit to admissions" ON public.admissions;
DROP POLICY IF EXISTS "public_admissions_insert" ON public.admissions;

CREATE POLICY "Allow anon insert admissions backup" 
ON public.admissions FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- 4. RECOVER PREVIOUSLY LOST ADMISSIONS (whose school_id was null or empty)
UPDATE public.online_admissions 
SET school_id = '87137fe7-22f2-48dc-820d-f21d21b73686' 
WHERE school_id IS NULL OR school_id = '';

UPDATE public.admissions 
SET school_id = '87137fe7-22f2-48dc-820d-f21d21b73686' 
WHERE school_id IS NULL OR school_id = '';

-- 5. VERIFY COUNT FOR OXFORD ACADEMY
SELECT COUNT(*) AS total_admissions FROM public.online_admissions WHERE school_id = '87137fe7-22f2-48dc-820d-f21d21b73686';
