-- Fix profiles table RLS: Restrict email visibility to own profile or managers/admins
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Managers and admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix reports table RLS: Restrict to creator, managers and admins only
DROP POLICY IF EXISTS "Anyone can view reports" ON public.reports;

CREATE POLICY "Users can view own reports" 
ON public.reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Managers and admins can view all reports" 
ON public.reports 
FOR SELECT 
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix admin_feature_settings table RLS: Restrict to admins only
DROP POLICY IF EXISTS "Everyone can read feature settings" ON public.admin_feature_settings;

CREATE POLICY "Admins and managers can read feature settings" 
ON public.admin_feature_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));