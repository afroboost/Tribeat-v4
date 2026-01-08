/**
 * Translation Editor Component
 * Table éditable pour les traductions FR/EN/DE
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { upsertTranslation, deleteTranslationKey } from '@/actions/translations';
import { Loader2, Save, Trash2, Plus } from 'lucide-react';
import type { Translation, Language } from '@prisma/client';

interface TranslationEditorProps {
  initialTranslations: Translation[];
}

export function TranslationEditor({ initialTranslations }: TranslationEditorProps) {
  const [translations, setTranslations] = useState(initialTranslations);
  const [isSaving, setIsSaving] = useState(false);
  const [newKey, setNewKey] = useState('');

  // Grouper par clé
  const groupedTranslations = translations.reduce((acc, t) => {
    if (!acc[t.key]) {
      acc[t.key] = {};
    }
    acc[t.key][t.language] = t.value;
    return acc;
  }, {} as Record<string, Record<string, string>>);

  // Mettre à jour une traduction
  const handleUpdate = async (key: string, language: Language, value: string) => {
    try {
      const result = await upsertTranslation({ key, language, value });
      if (result.success) {
        toast.success('Traduction mise à jour');
        // Mise à jour locale
        setTranslations(prev =>
          prev.map(t => (t.key === key && t.language === language ? { ...t, value } : t))
        );
      } else {
        toast.error(result.error || 'Échec');
      }
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // Ajouter une nouvelle clé
  const handleAddKey = async () => {
    if (!newKey.trim()) {
      toast.error('Entrez une clé');
      return;
    }

    setIsSaving(true);
    try {
      // Créer pour les 3 langues
      const languages: Language[] = ['FR', 'EN', 'DE'];
      for (const lang of languages) {
        await upsertTranslation({
          key: newKey,
          language: lang,
          value: `[${lang}] ${newKey}`,
        });
      }
      toast.success('Clé ajoutée');
      setNewKey('');
      window.location.reload();
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setIsSaving(false);
    }
  };

  // Supprimer une clé
  const handleDelete = async (key: string) => {
    if (!confirm(`Supprimer la clé "${key}" ?`)) return;

    try {
      const result = await deleteTranslationKey(key);
      if (result.success) {
        toast.success('Clé supprimée');
        setTranslations(prev => prev.filter(t => t.key !== key));
      } else {
        toast.error(result.error || 'Échec');
      }
    } catch (error) {
      toast.error('Erreur');
    }
  };

  return (
    <div className="space-y-6">
      {/* Ajouter une clé */}
      <Card>
        <CardHeader>
          <CardTitle>Ajouter une Clé</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Ex: session.new_button"
              data-testid="translation-new-key"
            />
            <Button onClick={handleAddKey} disabled={isSaving}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table des traductions */}
      <Card>
        <CardHeader>
          <CardTitle>Traductions Existantes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(groupedTranslations).map(([key, langs]) => (
              <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{key}</h3>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  {(['FR', 'EN', 'DE'] as Language[]).map((lang) => (
                    <div key={lang}>
                      <label className="text-xs text-gray-500 mb-1 block">{lang}</label>
                      <Input
                        defaultValue={langs[lang] || ''}
                        onBlur={(e) => handleUpdate(key, lang, e.target.value)}
                        placeholder={`Traduction ${lang}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
