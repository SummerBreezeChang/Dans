DROP POLICY IF EXISTS "Synthetic tasks are viewable" ON public.care_tasks;
DROP POLICY IF EXISTS "Activity is viewable" ON public.care_activity;
DROP POLICY IF EXISTS "Settings are viewable" ON public.care_settings;
REVOKE ALL ON public.care_tasks, public.care_activity, public.care_settings FROM anon, authenticated;
GRANT ALL ON public.care_tasks, public.care_activity, public.care_settings TO service_role;