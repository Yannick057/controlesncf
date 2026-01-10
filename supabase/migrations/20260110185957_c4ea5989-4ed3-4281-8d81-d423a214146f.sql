-- Create table for email settings
CREATE TABLE public.email_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Only admins can view email settings" 
ON public.email_settings 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update email settings" 
ON public.email_settings 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert email settings" 
ON public.email_settings 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default email sender domain
INSERT INTO public.email_settings (setting_key, setting_value)
VALUES ('sender_domain', 'onboarding@resend.dev');