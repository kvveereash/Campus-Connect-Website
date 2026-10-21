-- Enable Row Level Security on every table in the public schema.
--
-- Supabase publishes the public schema through its REST API (PostgREST) to the
-- `anon` and `authenticated` roles. Those roles already have no privileges on
-- any table here, so the API returns nothing today. RLS is a second, separate
-- lock on the same door: with RLS on and no policies, those roles see no rows
-- even if a grant is ever added by mistake (for example by a future migration
-- or a dashboard click).
--
-- The app is unaffected. Prisma connects as the `postgres` role, which owns
-- these tables and has BYPASSRLS, so its queries behave exactly as before.
-- No policies are created on purpose: nothing should read these tables
-- through Supabase's API.
--
-- Written as a loop so it covers every current table, including Prisma's join
-- tables (_FollowedColleges, _InterestToUser, _SkillToUser) and
-- _prisma_migrations. Tables added later need their own
-- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.

DO $$
DECLARE
    t record;
BEGIN
    FOR t IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
    END LOOP;
END
$$;
