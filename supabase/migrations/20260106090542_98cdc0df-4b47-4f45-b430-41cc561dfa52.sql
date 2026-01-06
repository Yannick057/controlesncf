-- Table pour les contrôles à bord
CREATE TABLE public.onboard_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  train_number TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  control_date DATE NOT NULL,
  control_time TIME NOT NULL,
  passengers INTEGER NOT NULL DEFAULT 0,
  tarifs_bord JSONB NOT NULL DEFAULT '[]',
  tarifs_controle JSONB NOT NULL DEFAULT '[]',
  stt50_count INTEGER NOT NULL DEFAULT 0,
  pv_list JSONB NOT NULL DEFAULT '[]',
  stt100_count INTEGER NOT NULL DEFAULT 0,
  ri_positif INTEGER NOT NULL DEFAULT 0,
  ri_negatif INTEGER NOT NULL DEFAULT 0,
  commentaire TEXT DEFAULT '',
  fraud_count INTEGER NOT NULL DEFAULT 0,
  fraud_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les contrôles en gare
CREATE TABLE public.station_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  station_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  control_date DATE NOT NULL,
  control_time TIME NOT NULL,
  passengers INTEGER NOT NULL DEFAULT 0,
  tarifs_bord JSONB NOT NULL DEFAULT '[]',
  tarifs_controle JSONB NOT NULL DEFAULT '[]',
  stt50_count INTEGER NOT NULL DEFAULT 0,
  pv_list JSONB NOT NULL DEFAULT '[]',
  stt100_count INTEGER NOT NULL DEFAULT 0,
  ri_positif INTEGER NOT NULL DEFAULT 0,
  ri_negatif INTEGER NOT NULL DEFAULT 0,
  commentaire TEXT DEFAULT '',
  fraud_count INTEGER NOT NULL DEFAULT 0,
  fraud_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les notes entre managers et agents
CREATE TABLE public.team_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les signalements de bugs
CREATE TABLE public.bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les notes de version
CREATE TABLE public.release_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  release_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboard_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_notes ENABLE ROW LEVEL SECURITY;

-- RLS pour onboard_controls
CREATE POLICY "Users can view own onboard controls"
ON public.onboard_controls FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all onboard controls"
ON public.onboard_controls FOR SELECT
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own onboard controls"
ON public.onboard_controls FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboard controls"
ON public.onboard_controls FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own onboard controls"
ON public.onboard_controls FOR DELETE
USING (auth.uid() = user_id);

-- RLS pour station_controls
CREATE POLICY "Users can view own station controls"
ON public.station_controls FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all station controls"
ON public.station_controls FOR SELECT
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own station controls"
ON public.station_controls FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own station controls"
ON public.station_controls FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own station controls"
ON public.station_controls FOR DELETE
USING (auth.uid() = user_id);

-- RLS pour team_notes
CREATE POLICY "Users can view notes they sent or received"
ON public.team_notes FOR SELECT
USING (auth.uid() = author_id OR auth.uid() = recipient_id);

CREATE POLICY "Managers/Admins can view all notes"
ON public.team_notes FOR SELECT
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert notes"
ON public.team_notes FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own notes"
ON public.team_notes FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Recipients can mark notes as read"
ON public.team_notes FOR UPDATE
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can delete their own notes"
ON public.team_notes FOR DELETE
USING (auth.uid() = author_id);

-- RLS pour bug_reports
CREATE POLICY "Users can view own bug reports"
ON public.bug_reports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bug reports"
ON public.bug_reports FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert bug reports"
ON public.bug_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bug reports"
ON public.bug_reports FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any bug report"
ON public.bug_reports FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- RLS pour release_notes (public read)
CREATE POLICY "Anyone can view release notes"
ON public.release_notes FOR SELECT
USING (true);

CREATE POLICY "Admins can insert release notes"
ON public.release_notes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update release notes"
ON public.release_notes FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete release notes"
ON public.release_notes FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Triggers pour updated_at
CREATE TRIGGER update_onboard_controls_updated_at
BEFORE UPDATE ON public.onboard_controls
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_station_controls_updated_at
BEFORE UPDATE ON public.station_controls
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_notes_updated_at
BEFORE UPDATE ON public.team_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bug_reports_updated_at
BEFORE UPDATE ON public.bug_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial release note
INSERT INTO public.release_notes (version, title, content, release_date)
VALUES ('1.0.0', 'Version initiale', 'Première version de l''application SNCF Contrôles avec gestion des contrôles à bord et en gare, tableau de bord avec statistiques, et gestion des utilisateurs.', CURRENT_DATE);