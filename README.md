# 🎵 Tribeat - Sessions Live Interactives

Plateforme de sessions live synchronisées pour coachs et participants avec audio/vidéo temps réel.

## 📦 Stack Technique

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Base de données:** PostgreSQL + Prisma ORM
- **Authentification:** NextAuth.js
- **Temps réel:** Pusher WebSocket
- **UI:** Tailwind CSS + Shadcn/ui + Radix UI
- **Audio/Vidéo:** Web Audio API + MediaStream API
- **PWA:** Manifest dynamique

## 🗄️ Modèles de Données

### Users & Authentication
- `User` - Utilisateurs (Super Admin, Coach, Participant)

### Sessions Live
- `Session` - Sessions avec média synchronisé
- `SessionParticipant` - Relation many-to-many User ↔ Session avec rôles
- `ChatMessage` - Messages de chat temps réel

### Admin Dynamique
- `UI_Settings` - Thème et configuration PWA (pilotable par DB)
- `Translation` - Traductions i18n (FR/EN/DE)

### Paiements
- `Transaction` - Paiements Stripe/Twint

## 🚀 Démarrage

### Configuration de la Base de Données

**Option 1 : PostgreSQL Production (Supabase/Neon)**

```bash
# 1. Modifier .env avec votre URL PostgreSQL
DATABASE_URL="postgresql://user:password@host:5432/tribeat"

# 2. Push du schéma vers la DB
yarn prisma db push

# 3. Seed des données initiales
yarn db:seed
```

**Option 2 : Test Local avec SQLite**

```bash
# 1. Modifier temporairement prisma/schema.prisma
# Remplacer: provider = "postgresql"
# Par: provider = "sqlite"

# 2. Modifier .env
DATABASE_URL="file:./dev.db"

# 3. Push et seed
yarn prisma db push
yarn db:seed

# 4. Restaurer PostgreSQL dans schema.prisma pour production
```

### Démarrage de l'Application

```bash
# Installation des dépendances
yarn install

# Démarrage du serveur de développement
yarn dev
```

L'application sera accessible sur http://localhost:3000

## 🔐 Variables d'Environnement

Copier `.env.example` vers `.env` et remplir :

```env
# Base de données (Supabase/Neon)
DATABASE_URL="postgresql://user:password@host:5432/tribeat"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="votre-secret-key"

# Pusher
NEXT_PUBLIC_PUSHER_KEY="votre-pusher-key"
NEXT_PUBLIC_PUSHER_CLUSTER="eu"
PUSHER_APP_ID="votre-app-id"
PUSHER_SECRET="votre-pusher-secret"

# Stripe (optionnel)
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
```

## 📂 Structure du Projet

```
tribeat/
├── prisma/
│   └── schema.prisma        # Schéma de base de données complet
├── src/
│   ├── app/
│   │   ├── api/             # API Routes
│   │   ├── auth/            # Pages d'authentification
│   │   ├── admin/           # Dashboard Super Admin
│   │   ├── session/[id]/    # La Live Room
│   │   ├── layout.tsx       # Layout principal avec thème
│   │   └── page.tsx         # Page d'accueil
│   ├── components/
│   │   ├── audio/           # Composants Web Audio API
│   │   ├── live/            # Lecteur Vidéo Synchro & Chat
│   │   └── ui/              # Composants Shadcn/Tailwind
│   ├── lib/
│   │   ├── prisma.ts        # Singleton Prisma Client
│   │   ├── pusher.ts        # Config Pusher
│   │   └── utils.ts         # Utilitaires
│   └── actions/             # Server Actions (Mutations DB)
├── public/                  # Assets statiques
└── next.config.mjs          # Configuration Next.js
```

## ✅ Phase 1 - Complétée

- [x] Initialisation Next.js 14 avec TypeScript
- [x] Configuration Prisma avec schéma ajusté
- [x] Setup Tailwind CSS + Shadcn/ui
- [x] Structure de dossiers complète
- [x] Composants UI de base (Button, Input, Card, Label)
- [x] Page d'accueil avec présentation
- [x] Configuration Pusher (placeholders)
- [x] Variables d'environnement

## ✅ Phase 4 - Complétée

- [x] Server Actions sécurisées (ui-settings, translations, sessions, users, export)
- [x] Injection dynamique thème (ThemeProvider + CSS Variables)
- [x] Layout Admin complet (Sidebar + Header + double sécurité)
- [x] Dashboard avec stats réelles depuis DB
- [x] **Éditeur de Thème** (couleurs, fonts, radius, PWA) - PRIORITÉ ✅
- [x] Éditeur Traductions (FR/EN/DE) - Table éditable
- [x] CRUD Sessions (création, liste, suppression)
- [x] Gestion Utilisateurs (changement rôles, suppression)
- [x] Export Données (CSV/JSON : users, sessions, settings, translations)
- [x] Zéro hardcoding (tout depuis DB)
- [x] Modifications appliquées immédiatement sans redéploiement
- [x] Architecture extensible (ajout clés facile)

### 🎨 Fonctionnalités Admin

**Dashboard** (`/admin/dashboard`)
- Vue d'ensemble avec stats (users, sessions, settings, translations)
- Actions rapides vers toutes les sections

**Éditeur de Thème** (`/admin/theme`)
- Couleurs : Primary, Secondary, Background, Foreground
- Typographie : Font family, Border radius
- PWA : Nom app, Couleur thème
- Sauvegarde batch + application immédiate

**Traductions** (`/admin/translations`)
- Édition FR/EN/DE côte à côte
- Ajout/Suppression de clés
- Modification inline (onBlur)

**Sessions** (`/admin/sessions`)
- Liste sessions avec coach, date, status
- Création session (titre, description, média, planning)
- Suppression

**Utilisateurs** (`/admin/users`)
- Liste avec nom, email, rôle, stats
- Changement de rôle (dropdown)
- Suppression (protection compte admin)

**Export** (`/admin/export`)
- Users (CSV + JSON)
- Sessions (CSV + JSON)
- UI Settings (JSON)
- Translations (JSON)

## 🎯 Prochaines Phases

### Phase 4 : Dashboard Admin
- [ ] Éditeur de thème (couleurs hex, fonts, radius)
- [ ] Gestion des traductions (FR/EN/DE) en base
- [ ] CRUD Sessions complètes
- [ ] Gestion des utilisateurs et rôles
- [ ] Export données (CSV/JSON)
- [ ] Statistiques des sessions

### Phase 5 : Sessions Live
- [ ] Interface admin protégée
- [ ] Éditeur de thème (couleurs, fonts, radius)
- [ ] Gestion des traductions (FR/EN/DE)
- [ ] CRUD Sessions
- [ ] Export données (CSV/JSON)

### Phase 5 : Sessions Live
- [ ] Page dynamique `/session/[id]`
- [ ] Intégration Pusher temps réel
- [ ] Chat en direct
- [ ] Liste des participants

### Phase 6 : Audio/Vidéo Synchronisé
- [ ] Composants Web Audio API
- [ ] Lecteur vidéo synchronisé (Coach = maître)
- [ ] Contrôles de lecture (play/pause/seek)
- [ ] Mixer audio (3 micros max)

### Phase 7 : PWA
- [ ] Manifest dynamique (`/api/manifest`)
- [ ] Service Worker
- [ ] Installation mobile

## 🎨 Fonctionnalités Clés

### Admin Pilotable par DB ✅
Le Super Admin peut modifier le design et les textes du site **sans redéploiement** :
- Thème (couleurs hex, fonts, radius boutons)
- Traductions (FR/EN/DE)
- Configuration PWA (nom, icônes)

### Lecture Synchronisée (Pas de Visioconférence) ✅
- Coach = source maître
- Participants s'alignent automatiquement (play/pause/seek)
- Latence cible < 200ms via Pusher
- Source : fichier (Cloudinary/Vercel Blob) ou URL externe

### Mixer Audio Web Audio API ✅
- Mixage source média + 3 entrées micro
- Coach contrôle le mix
- Sortie vers casques Bluetooth
- Pas de streaming peer-to-peer

## 🛠️ Commandes Utiles

```bash
# Prisma
yarn prisma generate          # Générer le client Prisma
yarn prisma db push           # Synchroniser le schéma avec la DB
yarn prisma studio            # Interface visuelle DB

# Next.js
yarn dev                      # Démarrage développement
yarn build                    # Build production
yarn start                    # Démarrage production

# Supervisor (Production)
sudo supervisorctl status     # Statut des services
sudo supervisorctl restart nextjs
```

## 📝 Notes Importantes

- **PostgreSQL requis** : Supabase ou Neon recommandé
- **Pusher** : Compte sandbox gratuit pour le développement
- **Pas de Firebase** : Stack pure Next.js + Prisma
- **PWA Dynamique** : Le manifest lit depuis `UI_Settings`

---

**Status:** Phase 1 ✅ Complétée | En attente de validation pour Phase 2
