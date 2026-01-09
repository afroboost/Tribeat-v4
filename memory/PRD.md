# Tribeat PRD — Product Requirements Document

## Vision Produit
Plateforme de sessions live interactives où un Coach est la source maître pour la synchronisation audio/vidéo/image.

## Stack Technique
- **Framework**: Next.js 14 (App Router)
- **Database**: Prisma ORM + SQLite (dev) / PostgreSQL (prod)
- **Auth**: NextAuth.js avec Prisma Adapter
- **UI**: Tailwind CSS + Shadcn/ui
- **Paiements**: Stripe + Paystack (prévu)
- **Temps réel**: Pusher (prévu)

## Rôles Utilisateurs
- **SUPER_ADMIN**: Accès total admin, gestion paiements/accès
- **COACH**: Anime les sessions live
- **PARTICIPANT**: Participe aux sessions

---

## FONCTIONNALITÉS IMPLÉMENTÉES

### Admin Dashboard (8 sections)
- [x] Dashboard — Stats globales
- [x] Thème — Éditeur couleurs dynamique
- [x] Traductions — i18n FR/EN/DE
- [x] Sessions — CRUD sessions live
- [x] Accès — Gestion UserAccess (création, révocation)
- [x] Paiements — Transactions + Offres
- [x] Utilisateurs — Gestion rôles
- [x] Export — CSV/JSON

### Authentification
- [x] Login/Register
- [x] Middleware protection routes /admin/*
- [x] Vérification rôle dans Server Actions

### Paiements Stripe
- [x] SDK Stripe intégré
- [x] Checkout Session API
- [x] Webhook sécurisé
- [x] Création Transaction + UserAccess automatique
- [x] Mode MANUAL conservé

### Modèles Données
- [x] User, Session, SessionParticipant
- [x] Offer — Produits payants
- [x] Transaction — STRIPE/MANUAL
- [x] UserAccess — status: ACTIVE/REVOKED/EXPIRED

---

## FONCTIONNALITÉS EN ATTENTE

### P1 — Sessions Live
- [ ] Pusher temps réel (état coach → participants)
- [ ] Web Audio API hooks
- [ ] Synchronisation média

### P2 — Paiements Additionnels
- [ ] Paystack (Mobile Money Afrique)
- [ ] Mode MANUAL avec validation admin

### P3 — PWA
- [ ] Manifest dynamique
- [ ] Service Worker

---

## IDENTIFIANTS TEST

| Rôle | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | admin@tribeat.com | Admin123! |
| COACH | coach@tribeat.com | Coach123! |
| PARTICIPANT | participant@tribeat.com | Participant123! |

---

## ARCHITECTURE FICHIERS

```
/app/
├── prisma/schema.prisma — Modèles DB
├── src/
│   ├── app/
│   │   ├── admin/* — Pages admin (8)
│   │   ├── api/checkout/stripe — Stripe Checkout
│   │   ├── api/webhooks/stripe — Webhook
│   │   └── checkout/success|cancel — Pages post-paiement
│   ├── actions/ — Server Actions sécurisées
│   ├── components/admin/ — UI admin
│   ├── lib/stripe.ts — Config Stripe
│   └── middleware.ts — Protection routes
├── .env — Variables environnement
```

---

## CHANGELOG

### 2026-01-09
- Implémentation Stripe complète (Checkout + Webhook)
- Modèles Offer, Transaction, UserAccess
- Sécurisation Server Actions (requireAdmin)
- Middleware fonctionnel (redirection /admin → /auth/login)
- PaymentManager et AccessManager UI refactorisés
