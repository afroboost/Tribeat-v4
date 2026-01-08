import { PrismaClient, UserRole, SettingCategory, Language } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding de la base de données...');

  // ========================================
  // 1. UI_SETTINGS - THÈME PAR DÉFAUT
  // ========================================
  console.log('📐 Création des paramètres UI (Thème)...');

  const themeSettings = [
    { key: 'primary_color', value: '#3b82f6', category: 'THEME' },
    { key: 'secondary_color', value: '#8b5cf6', category: 'THEME' },
    { key: 'background_color', value: '#ffffff', category: 'THEME' },
    { key: 'foreground_color', value: '#0f0f10', category: 'THEME' },
    { key: 'border_radius', value: '8', category: 'THEME' },
    { key: 'font_family', value: 'Inter', category: 'THEME' },
  ];

  for (const setting of themeSettings) {
    await prisma.uI_Settings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: {
        key: setting.key,
        value: setting.value,
        category: setting.category as SettingCategory,
      },
    });
  }

  // ========================================
  // 2. UI_SETTINGS - PWA
  // ========================================
  console.log('📱 Création des paramètres PWA...');

  const pwaSettings = [
    { key: 'pwa_app_name', value: 'Tribeat', category: 'PWA' },
    { key: 'pwa_app_short_name', value: 'Tribeat', category: 'PWA' },
    { key: 'pwa_app_description', value: 'Sessions Live Interactives', category: 'PWA' },
    { key: 'pwa_theme_color', value: '#3b82f6', category: 'PWA' },
    { key: 'pwa_background_color', value: '#ffffff', category: 'PWA' },
    { key: 'pwa_icon_url', value: '/icon.png', category: 'PWA' },
  ];

  for (const setting of pwaSettings) {
    await prisma.uI_Settings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: {
        key: setting.key,
        value: setting.value,
        category: setting.category as SettingCategory,
      },
    });
  }

  // ========================================
  // 3. UI_SETTINGS - GÉNÉRAL
  // ========================================
  console.log('⚙️ Création des paramètres généraux...');

  const generalSettings = [
    { key: 'site_title', value: 'Tribeat - Sessions Live', category: 'GENERAL' },
    { key: 'default_language', value: 'FR', category: 'GENERAL' },
    { key: 'max_session_participants', value: '50', category: 'GENERAL' },
    { key: 'enable_registration', value: 'true', category: 'GENERAL' },
  ];

  for (const setting of generalSettings) {
    await prisma.uI_Settings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: {
        key: setting.key,
        value: setting.value,
        category: setting.category as SettingCategory,
      },
    });
  }

  // ========================================
  // 4. TRANSLATIONS - FR / EN / DE
  // ========================================
  console.log('🌍 Création des traductions (FR/EN/DE)...');

  const translations = [
    // Sessions
    { key: 'session.join_button', language: 'FR', value: 'Rejoindre' },
    { key: 'session.join_button', language: 'EN', value: 'Join' },
    { key: 'session.join_button', language: 'DE', value: 'Beitreten' },

    { key: 'session.leave_button', language: 'FR', value: 'Quitter' },
    { key: 'session.leave_button', language: 'EN', value: 'Leave' },
    { key: 'session.leave_button', language: 'DE', value: 'Verlassen' },

    { key: 'session.live_now', language: 'FR', value: 'En direct' },
    { key: 'session.live_now', language: 'EN', value: 'Live now' },
    { key: 'session.live_now', language: 'DE', value: 'Live jetzt' },

    // Chat
    { key: 'chat.placeholder', language: 'FR', value: 'Écrire un message...' },
    { key: 'chat.placeholder', language: 'EN', value: 'Write a message...' },
    { key: 'chat.placeholder', language: 'DE', value: 'Schreiben Sie eine Nachricht...' },

    { key: 'chat.send_button', language: 'FR', value: 'Envoyer' },
    { key: 'chat.send_button', language: 'EN', value: 'Send' },
    { key: 'chat.send_button', language: 'DE', value: 'Senden' },

    // Auth
    { key: 'auth.login', language: 'FR', value: 'Se connecter' },
    { key: 'auth.login', language: 'EN', value: 'Login' },
    { key: 'auth.login', language: 'DE', value: 'Anmelden' },

    { key: 'auth.register', language: 'FR', value: "S'inscrire" },
    { key: 'auth.register', language: 'EN', value: 'Register' },
    { key: 'auth.register', language: 'DE', value: 'Registrieren' },

    { key: 'auth.logout', language: 'FR', value: 'Se déconnecter' },
    { key: 'auth.logout', language: 'EN', value: 'Logout' },
    { key: 'auth.logout', language: 'DE', value: 'Abmelden' },

    { key: 'auth.email', language: 'FR', value: 'Email' },
    { key: 'auth.email', language: 'EN', value: 'Email' },
    { key: 'auth.email', language: 'DE', value: 'E-Mail' },

    { key: 'auth.password', language: 'FR', value: 'Mot de passe' },
    { key: 'auth.password', language: 'EN', value: 'Password' },
    { key: 'auth.password', language: 'DE', value: 'Passwort' },

    // Admin
    { key: 'admin.dashboard', language: 'FR', value: 'Tableau de bord' },
    { key: 'admin.dashboard', language: 'EN', value: 'Dashboard' },
    { key: 'admin.dashboard', language: 'DE', value: 'Dashboard' },

    { key: 'admin.users', language: 'FR', value: 'Utilisateurs' },
    { key: 'admin.users', language: 'EN', value: 'Users' },
    { key: 'admin.users', language: 'DE', value: 'Benutzer' },

    { key: 'admin.sessions', language: 'FR', value: 'Sessions' },
    { key: 'admin.sessions', language: 'EN', value: 'Sessions' },
    { key: 'admin.sessions', language: 'DE', value: 'Sitzungen' },

    { key: 'admin.settings', language: 'FR', value: 'Paramètres' },
    { key: 'admin.settings', language: 'EN', value: 'Settings' },
    { key: 'admin.settings', language: 'DE', value: 'Einstellungen' },

    // Common
    { key: 'common.save', language: 'FR', value: 'Enregistrer' },
    { key: 'common.save', language: 'EN', value: 'Save' },
    { key: 'common.save', language: 'DE', value: 'Speichern' },

    { key: 'common.cancel', language: 'FR', value: 'Annuler' },
    { key: 'common.cancel', language: 'EN', value: 'Cancel' },
    { key: 'common.cancel', language: 'DE', value: 'Abbrechen' },

    { key: 'common.delete', language: 'FR', value: 'Supprimer' },
    { key: 'common.delete', language: 'EN', value: 'Delete' },
    { key: 'common.delete', language: 'DE', value: 'Löschen' },

    { key: 'common.edit', language: 'FR', value: 'Modifier' },
    { key: 'common.edit', language: 'EN', value: 'Edit' },
    { key: 'common.edit', language: 'DE', value: 'Bearbeiten' },
  ];

  for (const translation of translations) {
    await prisma.translation.upsert({
      where: {
        key_language: {
          key: translation.key,
          language: translation.language as Language,
        },
      },
      update: { value: translation.value },
      create: {
        key: translation.key,
        language: translation.language as Language,
        value: translation.value,
      },
    });
  }

  // ========================================
  // 5. UTILISATEUR SUPER_ADMIN
  // ========================================
  console.log('👤 Création du Super Admin...');

  const adminPassword = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@tribeat.com' },
    update: {},
    create: {
      email: 'admin@tribeat.com',
      name: 'Super Admin',
      password: adminPassword,
      role: UserRole.SUPER_ADMIN,
    },
  });

  console.log('✅ Super Admin créé:', admin.email);

  // ========================================
  // 6. UTILISATEURS DE DÉMONSTRATION (OPTIONNEL)
  // ========================================
  console.log('👥 Création d\'utilisateurs de démonstration...');

  const demoPassword = await bcrypt.hash('Demo123!', 10);

  const coach = await prisma.user.upsert({
    where: { email: 'coach@tribeat.com' },
    update: {},
    create: {
      email: 'coach@tribeat.com',
      name: 'Coach Demo',
      password: demoPassword,
      role: UserRole.COACH,
    },
  });

  const participant = await prisma.user.upsert({
    where: { email: 'participant@tribeat.com' },
    update: {},
    create: {
      email: 'participant@tribeat.com',
      name: 'Participant Demo',
      password: demoPassword,
      role: UserRole.PARTICIPANT,
    },
  });

  console.log('✅ Utilisateurs de démo créés:', coach.email, participant.email);

  // ========================================
  // 7. SESSION DE DÉMONSTRATION (OPTIONNEL)
  // ========================================
  console.log('🎥 Création d\'une session de démonstration...');

  const demoSession = await prisma.session.upsert({
    where: { id: 'demo-session-1' },
    update: {},
    create: {
      id: 'demo-session-1',
      title: 'Session de Démonstration',
      description: 'Première session live Tribeat pour tester les fonctionnalités',
      coachId: coach.id,
      mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      mediaType: 'VIDEO',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain
      status: 'SCHEDULED',
      maxParticipants: 50,
      isPublic: true,
    },
  });

  console.log('✅ Session de démo créée:', demoSession.id);

  console.log('\n🎉 Seeding terminé avec succès !');
  console.log('\n📊 Résumé:');
  console.log(`  - UI_Settings: ${themeSettings.length + pwaSettings.length + generalSettings.length} entrées`);
  console.log(`  - Translations: ${translations.length} entrées`);
  console.log(`  - Users: 3 (1 admin, 1 coach, 1 participant)`);
  console.log(`  - Sessions: 1 session de démo`);
  console.log('\n🔑 Credentials Admin:');
  console.log('  Email: admin@tribeat.com');
  console.log('  Password: Admin123!');
  console.log('\n🔑 Credentials Demo (Coach & Participant):');
  console.log('  Email: coach@tribeat.com / participant@tribeat.com');
  console.log('  Password: Demo123!');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
