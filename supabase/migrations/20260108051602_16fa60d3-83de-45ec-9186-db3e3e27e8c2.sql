-- Table for admin feature toggles
CREATE TABLE public.admin_feature_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.admin_feature_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Everyone can read feature settings"
ON public.admin_feature_settings
FOR SELECT
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update feature settings"
ON public.admin_feature_settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert feature settings"
ON public.admin_feature_settings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.admin_feature_settings (feature_key, enabled) VALUES 
  ('agent_performance_charts', true);

-- Enable realtime for team_notes table
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_notes;