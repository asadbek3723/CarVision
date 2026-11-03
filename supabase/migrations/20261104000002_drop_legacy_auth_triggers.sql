-- CarVision: remove legacy triggers on auth.users that point at the old schema
-- Migration: 20261104000002_drop_legacy_auth_triggers.sql   (idempotent)
--
-- An earlier incarnation of this project had a trigger on auth.users (calling a function in
-- the public schema) that validated phones / inserted into legacy tables. It now makes every
-- sign-up fail with "Database error creating new user". The app creates the profile and shop
-- itself on the server, so such triggers are not needed. Supabase's own triggers (auth schema)
-- are NOT touched.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT t.tgname, p.proname
          FROM pg_trigger t
          JOIN pg_proc p ON p.oid = t.tgfoid
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE t.tgrelid = 'auth.users'::regclass
           AND NOT t.tgisinternal
           AND n.nspname = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.tgname);
        RAISE NOTICE 'Dropped legacy trigger % (function public.%)', r.tgname, r.proname;
    END LOOP;
END $$;
