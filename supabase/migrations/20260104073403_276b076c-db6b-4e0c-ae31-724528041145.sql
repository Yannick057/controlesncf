-- Table pour l'historique des modifications de rôles
CREATE TABLE public.role_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all role history
CREATE POLICY "Admins can view all role history"
ON public.role_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Managers can view role history for non-admins
CREATE POLICY "Managers can view role history for non-admins"
ON public.role_history
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND old_role != 'admin' 
  AND new_role != 'admin'
);

-- Admins can insert role history
CREATE POLICY "Admins can insert role history"
ON public.role_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Managers can insert role history for non-admin changes
CREATE POLICY "Managers can insert role history"
ON public.role_history
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role)
  AND new_role != 'admin'
);

-- Table pour les préférences de navigation utilisateur
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  default_page text NOT NULL DEFAULT '/',
  page_order jsonb NOT NULL DEFAULT '["dashboard", "onboard", "station", "history", "settings"]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();