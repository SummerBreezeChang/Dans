CREATE TABLE public.care_caregivers (id text PRIMARY KEY, name text NOT NULL, phone text, cap int NOT NULL DEFAULT 5, availability text[] NOT NULL DEFAULT '{}', helps text[]);
GRANT ALL ON public.care_caregivers TO service_role;
ALTER TABLE public.care_caregivers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.care_tasks (id text PRIMARY KEY, title text NOT NULL, day int NOT NULL, slot text NOT NULL, time text NOT NULL, owner text, status text NOT NULL DEFAULT 'unclaimed', category text NOT NULL DEFAULT 'At-Home Care', published boolean NOT NULL DEFAULT true, declined_by text[] NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.care_tasks TO anon, authenticated;
GRANT ALL ON public.care_tasks TO service_role;
ALTER TABLE public.care_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Synthetic tasks are viewable" ON public.care_tasks FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.care_activity (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, detail text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.care_activity TO anon, authenticated;
GRANT ALL ON public.care_activity TO service_role;
ALTER TABLE public.care_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activity is viewable" ON public.care_activity FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.care_settings (id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), live_sms boolean NOT NULL DEFAULT true);
GRANT SELECT ON public.care_settings TO anon, authenticated;
GRANT ALL ON public.care_settings TO service_role;
ALTER TABLE public.care_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings are viewable" ON public.care_settings FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.care_sms_log (key text PRIMARY KEY, recipient text NOT NULL, ok boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.care_sms_log TO service_role;
ALTER TABLE public.care_sms_log ENABLE ROW LEVEL SECURITY;

INSERT INTO public.care_settings (id, live_sms) VALUES (1, false);
INSERT INTO public.care_caregivers (id, name, phone, availability) VALUES
('summer','Summer Chang',NULL,ARRAY['0-Morning','0-Evening','1-Morning','1-Evening','2-Morning','2-Evening','3-Morning','3-Evening','4-Evening','5-Morning','5-Afternoon','6-Morning']),
('henry','Henry',NULL,ARRAY['0-Afternoon','1-Afternoon','2-Morning','2-Afternoon','3-Afternoon','4-Afternoon','4-Evening','5-Evening','6-Afternoon']),
('nancy','Nancy',NULL,ARRAY['0-Evening','1-Morning','2-Evening','3-Morning','3-Afternoon','3-Evening','4-Morning','4-Afternoon','5-Morning','6-Evening']),
('jack','Jack',NULL,ARRAY['1-Evening','3-Evening','5-Morning','5-Afternoon','6-Morning','6-Afternoon']),
('mary','Mary',NULL,ARRAY['0-Morning','2-Morning','4-Morning','4-Afternoon','4-Evening']),
('karen','Karen',NULL,ARRAY['1-Afternoon','3-Afternoon','5-Evening','6-Evening']);
INSERT INTO public.care_tasks (id,title,day,slot,time,owner,status) VALUES
('task-1','Ride to chemotherapy',3,'Morning','9:00 AM','summer','accepted'),
('task-2','Prepare a post-chemo meal',3,'Evening','6:00 PM','henry','assigned'),
('task-3','Pick up prescriptions',3,'Afternoon','12:30 PM',NULL,'unclaimed'),
('task-4','Ride to blood draw',2,'Morning','7:45 AM','henry','accepted'),
('task-5','Confirm oncology follow-up',0,'Morning','10:00 AM','summer','done'),
('task-6','Check in with Maya',4,'Evening','7:00 PM','nancy','assigned'),
('task-7','Prepare meals for the weekend',5,'Morning','11:00 AM',NULL,'unclaimed'),
('task-8','Collect questions for the oncologist',2,'Evening','6:00 PM','summer','assigned'),
('task-9','Update emergency contact list',1,'Morning','10:00 AM','nancy','done'),
('task-10','Set up a comfortable recovery space',3,'Morning','8:00 AM',NULL,'unclaimed');
UPDATE public.care_tasks SET category = 'Rides to & from Appointments' WHERE id IN ('task-1','task-4');
UPDATE public.care_tasks SET category = 'Meal Planning' WHERE id IN ('task-2','task-7');
UPDATE public.care_tasks SET category = 'Medicine Pickup' WHERE id = 'task-3';
UPDATE public.care_tasks SET category = 'Appointment Management' WHERE id = 'task-5';
UPDATE public.care_tasks SET category = 'Follow-ups' WHERE id = 'task-8';
UPDATE public.care_tasks SET category = 'Emergency Contacts' WHERE id = 'task-9';
UPDATE public.care_caregivers SET helps = ARRAY['Rides','Pickups'] WHERE id = 'jack';
UPDATE public.care_caregivers SET helps = ARRAY['Meals','At home','Calls and paperwork'] WHERE id = 'mary';
UPDATE public.care_caregivers SET helps = ARRAY['Meals','At home'] WHERE id = 'karen';