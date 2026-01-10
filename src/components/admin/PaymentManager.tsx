'use client';

/**
 * PaymentManager Component
 * Gestion des paiements avec Offers et Transactions
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  createManualTransaction, 
  updateTransactionStatus, 
  deleteTransaction,
  validateManualTransaction
} from '@/actions/payments';
import { createOffer, deleteOffer } from '@/actions/offers';
import { Trash2, Plus, CreditCard, CheckCircle, XCircle, Clock, DollarSign, Package } from 'lucide-react';

interface Transaction {
  id: string;
  userId: string;
  offerId: string | null;
  amount: number;
  currency: string;
  provider: string;
  providerTxId: string | null;
  status: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  offer?: { id: string; name: string } | null;
  userAccess?: { id: string; status: string } | null;
}

interface Stats {
  totalAmount: number;
  pending: number;
  completed: number;
  failed: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface PaymentManagerProps {
  transactions: Transaction[];
  stats: Stats;
  users: User[];
  stripeEnabled: boolean;
}

export function PaymentManager({ transactions: initialTransactions, stats, users, stripeEnabled }: PaymentManagerProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [offerName, setOfferName] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Créer une transaction manuelle
  const handleCreateManual = async () => {
    if (!selectedUser || !amount) {
      toast.error('Sélectionnez un utilisateur et un montant');
      return;
    }

    setIsLoading(true);
    const result = await createManualTransaction(
      selectedUser, 
      parseFloat(amount), 
      'CHF',
      undefined,
      { description }
    );
    setIsLoading(false);

    if (result.success) {
      toast.success('Transaction manuelle créée (PENDING)');
      window.location.reload();
    } else {
      toast.error(result.error || 'Erreur');
    }
  };

  // Valider une transaction manuelle
  const handleValidate = async (id: string) => {
    if (!confirm('Valider cette transaction et créer l\'accès ?')) return;

    setIsLoading(true);
    const result = await validateManualTransaction(id);
    setIsLoading(false);

    if (result.success) {
      toast.success('Transaction validée, accès créé');
      window.location.reload();
    } else {
      toast.error(result.error || 'Erreur');
    }
  };

  // Mettre à jour le statut
  const handleStatusUpdate = async (id: string, status: string) => {
    setIsLoading(true);
    const result = await updateTransactionStatus(id, status as any);
    setIsLoading(false);

    if (result.success) {
      toast.success('Statut mis à jour');
      setTransactions(transactions.map(t => 
        t.id === id ? { ...t, status } : t
      ));
    } else {
      toast.error(result.error || 'Erreur');
    }
  };

  // Supprimer une transaction
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette transaction ?')) return;

    setIsLoading(true);
    const result = await deleteTransaction(id);
    setIsLoading(false);

    if (result.success) {
      toast.success('Transaction supprimée');
      setTransactions(transactions.filter(t => t.id !== id));
    } else {
      toast.error(result.error || 'Erreur');
    }
  };

  // Créer une offre
  const handleCreateOffer = async () => {
    if (!offerName || !offerPrice) {
      toast.error('Nom et prix requis');
      return;
    }

    setIsLoading(true);
    const result = await createOffer(offerName, parseFloat(offerPrice), 'CHF', offerDescription);
    setIsLoading(false);

    if (result.success) {
      toast.success('Offre créée');
      setShowOfferForm(false);
      setOfferName('');
      setOfferPrice('');
      setOfferDescription('');
    } else {
      toast.error(result.error || 'Erreur');
    }
  };

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    COMPLETED: { label: 'Complété', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    FAILED: { label: 'Échoué', color: 'bg-red-100 text-red-800', icon: XCircle },
    REFUNDED: { label: 'Remboursé', color: 'bg-gray-100 text-gray-800', icon: DollarSign },
  };

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalAmount.toFixed(2)} CHF</div>
            <p className="text-sm text-gray-500">Total des transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-sm text-gray-500">En attente validation</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-sm text-gray-500">Complétées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-sm text-gray-500">Échouées</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setShowOfferForm(!showOfferForm)}>
          <Package className="w-4 h-4 mr-2" />
          Nouvelle offre
        </Button>
        <Button onClick={() => setShowAddForm(!showAddForm)} data-testid="add-payment-button">
          <Plus className="w-4 h-4 mr-2" />
          Transaction manuelle
        </Button>
      </div>

      {/* Formulaire Offre */}
      {showOfferForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Créer une offre
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom de l'offre</label>
                <Input
                  value={offerName}
                  onChange={(e) => setOfferName(e.target.value)}
                  placeholder="Accès Session Premium"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prix (CHF)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  placeholder="29.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={offerDescription}
                onChange={(e) => setOfferDescription(e.target.value)}
                placeholder="Description de l'offre..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateOffer} disabled={isLoading}>
                {isLoading ? 'Création...' : 'Créer l\'offre'}
              </Button>
              <Button variant="outline" onClick={() => setShowOfferForm(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulaire Transaction Manuelle */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction manuelle (validation admin requise)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Utilisateur</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  data-testid="payment-user-select"
                >
                  <option value="">Sélectionner...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Montant (CHF)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10.00"
                  data-testid="payment-amount-input"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description / Raison</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Virement reçu, cash, etc."
                data-testid="payment-description-input"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateManual} disabled={isLoading} data-testid="confirm-payment">
                {isLoading ? 'Création...' : 'Créer (PENDING)'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Transactions ({transactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune transaction</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Utilisateur</th>
                    <th className="text-left p-3 font-medium">Offre</th>
                    <th className="text-left p-3 font-medium">Montant</th>
                    <th className="text-left p-3 font-medium">Provider</th>
                    <th className="text-left p-3 font-medium">Statut</th>
                    <th className="text-left p-3 font-medium">Accès</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const status = statusConfig[tx.status] || statusConfig.PENDING;
                    return (
                      <tr key={tx.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <p className="font-medium">{tx.user.name}</p>
                          <p className="text-sm text-gray-500">{tx.user.email}</p>
                        </td>
                        <td className="p-3">
                          {tx.offer ? (
                            <Badge variant="outline">{tx.offer.name}</Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3 font-mono">
                          {(tx.amount / 100).toFixed(2)} {tx.currency}
                        </td>
                        <td className="p-3">
                          <Badge variant={tx.provider === 'STRIPE' ? 'default' : 'secondary'}>
                            {tx.provider}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-sm ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="p-3">
                          {tx.userAccess ? (
                            <Badge variant={tx.userAccess.status === 'ACTIVE' ? 'default' : 'secondary'}>
                              {tx.userAccess.status}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">Aucun</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-500">
                          {new Date(tx.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          {tx.status === 'PENDING' && tx.provider === 'MANUAL' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleValidate(tx.id)}
                              className="text-green-600"
                              title="Valider et créer l'accès"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tx.id)}
                            className="text-red-600"
                            data-testid={`delete-tx-${tx.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note Stripe */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          {stripeEnabled ? (
            <>
              <h4 className="font-semibold text-blue-800">✅ Stripe configuré</h4>
              <p className="text-sm text-blue-700 mt-1">
                Stripe est activé. Les routes API Stripe sont disponibles.
              </p>
            </>
          ) : (
            <>
              <h4 className="font-semibold text-blue-800">ℹ️ Stripe non configuré</h4>
              <p className="text-sm text-blue-700 mt-1">
                Stripe est désactivé (feature flag ou clés manquantes). Les paiements Stripe sont indisponibles, sans impacter les transactions manuelles.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
