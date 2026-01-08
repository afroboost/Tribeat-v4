# 🗄️ Guide de Migration PostgreSQL

Ce guide explique comment migrer la base de données Tribeat vers PostgreSQL (Supabase/Neon).

## 📋 Prérequis

- Compte Supabase ou Neon (gratuit)
- URL de connexion PostgreSQL

---

## 🔧 Configuration Supabase

### 1. Créer un Projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Choisir un nom : `tribeat`
4. Choisir une région (Europe recommandée)
5. Définir un mot de passe fort

### 2. Récupérer l'URL de Connexion

1. Dans le dashboard Supabase, aller dans **Settings** > **Database**
2. Copier la **Connection string** (URI format)
3. Remplacer `[YOUR-PASSWORD]` par votre mot de passe

Format :
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

---

## 🔧 Configuration Neon

### 1. Créer un Projet Neon

1. Aller sur [neon.tech](https://neon.tech)
2. Créer un nouveau projet
3. Choisir un nom : `tribeat`
4. Choisir une région (Europe recommandée)

### 2. Récupérer l'URL de Connexion

1. Dans le dashboard Neon, cliquer sur **Connection Details**
2. Copier la **Connection string**

Format :
```
postgresql://user:password@ep-xxxx-xxxx.eu-central-1.aws.neon.tech/tribeat?sslmode=require
```

---

## 🚀 Migration Step-by-Step

### Étape 1 : Mettre à Jour .env

```bash
# /app/.env

# Remplacer l'URL SQLite par votre URL PostgreSQL
DATABASE_URL="postgresql://user:password@host:5432/tribeat"

# Autres variables (inchangées)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tribeat-dev-secret-key-2025-change-in-production"
NEXT_PUBLIC_PUSHER_KEY="placeholder-key"
NEXT_PUBLIC_PUSHER_CLUSTER="eu"
PUSHER_APP_ID="placeholder-app-id"
PUSHER_SECRET="placeholder-secret"
```

### Étape 2 : Vérifier le Schéma Prisma

```bash
# Vérifier que provider = "postgresql" dans prisma/schema.prisma
cat prisma/schema.prisma | grep provider
```

Doit afficher :
```
provider = "postgresql"
```

### Étape 3 : Push du Schéma

```bash
cd /app

# Générer le client Prisma
yarn prisma generate

# Push du schéma vers PostgreSQL
yarn prisma db push

# Vérification : Affiche les tables créées
yarn prisma db studio
```

### Étape 4 : Seed des Données Initiales

```bash
# Exécuter le seed
yarn db:seed
```

**Output attendu :**
```
🌱 Début du seeding de la base de données...
📐 Création des paramètres UI (Thème)...
📱 Création des paramètres PWA...
⚙️ Création des paramètres généraux...
🌍 Création des traductions (FR/EN/DE)...
👤 Création du Super Admin...
✅ Super Admin créé: admin@tribeat.com
👥 Création d'utilisateurs de démonstration...
✅ Utilisateurs de démo créés: coach@tribeat.com participant@tribeat.com
🎥 Création d'une session de démonstration...
✅ Session de démo créée: demo-session-1

🎉 Seeding terminé avec succès !

📊 Résumé:
  - UI_Settings: 16 entrées
  - Translations: 54 entrées
  - Users: 3 (1 admin, 1 coach, 1 participant)
  - Sessions: 1 session de démo

🔑 Credentials Admin:
  Email: admin@tribeat.com
  Password: Admin123!

🔑 Credentials Demo (Coach & Participant):
  Email: coach@tribeat.com / participant@tribeat.com
  Password: Demo123!
```

### Étape 5 : Redémarrer le Serveur

```bash
# Redémarrer Next.js
sudo supervisorctl restart nextjs

# Vérifier le statut
sudo supervisorctl status nextjs
```

### Étape 6 : Tester la Connexion

```bash
# Vérifier que l'app se connecte à PostgreSQL
curl http://localhost:3000

# Ou ouvrir dans le navigateur
open http://localhost:3000
```

La page d'accueil doit afficher le compteur d'utilisateurs : **3 utilisateurs**

---

## 🔍 Vérification et Debug

### Vérifier les Tables dans Prisma Studio

```bash
yarn prisma studio
```

Ouvre une interface web sur http://localhost:5555 pour visualiser :
- Users (3 entrées)
- UI_Settings (16 entrées)
- Translation (54 entrées)
- Session (1 entrée)

### Vérifier les Logs Next.js

```bash
tail -50 /var/log/supervisor/nextjs.out.log
tail -50 /var/log/supervisor/nextjs.err.log
```

### Erreurs Courantes

#### ❌ Erreur : "Can't reach database server"

**Solution :**
- Vérifier l'URL de connexion dans `.env`
- Vérifier que l'IP est autorisée (Supabase : désactiver SSL ou ajouter IP)
- Tester la connexion avec `psql` :
  ```bash
  psql "postgresql://user:password@host:5432/tribeat"
  ```

#### ❌ Erreur : "SSL connection required"

**Solution :**
- Ajouter `?sslmode=require` à la fin de l'URL :
  ```
  DATABASE_URL="postgresql://...?sslmode=require"
  ```

#### ❌ Erreur : "Password authentication failed"

**Solution :**
- Vérifier le mot de passe dans l'URL
- Encoder les caractères spéciaux : `@` → `%40`, `#` → `%23`, etc.

---

## 📊 Données Seedées

### UI_Settings (16 entrées)

**Thème :**
- `primary_color`: #3b82f6
- `secondary_color`: #8b5cf6
- `background_color`: #ffffff
- `foreground_color`: #0f0f10
- `border_radius`: 8
- `font_family`: Inter

**PWA :**
- `pwa_app_name`: Tribeat
- `pwa_app_short_name`: Tribeat
- `pwa_app_description`: Sessions Live Interactives
- `pwa_theme_color`: #3b82f6
- `pwa_background_color`: #ffffff
- `pwa_icon_url`: /icon.png

**Général :**
- `site_title`: Tribeat - Sessions Live
- `default_language`: FR
- `max_session_participants`: 50
- `enable_registration`: true

### Translations (54 entrées)

Clés traduites en FR/EN/DE :
- `session.join_button`, `session.leave_button`, `session.live_now`
- `chat.placeholder`, `chat.send_button`
- `auth.login`, `auth.register`, `auth.logout`, `auth.email`, `auth.password`
- `admin.dashboard`, `admin.users`, `admin.sessions`, `admin.settings`
- `common.save`, `common.cancel`, `common.delete`, `common.edit`

### Users (3 utilisateurs)

1. **Super Admin** - admin@tribeat.com (Admin123!)
2. **Coach Demo** - coach@tribeat.com (Demo123!)
3. **Participant Demo** - participant@tribeat.com (Demo123!)

### Sessions (1 session de démo)

- **Titre :** Session de Démonstration
- **Coach :** Coach Demo
- **Média :** Vidéo externe (W3Schools)
- **Status :** SCHEDULED (demain)

---

## 🔄 Réinitialiser la Base de Données

Si besoin de repartir de zéro :

```bash
# 1. Reset de la base (ATTENTION : Supprime toutes les données)
yarn prisma db push --force-reset

# 2. Re-seed
yarn db:seed
```

---

## ✅ Checklist de Migration

- [ ] URL PostgreSQL configurée dans `.env`
- [ ] Schéma Prisma vérifié (`provider = "postgresql"`)
- [ ] `yarn prisma generate` exécuté avec succès
- [ ] `yarn prisma db push` exécuté avec succès
- [ ] `yarn db:seed` exécuté avec succès
- [ ] 3 utilisateurs créés (vérifiable dans Prisma Studio)
- [ ] 16 UI_Settings créés
- [ ] 54 Translations créées
- [ ] 1 Session de démo créée
- [ ] Next.js redémarré
- [ ] Page d'accueil affiche "3 utilisateurs"

---

## 🎯 Prochaine Étape : Phase 3

Une fois la migration terminée, vous pouvez passer à la **Phase 3 : Authentification** avec NextAuth.js.

Les credentials de test sont prêts à être utilisés !
