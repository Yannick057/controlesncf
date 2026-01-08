# Guide Complet de Configuration Supabase - Contrôles SNCF

Ce guide vous permet de recréer le projet Supabase à l'identique.

## Table des matières
1. [Prérequis](#prérequis)
2. [Création du projet Supabase](#création-du-projet-supabase)
3. [Configuration de l'authentification](#configuration-de-lauthentification)
4. [Schéma SQL complet](#schéma-sql-complet)
5. [Déploiement des Edge Functions](#déploiement-des-edge-functions)
6. [Configuration des secrets](#configuration-des-secrets)
7. [Configuration du projet Lovable](#configuration-du-projet-lovable)

---

## Prérequis

- Un compte Supabase (https://supabase.com)
- Supabase CLI installé (`npm install -g supabase`)
- Un nouveau projet Lovable

---

## Création du projet Supabase

1. Allez sur https://supabase.com/dashboard
2. Cliquez sur **New Project**
3. Choisissez une organisation
4. Nommez votre projet (ex: `controlesncf`)
5. Définissez un mot de passe pour la base de données
6. Sélectionnez une région (de préférence EU West pour la France)
7. Cliquez sur **Create new project**

---

## Configuration de l'authentification

### Désactiver la confirmation email

1. Allez dans **Authentication** (menu gauche)
2. Cliquez sur **Providers**
3. Sélectionnez **Email**
4. **Désactivez** l'option "Confirm email"
5. Sauvegardez

### Configurer les URLs de redirection

1. Allez dans **Authentication** → **URL Configuration**
2. **Site URL** : `https://votre-projet.lovable.app`
3. **Redirect URLs** : Ajoutez
   - `https://votre-projet.lovable.app`
   - `https://votre-projet.lovable.app/**`
   - `http://localhost:5173` (pour le développement local)

---

## Schéma SQL complet

Exécutez ce SQL dans **SQL Editor** de Supabase (ou via migrations).

### 1. Types et énumérations

```sql
-- Création du type enum pour les rôles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'agent');
```

### 2. Tables

```sql
-- ============================================
-- TABLE: profiles
-- ============================================
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: user_roles
-- ============================================
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    role public.app_role NOT NULL DEFAULT 'agent'::public.app_role,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: notification_settings
-- ============================================
CREATE TABLE public.notification_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    fraud_threshold NUMERIC NOT NULL DEFAULT 5.0,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: user_preferences
-- ============================================
CREATE TABLE public.user_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    default_page TEXT NOT NULL DEFAULT '/'::text,
    page_order JSONB NOT NULL DEFAULT '["dashboard", "onboard", "station", "history", "settings"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: onboard_controls
-- ============================================
CREATE TABLE public.onboard_controls (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    control_date DATE NOT NULL,
    control_time TIME WITHOUT TIME ZONE NOT NULL,
    train_number TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    passengers INTEGER NOT NULL DEFAULT 0,
    tarifs_controle JSONB NOT NULL DEFAULT '[]'::jsonb,
    tarifs_bord JSONB NOT NULL DEFAULT '[]'::jsonb,
    stt50_count INTEGER NOT NULL DEFAULT 0,
    stt100_count INTEGER NOT NULL DEFAULT 0,
    pv_list JSONB NOT NULL DEFAULT '[]'::jsonb,
    ri_positif INTEGER NOT NULL DEFAULT 0,
    ri_negatif INTEGER NOT NULL DEFAULT 0,
    fraud_count INTEGER NOT NULL DEFAULT 0,
    fraud_rate NUMERIC NOT NULL DEFAULT 0,
    commentaire TEXT DEFAULT ''::text,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: station_controls
-- ============================================
CREATE TABLE public.station_controls (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    control_date DATE NOT NULL,
    control_time TIME WITHOUT TIME ZONE NOT NULL,
    station_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    passengers INTEGER NOT NULL DEFAULT 0,
    tarifs_controle JSONB NOT NULL DEFAULT '[]'::jsonb,
    tarifs_bord JSONB NOT NULL DEFAULT '[]'::jsonb,
    stt50_count INTEGER NOT NULL DEFAULT 0,
    stt100_count INTEGER NOT NULL DEFAULT 0,
    pv_list JSONB NOT NULL DEFAULT '[]'::jsonb,
    ri_positif INTEGER NOT NULL DEFAULT 0,
    ri_negatif INTEGER NOT NULL DEFAULT 0,
    fraud_count INTEGER NOT NULL DEFAULT 0,
    fraud_rate NUMERIC NOT NULL DEFAULT 0,
    commentaire TEXT DEFAULT ''::text,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: bug_reports
-- ============================================
CREATE TABLE public.bug_reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open'::text,
    priority TEXT NOT NULL DEFAULT 'medium'::text,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: release_notes
-- ============================================
CREATE TABLE public.release_notes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    version TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    release_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: reports
-- ============================================
CREATE TABLE public.reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    nom_gare TEXT NOT NULL,
    voie TEXT,
    description TEXT,
    statut TEXT NOT NULL DEFAULT 'actif'::text,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: team_notes
-- ============================================
CREATE TABLE public.team_notes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: role_history
-- ============================================
CREATE TABLE public.role_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    old_role public.app_role,
    new_role public.app_role NOT NULL,
    changed_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: admin_feature_settings
-- ============================================
CREATE TABLE public.admin_feature_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    feature_key TEXT NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 3. Fonctions

```sql
-- ============================================
-- FONCTION: has_role
-- Vérifie si un utilisateur a un rôle spécifique
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- ============================================
-- FONCTION: get_user_role
-- Récupère le rôle d'un utilisateur
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- ============================================
-- FONCTION: update_updated_at_column
-- Met à jour automatiquement le champ updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ============================================
-- FONCTION: handle_new_user
-- Crée automatiquement le profil et les paramètres pour un nouvel utilisateur
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Créer le profil
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
    
    -- Attribuer le rôle agent par défaut
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'agent');
    
    -- Créer les paramètres de notification
    INSERT INTO public.notification_settings (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$;
```

### 4. Triggers

```sql
-- ============================================
-- TRIGGER: on_auth_user_created
-- Déclenché lors de la création d'un utilisateur
-- ============================================
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TRIGGERS: update_updated_at
-- Pour chaque table avec un champ updated_at
-- ============================================
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON public.notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboard_controls_updated_at
    BEFORE UPDATE ON public.onboard_controls
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_station_controls_updated_at
    BEFORE UPDATE ON public.station_controls
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bug_reports_updated_at
    BEFORE UPDATE ON public.bug_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_notes_updated_at
    BEFORE UPDATE ON public.team_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_feature_settings_updated_at
    BEFORE UPDATE ON public.admin_feature_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
```

### 5. Row Level Security (RLS)

```sql
-- ============================================
-- ACTIVER RLS SUR TOUTES LES TABLES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboard_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_feature_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES: profiles
-- ============================================
CREATE POLICY "Users can view all profiles"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- ============================================
-- POLICIES: user_roles
-- ============================================
CREATE POLICY "Users can view their own role"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert roles"
    ON public.user_roles FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update roles"
    ON public.user_roles FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete roles"
    ON public.user_roles FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================
-- POLICIES: notification_settings
-- ============================================
CREATE POLICY "Users can view own notification settings"
    ON public.notification_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
    ON public.notification_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
    ON public.notification_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: user_preferences
-- ============================================
CREATE POLICY "Users can view own preferences"
    ON public.user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON public.user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON public.user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: onboard_controls
-- ============================================
CREATE POLICY "Users can view own onboard controls"
    ON public.onboard_controls FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all onboard controls"
    ON public.onboard_controls FOR SELECT
    USING (public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can insert own onboard controls"
    ON public.onboard_controls FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboard controls"
    ON public.onboard_controls FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own onboard controls"
    ON public.onboard_controls FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: station_controls
-- ============================================
CREATE POLICY "Users can view own station controls"
    ON public.station_controls FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all station controls"
    ON public.station_controls FOR SELECT
    USING (public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can insert own station controls"
    ON public.station_controls FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own station controls"
    ON public.station_controls FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own station controls"
    ON public.station_controls FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: bug_reports
-- ============================================
CREATE POLICY "Users can view own bug reports"
    ON public.bug_reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bug reports"
    ON public.bug_reports FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can insert bug reports"
    ON public.bug_reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bug reports"
    ON public.bug_reports FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any bug report"
    ON public.bug_reports FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================
-- POLICIES: release_notes
-- ============================================
CREATE POLICY "Anyone can view release notes"
    ON public.release_notes FOR SELECT
    USING (true);

CREATE POLICY "Admins can insert release notes"
    ON public.release_notes FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update release notes"
    ON public.release_notes FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete release notes"
    ON public.release_notes FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================
-- POLICIES: reports
-- ============================================
CREATE POLICY "Anyone can view reports"
    ON public.reports FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create reports"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports"
    ON public.reports FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
    ON public.reports FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: team_notes
-- ============================================
CREATE POLICY "Users can view notes they sent or received"
    ON public.team_notes FOR SELECT
    USING ((auth.uid() = author_id) OR (auth.uid() = recipient_id));

CREATE POLICY "Managers/Admins can view all notes"
    ON public.team_notes FOR SELECT
    USING (public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));

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

-- ============================================
-- POLICIES: role_history
-- ============================================
CREATE POLICY "Admins can view all role history"
    ON public.role_history FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Managers can view role history for non-admins"
    ON public.role_history FOR SELECT
    USING (public.has_role(auth.uid(), 'manager'::public.app_role) AND old_role <> 'admin'::public.app_role AND new_role <> 'admin'::public.app_role);

CREATE POLICY "Admins can insert role history"
    ON public.role_history FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Managers can insert role history"
    ON public.role_history FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role) AND new_role <> 'admin'::public.app_role);

-- ============================================
-- POLICIES: admin_feature_settings
-- ============================================
CREATE POLICY "Everyone can read feature settings"
    ON public.admin_feature_settings FOR SELECT
    USING (true);

CREATE POLICY "Admins can insert feature settings"
    ON public.admin_feature_settings FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update feature settings"
    ON public.admin_feature_settings FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
```

---

## Déploiement des Edge Functions

### Prérequis

1. Installez Supabase CLI :
```bash
npm install -g supabase
```

2. Connectez-vous à votre projet :
```bash
supabase login
supabase link --project-ref VOTRE_PROJECT_REF
```

### Edge Function: create-admin

Créez le fichier `supabase/functions/create-admin/index.ts` :

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, password, name, adminSecret } = await req.json()

    // Verify admin secret
    const expectedSecret = Deno.env.get('ADMIN_CREATION_SECRET')
    if (!expectedSecret || adminSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Invalid admin secret' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate required fields
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name || email }
    })

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update role to admin
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', userData.user.id)

    if (roleError) {
      return new Response(
        JSON.stringify({ error: 'User created but role update failed: ' + roleError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true, userId: userData.user.id }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
```

### Edge Function: update-user-password

Créez le fichier `supabase/functions/update-user-password/index.ts` :

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  userLimit.count++
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing environment variables')
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client for user verification
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify the caller
    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting
    if (!checkRateLimit(caller.id)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Check caller's role
    const { data: callerRoleData, error: callerRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single()

    if (callerRoleError || !callerRoleData) {
      return new Response(
        JSON.stringify({ error: 'Could not verify caller role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const callerRole = callerRoleData.role
    if (callerRole !== 'admin' && callerRole !== 'manager') {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const { targetUserId, newPassword } = await req.json()

    if (!targetUserId || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password
    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check target user's role
    const { data: targetRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .single()

    const targetRole = targetRoleData?.role

    // Managers cannot change admin passwords
    if (callerRole === 'manager' && targetRole === 'admin') {
      return new Response(
        JSON.stringify({ error: 'Managers cannot modify admin passwords' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent self-modification through this endpoint
    if (caller.id === targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Cannot change your own password through this endpoint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    )

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### Configuration des Edge Functions

Créez le fichier `supabase/config.toml` :

```toml
project_id = "VOTRE_PROJECT_ID"

[functions.create-admin]
verify_jwt = false

[functions.update-user-password]
verify_jwt = false
```

### Déployer les Edge Functions

```bash
supabase functions deploy create-admin
supabase functions deploy update-user-password
```

---

## Configuration des secrets

### Dans Supabase Dashboard

1. Allez dans **Project Settings** → **Edge Functions**
2. Cliquez sur **Manage secrets**
3. Ajoutez le secret suivant :
   - **Name**: `ADMIN_CREATION_SECRET`
   - **Value**: Un mot de passe sécurisé de votre choix (ex: `MonSecretAdmin2024!`)

**Note**: Les secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, et `SUPABASE_SERVICE_ROLE_KEY` sont automatiquement disponibles pour les Edge Functions.

---

## Configuration du projet Lovable

### 1. Désactiver Lovable Cloud (nouveau projet)

1. Créez un nouveau projet sur https://lovable.dev
2. Allez dans **Settings** → **Connectors**
3. Trouvez **Lovable Cloud**
4. Cliquez sur **Disable Cloud**

### 2. Connecter votre Supabase externe

1. Dans **Settings** → **Connectors**
2. Cliquez sur **Supabase**
3. Entrez vos informations :
   - **Project URL**: `https://VOTRE_PROJECT_REF.supabase.co`
   - **Anon Key**: Trouvable dans **Project Settings** → **API** → **anon public**

### 3. Configurer les variables d'environnement

Dans le fichier `.env` du projet Lovable :

```env
VITE_SUPABASE_URL=https://VOTRE_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_anon_key
VITE_SUPABASE_PROJECT_ID=VOTRE_PROJECT_REF
```

### 4. Importer le code depuis GitHub

1. Dans Lovable, allez dans **Settings** → **GitHub**
2. Connectez le repository : `https://github.com/Yannick057/controlesncf`
3. Synchronisez le code

---

## Créer le premier administrateur

Une fois tout configuré, utilisez cette commande curl pour créer le premier admin :

```bash
curl -X POST 'https://VOTRE_PROJECT_REF.supabase.co/functions/v1/create-admin' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@example.com",
    "password": "VotreMotDePasse123!",
    "name": "Admin Principal",
    "adminSecret": "VOTRE_ADMIN_CREATION_SECRET"
  }'
```

---

## Vérification

### Checklist finale

- [ ] Tables créées avec RLS activé
- [ ] Fonctions et triggers en place
- [ ] Edge Functions déployées
- [ ] Secret `ADMIN_CREATION_SECRET` configuré
- [ ] Confirmation email désactivée
- [ ] URLs de redirection configurées
- [ ] Premier admin créé
- [ ] Projet Lovable connecté

---

## Support

En cas de problème :
1. Vérifiez les logs dans **Supabase Dashboard** → **Logs**
2. Vérifiez les erreurs de déploiement des Edge Functions
3. Assurez-vous que toutes les variables d'environnement sont correctement configurées
