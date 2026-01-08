/**
 * Theme Editor Component
 * 
 * Éditeur de thème en temps réel
 * - Modification couleurs (hex picker)
 * - Modification fonts
 * - Modification border radius
 * - Paramètres PWA
 * - Sauvegarde batch en DB
 * - Application immédiate sans refresh
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { batchUpdateUISettings } from '@/actions/ui-settings';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import type { UI_Settings, SettingCategory } from '@prisma/client';

interface ThemeEditorProps {
  initialThemeSettings: UI_Settings[];
  initialPwaSettings: UI_Settings[];
}

export function ThemeEditor({ initialThemeSettings, initialPwaSettings }: ThemeEditorProps) {
  // State pour les valeurs modifiables
  const [themeValues, setThemeValues] = useState<Record<string, string>>(
    initialThemeSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>)
  );

  const [pwaValues, setPwaValues] = useState<Record<string, string>>(
    initialPwaSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>)
  );

  const [isSaving, setIsSaving] = useState(false);

  // Update theme value
  const updateThemeValue = (key: string, value: string) => {
    setThemeValues((prev) => ({ ...prev, [key]: value }));
  };

  // Update PWA value
  const updatePwaValue = (key: string, value: string) => {
    setPwaValues((prev) => ({ ...prev, [key]: value }));
  };

  // Save all changes
  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Préparer les données pour batch update
      const themeUpdates = Object.entries(themeValues).map(([key, value]) => ({
        key,
        value,
        category: 'THEME' as SettingCategory,
      }));

      const pwaUpdates = Object.entries(pwaValues).map(([key, value]) => ({
        key,
        value,
        category: 'PWA' as SettingCategory,
      }));

      const allUpdates = [...themeUpdates, ...pwaUpdates];

      // Appel Server Action
      const result = await batchUpdateUISettings(allUpdates);

      if (result.success) {
        toast.success('Thème sauvegardé avec succès !');
        
        // Rafraîchir la page pour appliquer les changements
        window.location.reload();
      } else {
        toast.error(result.error || 'Échec de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to initial values
  const handleReset = () => {
    setThemeValues(
      initialThemeSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>)
    );
    setPwaValues(
      initialPwaSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>)
    );
    toast.info('Valeurs réinitialisées');
  };

  return (
    <div className="space-y-6">
      {/* Theme Colors */}
      <Card>
        <CardHeader>
          <CardTitle>🎨 Couleurs du Thème</CardTitle>
          <CardDescription>
            Modifiez les couleurs principales. Utilisez des codes hexadécimaux (ex: #3b82f6).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="primary_color">Couleur Primaire</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={themeValues.primary_color || '#3b82f6'}
                  onChange={(e) => updateThemeValue('primary_color', e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                  data-testid="theme-primary-color"
                />
                <Input
                  type="text"
                  value={themeValues.primary_color || '#3b82f6'}
                  onChange={(e) => updateThemeValue('primary_color', e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Secondary Color */}
            <div className="space-y-2">
              <Label htmlFor="secondary_color">Couleur Secondaire</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={themeValues.secondary_color || '#8b5cf6'}
                  onChange={(e) => updateThemeValue('secondary_color', e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                  data-testid="theme-secondary-color"
                />
                <Input
                  type="text"
                  value={themeValues.secondary_color || '#8b5cf6'}
                  onChange={(e) => updateThemeValue('secondary_color', e.target.value)}
                  placeholder="#8b5cf6"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Background Color */}
            <div className="space-y-2">
              <Label htmlFor="background_color">Couleur d'Arrière-plan</Label>
              <div className="flex gap-2">
                <Input
                  id="background_color"
                  type="color"
                  value={themeValues.background_color || '#ffffff'}
                  onChange={(e) => updateThemeValue('background_color', e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                  data-testid="theme-background-color"
                />
                <Input
                  type="text"
                  value={themeValues.background_color || '#ffffff'}
                  onChange={(e) => updateThemeValue('background_color', e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Foreground Color */}
            <div className="space-y-2">
              <Label htmlFor="foreground_color">Couleur de Texte</Label>
              <div className="flex gap-2">
                <Input
                  id="foreground_color"
                  type="color"
                  value={themeValues.foreground_color || '#0f0f10'}
                  onChange={(e) => updateThemeValue('foreground_color', e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                  data-testid="theme-foreground-color"
                />
                <Input
                  type="text"
                  value={themeValues.foreground_color || '#0f0f10'}
                  onChange={(e) => updateThemeValue('foreground_color', e.target.value)}
                  placeholder="#0f0f10"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography & Layout */}
      <Card>
        <CardHeader>
          <CardTitle>🔤 Typographie & Mise en Page</CardTitle>
          <CardDescription>
            Modifiez la police et le rayon des bordures.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Font Family */}
            <div className="space-y-2">
              <Label htmlFor="font_family">Police de Caractères</Label>
              <Input
                id="font_family"
                type="text"
                value={themeValues.font_family || 'Inter'}
                onChange={(e) => updateThemeValue('font_family', e.target.value)}
                placeholder="Inter, Arial, sans-serif"
                data-testid="theme-font-family"
              />
            </div>

            {/* Border Radius */}
            <div className="space-y-2">
              <Label htmlFor="border_radius">Rayon des Bordures (px)</Label>
              <Input
                id="border_radius"
                type="number"
                min="0"
                max="50"
                value={themeValues.border_radius || '8'}
                onChange={(e) => updateThemeValue('border_radius', e.target.value)}
                placeholder="8"
                data-testid="theme-border-radius"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PWA Settings */}
      <Card>
        <CardHeader>
          <CardTitle>📱 Paramètres PWA</CardTitle>
          <CardDescription>
            Configuration pour l'application web progressive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* App Name */}
            <div className="space-y-2">
              <Label htmlFor="pwa_app_name">Nom de l'Application</Label>
              <Input
                id="pwa_app_name"
                type="text"
                value={pwaValues.pwa_app_name || 'Tribeat'}
                onChange={(e) => updatePwaValue('pwa_app_name', e.target.value)}
                placeholder="Tribeat"
                data-testid="pwa-app-name"
              />
            </div>

            {/* Theme Color */}
            <div className="space-y-2">
              <Label htmlFor="pwa_theme_color">Couleur du Thème PWA</Label>
              <div className="flex gap-2">
                <Input
                  id="pwa_theme_color"
                  type="color"
                  value={pwaValues.pwa_theme_color || '#3b82f6'}
                  onChange={(e) => updatePwaValue('pwa_theme_color', e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                  data-testid="pwa-theme-color"
                />
                <Input
                  type="text"
                  value={pwaValues.pwa_theme_color || '#3b82f6'}
                  onChange={(e) => updatePwaValue('pwa_theme_color', e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isSaving}
          data-testid="theme-reset-button"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Réinitialiser
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          data-testid="theme-save-button"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder les Modifications
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
