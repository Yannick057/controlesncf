# Guide de Configuration Supabase - SNCF Contrôles

## Vue d'ensemble

Cette application de gestion des contrôles SNCF utilise Lovable Cloud (Supabase) pour le backend, incluant l'authentification, la base de données et les fonctions edge.

---

## 1. Schéma de Base de Données

### Types personnalisés

```sql
-- Rôles utilisateur
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'agent');
```

### Tables

#### `profiles` - Profils utilisateurs
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `user_roles` - Rôles des utilisateurs
```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'agent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
```

#### `role_history` - Historique des changements de rôles
```sql
CREATE TABLE public.role_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `onboard_controls` - Contrôles à bord des trains
```sql
CREATE TABLE public.onboard_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  control_date DATE NOT NULL,
  control_time TIME NOT NULL,
  train_number TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  passengers INTEGER NOT NULL DEFAULT 0,
  fraud_count INTEGER NOT NULL DEFAULT 0,
  fraud_rate NUMERIC NOT NULL DEFAULT 0,
  tarifs_bord JSONB NOT NULL DEFAULT '[]',
  tarifs_controle JSONB NOT NULL DEFAULT '[]',
  stt50_count INTEGER NOT NULL DEFAULT 0,
  stt100_count INTEGER NOT NULL DEFAULT 0,
  pv_list JSONB NOT NULL DEFAULT '[]',
  ri_positif INTEGER NOT NULL DEFAULT 0,
  ri_negatif INTEGER NOT NULL DEFAULT 0,
  commentaire TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `station_controls` - Contrôles en gare
```sql
CREATE TABLE public.station_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  control_date DATE NOT NULL,
  control_time TIME NOT NULL,
  station_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  passengers INTEGER NOT NULL DEFAULT 0,
  fraud_count INTEGER NOT NULL DEFAULT 0,
  fraud_rate NUMERIC NOT NULL DEFAULT 0,
  tarifs_bord JSONB NOT NULL DEFAULT '[]',
  tarifs_controle JSONB NOT NULL DEFAULT '[]',
  stt50_count INTEGER NOT NULL DEFAULT 0,
  stt100_count INTEGER NOT NULL DEFAULT 0,
  pv_list JSONB NOT NULL DEFAULT '[]',
  ri_positif INTEGER NOT NULL DEFAULT 0,
  ri_negatif INTEGER NOT NULL DEFAULT 0,
  commentaire TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `notification_settings` - Paramètres de notification
```sql
CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  fraud_threshold NUMERIC NOT NULL DEFAULT 5.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `bug_reports` - Rapports de bugs
```sql
CREATE TABLE public.bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `release_notes` - Notes de version
```sql
CREATE TABLE public.release_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  release_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `audit_logs` - Journal d'audit
```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `admin_feature_settings` - Configuration des fonctionnalités
```sql
CREATE TABLE public.admin_feature_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `team_notes` - Notes d'équipe
```sql
CREATE TABLE public.team_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `user_preferences` - Préférences utilisateur
```sql
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  default_page TEXT NOT NULL DEFAULT '/',
  page_order JSONB NOT NULL DEFAULT '["dashboard", "onboard", "station", "history", "settings"]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `reports` - Signalements
```sql
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  nom_gare TEXT NOT NULL,
  voie TEXT,
  description TEXT,
  statut TEXT NOT NULL DEFAULT 'actif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `email_settings` - Paramètres email
```sql
CREATE TABLE public.email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 2. Fonctions de Base de Données

### `has_role` - Vérification des rôles
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
```

### `get_user_role` - Obtenir le rôle d'un utilisateur
```sql
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;
```

### `handle_new_user` - Création automatique de profil
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'agent');
  
  INSERT INTO public.notification_settings (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$;
```

### `update_updated_at_column` - Mise à jour automatique des timestamps
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

### `log_audit_action` - Journalisation des actions
```sql
CREATE OR REPLACE FUNCTION public.log_audit_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (COALESCE(NEW.user_id, auth.uid()), 'CREATE', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (COALESCE(NEW.user_id, auth.uid()), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (COALESCE(OLD.user_id, auth.uid()), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
```

---

## 3. Edge Functions

### `create-admin` - Création d'administrateur
Permet de créer le premier compte administrateur.

**Secrets requis:**
- `ADMIN_CREATION_SECRET` - Clé secrète pour autoriser la création

**Endpoint:** `POST /functions/v1/create-admin`

### `update-user-password` - Réinitialisation de mot de passe
Permet aux administrateurs de réinitialiser les mots de passe.

**Secrets requis:**
- `SUPABASE_SERVICE_ROLE_KEY`

**Endpoint:** `POST /functions/v1/update-user-password`

### `manage-user` - Gestion des utilisateurs
Permet de suspendre/supprimer des comptes utilisateurs.

**Secrets requis:**
- `SUPABASE_SERVICE_ROLE_KEY`

**Endpoint:** `POST /functions/v1/manage-user`

### `notify-admins` - Notifications par email
Envoie des notifications email aux administrateurs.

**Secrets requis:**
- `RESEND_API_KEY` - Clé API Resend pour l'envoi d'emails

**Endpoint:** `POST /functions/v1/notify-admins`

---

## 4. Configuration de l'Authentification

### Paramètres recommandés:
- **Auto-confirm email:** Activé (pour les environnements de développement)
- **Disable signup:** Désactivé (permet l'inscription)
- **Anonymous users:** Désactivé

### Trigger pour nouveaux utilisateurs:
Un trigger sur `auth.users` appelle `handle_new_user()` pour créer automatiquement:
- Un profil dans `profiles`
- Un rôle "agent" dans `user_roles`
- Des paramètres de notification dans `notification_settings`

---

## 5. Secrets Configurés

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | Clé publique anonyme |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé de service (admin) |
| `SUPABASE_DB_URL` | URL de connexion à la base |
| `SUPABASE_PUBLISHABLE_KEY` | Clé publique |
| `RESEND_API_KEY` | Clé API Resend pour les emails |
| `ADMIN_CREATION_SECRET` | Secret pour créer le premier admin |

---

## 6. Création du Premier Administrateur

```bash
curl -X POST 'https://hpbkpsofyxlacnskeukv.supabase.co/functions/v1/create-admin' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@example.com",
    "password": "VotreMotDePasse123!",
    "fullName": "Administrateur",
    "secret": "VOTRE_ADMIN_CREATION_SECRET"
  }'
```

---

## 7. Politiques RLS (Row Level Security)

Toutes les tables ont RLS activé avec des politiques basées sur:
- **Agents:** Accès à leurs propres données uniquement
- **Managers:** Accès à toutes les données de contrôle (lecture)
- **Admins:** Accès complet à toutes les données

Les politiques utilisent la fonction `has_role()` pour vérifier les permissions sans récursion.

---

## 8. Checklist de Vérification

- [ ] Tables créées avec RLS activé
- [ ] Fonctions de base de données déployées
- [ ] Trigger `handle_new_user` configuré
- [ ] Edge functions déployées
- [ ] Secrets configurés
- [ ] Premier administrateur créé
- [ ] Test de connexion réussi
