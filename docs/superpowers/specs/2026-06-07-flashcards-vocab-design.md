# VocabMemo — Design Spec
**Date :** 2026-06-07  
**Stack :** React (Vite) + Supabase (auth, DB, Edge Functions) + Anthropic Claude API  
**Déploiement :** Vercel

---

## 1. Vue d'ensemble

Application web de mémorisation de vocabulaire anglais↔français par répétition espacée (système Leitner). Les cartes sont organisées par thématiques ; Claude peut générer automatiquement des jeux de cartes à la demande. La progression est persistée dans Supabase et accessible depuis n'importe quel appareil.

---

## 2. Architecture

```
Browser (React/Vite)
    │
    ├── Supabase Auth       → Google OAuth
    ├── Supabase DB         → cartes, thématiques, progression
    └── Supabase Edge Fn    → proxy appels Anthropic API (clé jamais exposée côté client)
```

- **Frontend** : React 18 + Vite, TailwindCSS, déployé sur Vercel
- **Backend** : Supabase (PostgreSQL + Auth + Edge Functions en Deno)
- **IA** : Claude API appelée depuis une Edge Function `generate-cards`
- **Auth** : Google OAuth via Supabase Auth, session JWT

---

## 3. Modèle de données

### `themes`
| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| name | text | ex: "Travail" |
| emoji | text | ex: "💼" |
| created_at | timestamptz | |

### `cards`
| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| theme_id | uuid FK → themes | |
| user_id | uuid FK → auth.users | |
| front | text | mot/phrase en anglais |
| back | text | traduction en français |
| example | text nullable | phrase d'exemple |
| created_at | timestamptz | |

### `card_progress`
| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| card_id | uuid FK → cards | |
| user_id | uuid FK → auth.users | |
| level | int | 0–6 (échelle Leitner) |
| next_review_at | timestamptz | date de prochaine révision |
| updated_at | timestamptz | |

**Index :** `card_progress(user_id, next_review_at)` pour la requête "cartes dues".

---

## 4. Système de répétition espacée (Leitner)

| Level | Prochain intervalle |
|---|---|
| 0 | Immédiat (nouvelle carte) |
| 1 | 1 jour |
| 2 | 4 jours |
| 3 | 7 jours |
| 4 | 14 jours |
| 5 | 60 jours |
| 6 | 180 jours (maîtrisée) |

- **Bonne réponse** → `level + 1`, `next_review_at = now + interval[level+1]`
- **Mauvaise réponse** → `level = 0`, `next_review_at = now`
- Les cartes sont présentées triées par `next_review_at ASC` (les plus en retard en premier)
- Nouvelles cartes (sans `card_progress`) traitées comme level 0

---

## 5. Écrans et navigation

### Navigation : sidebar desktop (fixe à gauche)
- **🏠 Accueil** — dashboard
- **🗂️ Thématiques** — liste, création, gestion
- **✏️ Mes cartes** — CRUD cartes
- **👤 Profil** — déconnexion

Sur mobile : la sidebar devient un menu hamburger en haut.

### 5.1 Dashboard (Accueil)
- Compteur de cartes dues aujourd'hui (total et par thématique)
- Stats globales : cartes maîtrisées, total cartes
- Liste des thématiques avec badge "X dues" ou "✓ À jour"
- Bouton principal **▶ Commencer la révision** → lance la session sur toutes les cartes dues

### 5.2 Révision (mode carte)
1. Affichage du **recto** (mot anglais + type grammatical)
2. Bouton **🔄 Retourner** → flip animé
3. Affichage du **verso** (traduction + exemple si disponible)
4. Deux boutons : **✗ Faux** (rouge) | **✓ Bon** (vert)
5. Mise à jour immédiate de `card_progress` en base
6. Carte suivante automatiquement, ou écran de fin de session

La session peut être filtrée par thématique (lancée depuis l'écran Thématiques).

### 5.3 Thématiques
- Liste des thématiques avec : emoji, nom, nb cartes, nb dues
- **Créer une thématique** : nom + emoji + choix du nombre de cartes à générer (slider 10–100)
- Bouton **🤖 Générer avec Claude** → appel à l'Edge Function, affichage d'un loader, puis les cartes apparaissent et peuvent être relues/modifiées avant validation
- Éditer le nom/emoji d'une thématique existante
- Supprimer une thématique (supprime les cartes et progressions associées)

### 5.4 Mes cartes
- Filtre par thématique
- Liste des cartes avec front + back + niveau Leitner actuel
- **Ajouter** une carte manuellement (front, back, exemple optionnel, thématique)
- **Modifier** une carte existante
- **Supprimer** une carte

### 5.5 Auth
- Page de landing si non connecté → bouton "Se connecter avec Google"
- Redirect post-auth vers le Dashboard

---

## 6. Edge Function : `generate-cards`

**Input (POST body) :**
```json
{
  "theme": "Intelligence Artificielle",
  "count": 50
}
```

**Comportement :**
- Appelle l'API Claude avec un prompt demandant `count` paires anglais↔français pertinentes pour le thème, avec pour chaque carte : `front` (anglais), `back` (français), `example` (phrase d'exemple en anglais, optionnel)
- Répond en JSON structuré
- La clé Anthropic est lue depuis les secrets Supabase (jamais exposée au client)

**Output :**
```json
{
  "cards": [
    { "front": "machine learning", "back": "apprentissage automatique", "example": "Machine learning powers recommendation systems." },
    ...
  ]
}
```

---

## 7. Sécurité

- Row Level Security (RLS) activé sur toutes les tables : chaque utilisateur ne voit que ses propres données
- La clé Anthropic est stockée dans les secrets Supabase Edge Functions
- Authentification JWT validée automatiquement par Supabase

---

## 8. Ce qui est hors scope (v1)

- Import/export de cartes (CSV, Anki)
- Partage de thématiques entre utilisateurs
- Stats avancées (graphiques de progression)
- Mode hors ligne
- Notifications/rappels

---

## 9. Résumé des choix techniques

| Besoin | Solution |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS |
| Auth | Supabase Auth (Google OAuth) |
| Base de données | Supabase PostgreSQL |
| Appel IA sécurisé | Supabase Edge Function (Deno) |
| Déploiement | Vercel (frontend) + Supabase (backend) |
| IA | Anthropic Claude API |
