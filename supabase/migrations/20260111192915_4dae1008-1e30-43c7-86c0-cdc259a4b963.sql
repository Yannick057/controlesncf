-- Table for custom themes
CREATE TABLE public.custom_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  colors JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_themes ENABLE ROW LEVEL SECURITY;

-- Policies for custom_themes
CREATE POLICY "Users can view own themes" ON public.custom_themes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public themes" ON public.custom_themes FOR SELECT USING (is_public = true);
CREATE POLICY "Users can create own themes" ON public.custom_themes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own themes" ON public.custom_themes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own themes" ON public.custom_themes FOR DELETE USING (auth.uid() = user_id);

-- Table for data visibility settings
CREATE TABLE public.data_visibility_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  can_view_all_data BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_visibility_settings ENABLE ROW LEVEL SECURITY;

-- Policies for data_visibility_settings
CREATE POLICY "Users can view own visibility settings" ON public.data_visibility_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all visibility settings" ON public.data_visibility_settings FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert visibility settings" ON public.data_visibility_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update visibility settings" ON public.data_visibility_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete visibility settings" ON public.data_visibility_settings FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Add global data visibility setting to admin_feature_settings
INSERT INTO public.admin_feature_settings (feature_key, enabled)
VALUES ('global_data_visibility', false)
ON CONFLICT (feature_key) DO NOTHING;