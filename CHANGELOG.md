# 📋 Changelog - SNCF Contrôles

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Versioning Sémantique](https://semver.org/lang/fr/).

---

## [1.7.0] - 2026-01-12

### ✨ Ajouté
- **Détail et édition des contrôles** : Bouton œil dans l'historique pour voir/modifier chaque contrôle
- **Détail des opérations dans les exports** : Chaque tarif, PV et STT est maintenant listé dans les rapports HTML/PDF

### 🔧 Modifié
- Suppression du préremplissage automatique des numéros de train (seuls les trains récents sont suggérés)
- Correction du bug de la page d'accueil par défaut qui ne fonctionnait pas

---

## [1.6.0] - 2026-01-11

### ✨ Ajouté
- **Notifications temps réel** : Alertes push via Supabase Realtime pour les nouveaux contrôles et messages
- **Centre de notifications** : Interface avec compteur de non-lues et historique complet
- **Filtres de notifications** : Par type (contrôles à bord, en gare, messages d'équipe)
- **Thèmes personnalisés améliorés** :
  - Édition des thèmes existants avec bouton crayon
  - Duplication automatique lors de la modification d'un thème communautaire
  - Import/Export de thèmes au format JSON
  - **Prévisualisation en temps réel** des couleurs avant application
- **Visibilité des données (Admin)** : Contrôle granulaire de l'accès aux données globales

### 🔧 Modifié
- Amélioration de l'interface de création de thèmes avec aperçu en direct
- Meilleure gestion des notifications avec persistance de l'historique

---

## [1.5.0] - 2026-01-11

### ✨ Ajouté
- Documentation complète du projet (README.md, SUPABASE_SETUP_GUIDE.md)
- Détail complet des paramètres de contrôle (RNV, date de naissance, STT, etc.)
- Formules de calcul du taux de fraude documentées
- Diagramme de base de données Mermaid

### 🔧 Modifié
- Amélioration de la configuration PWA avec logo SNCF personnalisé
- Mise à jour des icônes pour l'installation sur écran d'accueil

---

## [1.4.0] - 2026-01-10

### ✨ Ajouté
- **Notes d'équipe** : Communication entre agents via notes internes
- **Rapports de bugs** : Système de signalement intégré avec suivi des statuts
- **Notes de version** : Affichage des nouvelles fonctionnalités
- **Préférences utilisateur** : Page par défaut, ordre des menus personnalisable

### 🔧 Modifié
- Amélioration de la navigation avec personnalisation de l'ordre des pages
- Interface des paramètres enrichie

---

## [1.3.0] - 2026-01-08

### ✨ Ajouté
- **Alertes de fraude** : Notifications automatiques lors de dépassement du seuil
- **Configuration des notifications** : Seuil d'alerte personnalisable par utilisateur
- **Notifications email** : Envoi d'alertes aux administrateurs (Edge Function)
- **Indicateur de connexion** : Affichage du statut réseau en temps réel

### 🔧 Modifié
- Amélioration du tableau de bord avec code couleur du taux de fraude
- Optimisation des performances de chargement

---

## [1.2.0] - 2026-01-05

### ✨ Ajouté
- **Page Manager** : Vue dédiée pour les responsables d'équipe
- **Statistiques par agent** : Performance individuelle des contrôleurs
- **Graphiques avancés** : Évolution temporelle, répartition par type
- **Carte de chaleur** : Visualisation géographique de la fraude
- **Filtres du dashboard** : Par période, type de train, ligne

### 🔧 Modifié
- Refonte du tableau de bord avec cartes statistiques animées
- Amélioration de la lisibilité des graphiques

---

## [1.1.0] - 2026-01-02

### ✨ Ajouté
- **Administration complète** :
  - Gestion des utilisateurs (création, modification, suppression)
  - Attribution des rôles (agent, manager, admin)
  - Réinitialisation des mots de passe
  - Suspension de comptes
- **Journal d'audit** : Traçabilité de toutes les actions sensibles
- **Historique des rôles** : Suivi des changements de permissions
- **Tableau de bord de sécurité** : Vue d'ensemble pour les admins

### 🔒 Sécurité
- Implémentation des Edge Functions sécurisées
- Politiques RLS restrictives sur toutes les tables
- Séparation des rôles dans une table dédiée

---

## [1.0.0] - 2025-12-28

### ✨ Ajouté
- **Contrôles à bord** :
  - Saisie du numéro de train avec prédiction
  - Sélection des gares origine/destination
  - Compteur de passagers
  - Tarifs de bord et tarifs de contrôle
  - STT 50€ et STT 100€
  - Procès-verbaux
  - Régularisations immédiates (positives/négatives)
  - Commentaires libres
  - Calcul automatique du taux de fraude

- **Contrôles en gare** :
  - Sélection de la gare et du quai
  - Mêmes fonctionnalités que les contrôles à bord

- **Historique des contrôles** :
  - Liste complète avec pagination
  - Filtres par date et type
  - Recherche textuelle
  - Détail de chaque contrôle
  - Modification et suppression

- **Export de données** :
  - Export CSV/Excel
  - Génération de rapports PDF
  - Rapports HTML interactifs
  - Filtres d'export personnalisables

- **Tableau de bord** :
  - Statistiques en temps réel
  - Nombre de contrôles
  - Total passagers
  - Taux de fraude global

- **Authentification** :
  - Inscription et connexion sécurisées
  - Gestion des sessions
  - Déconnexion

- **PWA** :
  - Installation sur mobile et desktop
  - Mode hors-ligne avec cache
  - Synchronisation automatique

- **Interface** :
  - Design responsive (mobile-first)
  - Thème clair/sombre
  - Navigation intuitive
  - Animations fluides

### 🛠 Technique
- React 18 avec TypeScript
- Vite pour le build
- Tailwind CSS pour le styling
- shadcn/ui pour les composants
- Supabase pour le backend
- TanStack Query pour le data fetching
- Zod pour la validation
- jsPDF pour les exports PDF
- Recharts pour les graphiques

---

## [0.9.0] - 2025-12-20 (Beta)

### ✨ Ajouté
- Prototype initial de l'application
- Formulaires de saisie basiques
- Stockage local des données
- Interface de base

### 🐛 Corrigé
- Validation des champs du formulaire
- Gestion des erreurs de saisie

---

## Types de changements

- ✨ **Ajouté** : Nouvelles fonctionnalités
- 🔧 **Modifié** : Changements dans les fonctionnalités existantes
- 🗑️ **Supprimé** : Fonctionnalités retirées
- 🐛 **Corrigé** : Corrections de bugs
- 🔒 **Sécurité** : Améliorations de sécurité
- 📝 **Documentation** : Mise à jour de la documentation

---

*Dernière mise à jour : Janvier 2026*
