# 📋 Phase 3 : Authentification - Documentation Complète

## ✅ Livrables Phase 3

### 1️⃣ **Configuration NextAuth.js Production**

**Fichier :** `/app/src/app/api/auth/[...nextauth]/route.ts`

**Features :**
- ✅ Prisma Adapter pour gestion sessions DB
- ✅ Credentials provider avec bcrypt
- ✅ JWT strategy (Edge compatible)
- ✅ Callbacks pour rôles et redirections
- ✅ Architecture extensible pour 2FA et Magic Link

**Sécurité :**
- Hash bcrypt côté serveur (10 rounds)
- JWT signé avec NEXTAUTH_SECRET
- Session max: 30 jours
- Pas de password en clair dans les réponses

---

### 2️⃣ **Middleware Edge-Compatible**

**Fichier :** `/app/middleware.ts`

**Architecture :**
```typescript
// ✅ CORRECT (Edge compatible)
const token = await getToken({ req, secret });

// ❌ INCORRECT (ne fonctionne pas en Edge)
const session = await getServerSession();
```

**Protection routes :**
- `/admin` → SUPER_ADMIN uniquement
- `/coach` → COACH + SUPER_ADMIN
- `/session/[id]` → Authentifié

**Redirections :**
- Non authentifié → `/auth/login?callbackUrl=...`
- Authentifié mais role insuffisant → `/403`
- Déjà authentifié sur `/auth/*` → Dashboard selon rôle

---

### 3️⃣ **Typage TypeScript Strict**

**Fichier :** `/app/src/types/next-auth.d.ts`

**Sécurité :**
- `session.user.role` est **NON optionnel**
- Évite les erreurs runtime
- Typage complet JWT et Session

```typescript
interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole; // NON optionnel ✅
    avatar?: string;
  };
}
```

---

### 4️⃣ **Utilities Auth Centralisées**

**Fichier :** `/app/src/lib/auth.ts`

**Fonctions :**
- `getRedirectByRole(role)` → Redirection intelligente
- `getAuthSession()` → Session serveur (Server Components)
- `isAuthenticated()` → Vérification authentification
- `hasRole(role)` → Vérification rôle spécifique
- `isSuperAdmin()` → Vérification Super Admin
- `isCoachOrAdmin()` → Vérification Coach ou Admin

**Bénéfices :**
- Logique centralisée (DRY)
- Pas de duplication
- Facile à tester

---

### 5️⃣ **Pages Authentification**

#### **Login** (`/auth/login`)
- Validation Zod côté client
- Toast notifications (Sonner)
- Gestion erreurs NextAuth
- Auto-redirection après login
- Test IDs pour tests E2E
- Comptes de démo affichés

#### **Register** (`/auth/register`)
- Validation Zod complète
- Hash bcrypt côté serveur (API route)
- Vérification email unique
- Auto-login après inscription
- Rôle par défaut : PARTICIPANT

**API Route Register :** `/app/src/app/api/auth/register/route.ts`
- Validation serveur (Zod)
- Hash bcrypt (10 rounds)
- Vérification email unique en DB
- Pas de password en réponse

---

### 6️⃣ **Page 403 - Accès Refusé**

**Fichier :** `/app/src/app/403/page.tsx`

- Design moderne et accessible
- Boutons retour accueil et login
- Message clair pour l'utilisateur

---

### 7️⃣ **Admin Ghost Access**

**Footer Discret :**
- Lien "© 2025 Tribeat" cliquable
- Visuel neutre (pas de hover suspect)
- **AUCUN** bouton "Admin" visible
- Accès via URL `/admin` pour initiés

**Sécurité :**
- Middleware bloque accès non autorisé
- Double vérification serveur
- Redirection `/403` si non SUPER_ADMIN

---

### 8️⃣ **Pages Dashboards Temporaires**

**Créées pour tests de redirection :**
- `/admin/dashboard` → SUPER_ADMIN uniquement
- `/coach/dashboard` → COACH + SUPER_ADMIN
- `/sessions` → Tous utilisateurs authentifiés

**Double sécurité :**
```typescript
// 1. Middleware (première défense)
if (token.role !== 'SUPER_ADMIN') redirect('/403');

// 2. Server Component (seconde défense)
const session = await getAuthSession();
if (session?.user.role !== 'SUPER_ADMIN') redirect('/403');
```

---

## 🔐 Credentials de Test

### **Super Admin**
- Email: `admin@tribeat.com`
- Password: `Admin123!`
- Redirection: `/admin/dashboard`

### **Coach**
- Email: `coach@tribeat.com`
- Password: `Demo123!`
- Redirection: `/coach/dashboard`

### **Participant**
- Email: `participant@tribeat.com`
- Password: `Demo123!`
- Redirection: `/sessions`

---

## 🧪 Tests Manuels Phase 3

### Test 1 : Login Admin
```bash
1. Aller sur http://localhost:3000
2. Cliquer "Se connecter"
3. Email: admin@tribeat.com
4. Password: Admin123!
5. ✅ Redirection vers /admin/dashboard
6. ✅ Message "Bienvenue, Super Admin"
```

### Test 2 : Login Coach
```bash
1. Se connecter avec coach@tribeat.com / Demo123!
2. ✅ Redirection vers /coach/dashboard
3. ✅ Message "Bienvenue, Coach Demo"
```

### Test 3 : Login Participant
```bash
1. Se connecter avec participant@tribeat.com / Demo123!
2. ✅ Redirection vers /sessions
3. ✅ Message "Bienvenue, Participant Demo"
```

### Test 4 : Protection Middleware
```bash
1. Déconnexion (si connecté)
2. Aller sur http://localhost:3000/admin
3. ✅ Redirection automatique vers /auth/login
```

### Test 5 : Accès Refusé 403
```bash
1. Se connecter en tant que Participant
2. Aller sur http://localhost:3000/admin
3. ✅ Redirection vers /403
4. ✅ Message "Accès Refusé"
```

### Test 6 : Footer Admin Discret
```bash
1. Aller sur http://localhost:3000
2. Scroller en bas de page
3. ✅ Voir "© 2025 Tribeat" (lien discret)
4. Cliquer dessus
5. ✅ Redirection vers /auth/login (si non connecté)
```

### Test 7 : Inscription
```bash
1. Aller sur /auth/register
2. Remplir le formulaire :
   - Nom: Test User
   - Email: test@tribeat.com
   - Password: Test1234!
   - Confirm: Test1234!
3. Soumettre
4. ✅ Toast "Compte créé avec succès !"
5. ✅ Auto-login + redirection /sessions
```

### Test 8 : Erreurs Validation
```bash
1. Aller sur /auth/login
2. Email invalide: "test"
3. ✅ Message d'erreur "Email invalide"
4. Password court: "123"
5. ✅ Message d'erreur "Mot de passe trop court"
```

---

## 📊 Architecture Fichiers Phase 3

```
/app/
├── middleware.ts                           # ✅ Protection Edge-compatible
├── src/
│   ├── types/
│   │   └── next-auth.d.ts                  # ✅ Typage strict
│   ├── lib/
│   │   └── auth.ts                         # ✅ Utilities centralisées
│   ├── components/
│   │   ├── providers/
│   │   │   └── AuthProvider.tsx            # ✅ SessionProvider
│   │   └── ui/
│   │       ├── form.tsx                    # ✅ Form components
│   │       └── alert.tsx                   # ✅ Alert component
│   └── app/
│       ├── layout.tsx                      # ✅ AuthProvider intégré
│       ├── page.tsx                        # ✅ Footer discret ajouté
│       ├── 403/
│       │   └── page.tsx                    # ✅ Accès refusé
│       ├── auth/
│       │   ├── login/
│       │   │   └── page.tsx                # ✅ Page login
│       │   └── register/
│       │       └── page.tsx                # ✅ Page register
│       ├── admin/
│       │   └── dashboard/
│       │       └── page.tsx                # ✅ Dashboard admin (temp)
│       ├── coach/
│       │   └── dashboard/
│       │       └── page.tsx                # ✅ Dashboard coach (temp)
│       ├── sessions/
│       │   └── page.tsx                    # ✅ Liste sessions (temp)
│       └── api/
│           └── auth/
│               ├── [...nextauth]/
│               │   └── route.ts            # ✅ Config NextAuth
│               └── register/
│                   └── route.ts            # ✅ API inscription
```

---

## ⚠️ Points d'Attention Production

### 1. NEXTAUTH_SECRET
```bash
# Générer un secret fort en production
openssl rand -base64 32
```

### 2. NEXTAUTH_URL
```bash
# Adapter selon l'environnement
NEXTAUTH_URL="https://tribeat.app" # Production
NEXTAUTH_URL="http://localhost:3000" # Dev
```

### 3. Rate Limiting
- **À implémenter en Phase 4** : Limiter tentatives login (5 max / 15min)
- Utiliser middleware ou service externe (Upstash)

### 4. Session Refresh
- Tokens JWT se rafraîchissent automatiquement
- Max age: 30 jours (configurable)

### 5. Logs Sécurité
- Ne pas logger les passwords
- Logger les tentatives échouées
- Alerter sur accès admin

---

## 🎯 Prochaine Phase : Phase 4

**Dashboard Admin Complet :**
- Éditeur de thème (couleurs, fonts, radius)
- Gestion traductions (FR/EN/DE)
- CRUD Sessions
- Gestion utilisateurs et rôles
- Export données (CSV/JSON)
- Statistiques avancées

**Prérequis :**
- Phase 3 validée ✅
- Tests manuels OK ✅
- Aucun bug bloquant ✅

---

## ✅ Checklist Phase 3

- [x] NextAuth.js configuré avec Prisma Adapter
- [x] Middleware Edge-compatible (getToken)
- [x] Typage TypeScript strict
- [x] Utilities auth centralisées
- [x] Pages login et register
- [x] API route register (hash bcrypt)
- [x] Page 403
- [x] Footer discret admin
- [x] Dashboards temporaires (admin, coach, sessions)
- [x] AuthProvider intégré
- [x] Test IDs pour E2E
- [x] Documentation complète

---

**Status :** Phase 3 ✅ Complétée | En attente de validation pour Phase 4
