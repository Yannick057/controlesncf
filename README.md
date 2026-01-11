# 🚆 SNCF Contrôles - Application de Gestion des Contrôles

Application web progressive (PWA) pour la gestion des contrôles voyageurs SNCF, permettant aux agents de saisir et suivre leurs contrôles à bord des trains et en gare.

---

## 📱 Fonctionnalités

### 🎫 Saisie des Contrôles

#### Contrôles à Bord
- Sélection du numéro de train avec prédiction intelligente
- Gare d'origine et de destination
- Compteur de voyageurs contrôlés
- Saisie des tarifs de bord (TB) et tarifs de contrôle
- Comptage des STT 50€ et STT 100€
- Liste des PV établis
- Taux de fraude automatique
- Régularisations immédiates (positives/négatives)
- Commentaires libres

#### Contrôles en Gare
- Sélection de la gare et du quai
- Mêmes fonctionnalités que les contrôles à bord
- Adaptation aux spécificités des contrôles fixes

### 📊 Tableau de Bord

- **Statistiques en temps réel:**
  - Total des contrôles (jour/semaine/mois)
  - Voyageurs contrôlés
  - Taux de fraude moyen
  - PV établis
  - Régularisations

- **Graphiques interactifs:**
  - Évolution des contrôles dans le temps
  - Répartition par type (bord/gare)
  - Comparaison des performances

- **Carte de chaleur de la fraude:**
  - Visualisation géographique
  - Identification des zones à risque

### 📜 Historique des Contrôles

- Liste complète des contrôles effectués
- Filtres par date, type, gare/train
- Recherche avancée
- Export des données (CSV, PDF)
- Détail de chaque contrôle
- Modification/suppression (selon permissions)

### 👥 Gestion des Utilisateurs

#### Rôles
- **Agent:** Saisie et consultation de ses propres contrôles
- **Manager:** Consultation de tous les contrôles, statistiques globales
- **Administrateur:** Gestion complète (utilisateurs, configuration, données)

#### Fonctionnalités Admin
- Création/modification/suppression d'utilisateurs
- Attribution des rôles
- Réinitialisation des mots de passe
- Suspension de comptes
- Historique des changements de rôles
- Journal d'audit complet

### 🔔 Notifications

- Alertes de fraude élevée
- Configuration du seuil d'alerte
- Notifications par email aux administrateurs
- Paramètres personnalisables

### 📝 Notes d'Équipe

- Envoi de messages entre agents
- Suivi des notes lues/non lues
- Communication interne simplifiée

### 🐛 Rapports de Bugs

- Signalement des problèmes
- Suivi des statuts (ouvert, en cours, résolu)
- Priorités (basse, moyenne, haute, critique)

### 📋 Notes de Version

- Historique des mises à jour
- Description des nouvelles fonctionnalités
- Corrections de bugs

### ⚙️ Paramètres

- **Profil utilisateur:**
  - Modification du nom
  - Changement de mot de passe
  
- **Préférences:**
  - Page par défaut au démarrage
  - Ordre des menus
  - Thème clair/sombre
  
- **Notifications:**
  - Activation/désactivation
  - Seuil d'alerte de fraude

### 🔐 Sécurité

- Authentification sécurisée
- Politiques RLS (Row Level Security)
- Chiffrement des données
- Journal d'audit
- Tableau de bord de sécurité (admin)

---

## 🛠️ Technologies

| Technologie | Utilisation |
|-------------|-------------|
| **React 18** | Framework frontend |
| **TypeScript** | Typage statique |
| **Vite** | Build tool |
| **Tailwind CSS** | Styles |
| **shadcn/ui** | Composants UI |
| **Lovable Cloud** | Backend (Supabase) |
| **Recharts** | Graphiques |
| **React Router** | Navigation |
| **TanStack Query** | Gestion des données |
| **Zod** | Validation |
| **jsPDF** | Génération PDF |
| **Vite PWA** | Application installable |

---

## 📱 PWA (Progressive Web App)

L'application est installable sur:
- 📱 Smartphones (iOS, Android)
- 💻 Ordinateurs (Windows, Mac, Linux)

### Fonctionnalités PWA:
- Installation sur l'écran d'accueil
- Mode hors-ligne (données en cache)
- Synchronisation automatique
- Notifications push (à venir)

---

## 🚀 Déploiement

### Prérequis
- Node.js 18+
- npm ou bun

### Installation locale

```bash
# Cloner le repository
git clone <YOUR_GIT_URL>

# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build de production
npm run build
```

### Variables d'environnement

```env
VITE_SUPABASE_URL=https://hpbkpsofyxlacnskeukv.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=hpbkpsofyxlacnskeukv
```

---

## 📁 Structure du Projet

```
src/
├── components/
│   ├── admin/          # Composants admin (audit, sécurité, email)
│   ├── controls/       # Composants de saisie (formulaires, compteurs)
│   ├── dashboard/      # Composants tableau de bord (stats, charts)
│   ├── features/       # Fonctionnalités (bugs, releases, rapports)
│   ├── layout/         # Layout (header, navigation)
│   └── ui/             # Composants UI shadcn
├── contexts/           # Contextes React (auth, theme)
├── hooks/              # Hooks personnalisés
├── integrations/       # Configuration Supabase
├── pages/              # Pages de l'application
└── utils/              # Utilitaires (export, rapports)

supabase/
├── functions/          # Edge Functions
│   ├── create-admin/
│   ├── manage-user/
│   ├── notify-admins/
│   └── update-user-password/
└── migrations/         # Migrations SQL
```

---

## 📊 Pages de l'Application

| Route | Page | Accès |
|-------|------|-------|
| `/` | Accueil / Connexion | Public |
| `/login` | Page de connexion | Public |
| `/dashboard` | Tableau de bord | Authentifié |
| `/onboard` | Contrôles à bord | Authentifié |
| `/station` | Contrôles en gare | Authentifié |
| `/history` | Historique | Authentifié |
| `/settings` | Paramètres | Authentifié |
| `/manager` | Vue manager | Manager+ |
| `/admin` | Administration | Admin |

---

## 🔧 Configuration Backend

Voir le fichier [SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md) pour:
- Schéma de base de données complet
- Configuration des Edge Functions
- Secrets et variables d'environnement
- Création du premier administrateur

---

## 📞 Support

Pour signaler un bug ou proposer une amélioration:
1. Utilisez la fonctionnalité "Signaler un bug" dans l'application
2. Ou créez une issue sur le repository

---

## 📄 Licence

Application développée pour SNCF - Usage interne.

---

*Dernière mise à jour: Janvier 2026*
