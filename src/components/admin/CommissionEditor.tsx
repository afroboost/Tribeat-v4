'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function CommissionEditor({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);

  const save = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/commission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || 'Erreur');
        return;
      }
      toast.success('Commission mise à jour');
      setValue(String(data.value));
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <label className="block text-sm font-medium mb-1">Commission (%)</label>
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="20" />
      </div>
      <Button onClick={save} disabled={isLoading}>
        {isLoading ? '...' : 'Enregistrer'}
      </Button>
    </div>
  );
}

