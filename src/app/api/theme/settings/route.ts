/**
 * API Route - Theme Settings
 * 
 * Retourne les UI_Settings pour injection dynamique du thème
 * Public (pas de auth requise pour le thème)
 * Cache Next.js pour performance
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 60; // Cache 60 secondes
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Récupérer tous les UI_Settings
    const settings = await prisma.uI_Settings.findMany();

    // Convertir en objet key-value
    const themeSettings = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    // Retour JSON
    return NextResponse.json(themeSettings, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    // Fallback : valeurs par défaut
    return NextResponse.json({
      primary_color: '#3b82f6',
      secondary_color: '#8b5cf6',
      background_color: '#ffffff',
      foreground_color: '#0f0f10',
      border_radius: '8',
      font_family: 'Inter',
      pwa_app_name: 'Tribeat',
      pwa_theme_color: '#3b82f6',
      site_title: 'Tribeat - Sessions Live',
      default_language: 'FR',
    });
  }
}
