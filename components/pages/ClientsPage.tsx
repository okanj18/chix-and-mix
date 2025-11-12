

import React, { useState, useMemo } from 'react';
import { useAminaShop } from '../../context/AminaShopContext';
import { Client } from '../../types';
import { Card, Button, Input, Modal, useSortableData, SortableHeader, Textarea } from '../ui/Shared';
import { PlusIcon, EyeIcon, StarIcon, ChatBubbleLeftRightIcon, SparklesIcon, ClipboardDocumentIcon, DocumentArrowDownIcon } from '../icons';
import { GoogleGenAI } from "@google/genai";

const ClientForm: React.FC<{ client?: Client; onClose: () => void }> = ({ client, onClose }) => {
  const { actions } = useAminaShop();
  const [formData, setFormData] = useState<Omit<Client, 'id'>>({
    firstName: client?.firstName || '',
    lastName: client?.lastName || '',
    phone: client?.phone || '',
    email: client?.email || '',
    address: client?.address || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (client) {
      actions.updateClient({ ...formData, id: client.id });
    } else {
      actions.addClient(formData);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Prénom" name="firstName" value={formData.firstName} onChange={handleChange} required />
        <Input label="Nom" name="lastName" value={formData.lastName} onChange={handleChange} required />
        <Input label="Téléphone" name="phone" value={formData.phone} onChange={handleChange} required />
        <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
        <Input label="Adresse" name="address" value={formData.address} onChange={handleChange} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
        <Button type="submit">{client ? 'Mettre à jour' : 'Ajouter Client'}</Button>
      </div>
    </form>
  );
};

interface ClientsPageProps {
  filter: 'all' | 'debt';
  setFilter: (filter: 'all' | 'debt') => void;
}

type LoyaltyStatus = 'Bronze' | 'Argent' | 'Or';

type ClientWithDetails = Client & {
    debt: number;
    totalDueAmount: number;
    paymentsOnDebt: number;
    orderCount: number;
    fullName: string;
    totalSpent: number;
    loyaltyStatus: LoyaltyStatus;
    favoriteProducts: { productId: string; name: string; quantity: number }[];
};

export const ClientsPage: React.FC<ClientsPageProps> = ({ filter, setFilter }) => {
  const { state } = useAminaShop();
  const { clients, orders } = state;
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithDetails | undefined>(undefined);

  const clientsWithDetails = useMemo(() =>
    clients.map(client => {
      const allClientOrders = orders.filter(o => o.clientId === client.id);
      const activeClientOrders = allClientOrders.filter(o => !o.isArchived);
      const unpaidOrders = activeClientOrders.filter(o => o.paymentStatus !== 'Payé');
      
      const remainingDebt = unpaidOrders.reduce((sum, order) => sum + (Number(order.total || 0) - Number(order.paidAmount || 0)), 0);
      const totalDueAmount = unpaidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const paymentsOnDebt = totalDueAmount - remainingDebt;
      
      const totalSpent = allClientOrders.reduce((sum, order) => sum + Number(order.paidAmount || 0), 0);
    
      let loyaltyStatus: LoyaltyStatus = 'Bronze';
      if (totalSpent > 500000) {
        loyaltyStatus = 'Or';
      } else if (totalSpent > 100000) {
        loyaltyStatus = 'Argent';
      }

      const productCounts = allClientOrders
          .flatMap(o => o.items || [])
          .reduce((acc, item) => {
              acc[item.productId] = (acc[item.productId] || 0) + Number(item.quantity);
              return acc;
          }, {} as Record<string, number>);

      const favoriteProducts = Object.entries(productCounts)
          .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
          .slice(0, 5)
          .map(([productId, quantity]) => ({
              productId,
              name: state.products.find(p => p.id === productId)?.name || 'Produit inconnu',
              quantity,
          }));

      return {
        ...client,
        fullName: `${client.firstName} ${client.lastName}`,
        debt: remainingDebt,
        totalDueAmount,
        paymentsOnDebt,
        orderCount: allClientOrders.length,
        totalSpent,
        loyaltyStatus,
        favoriteProducts,
      };
    }),
  [clients, orders, state.products]);

  const filteredClients = useMemo(() => {
    let tempClients = clientsWithDetails;

    if (filter === 'debt') {
      tempClients = tempClients.filter(c => c.debt > 0);
    }
    
    if (searchTerm) {
        tempClients = tempClients.filter(c =>
            c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    return tempClients;
  }, [clientsWithDetails, searchTerm, filter]);

  const { items: sortedClients, requestSort, sortConfig } = useSortableData(filteredClients, { key: 'debt', direction: 'descending' });

  const handleAddClient = () => {
    setSelectedClient(undefined);
    setIsModalOpen(true);
  };

  const handleEditClient = (client: ClientWithDetails) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };
  
  const handleViewDetails = (client: ClientWithDetails) => {
    setSelectedClient(client);
    setDetailModalOpen(true);
  };

  return (
    <Card>
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-serif font-black text-gray-800 shrink-0">Gestion des Clients</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <div className="flex items-center p-1 bg-gray-100 rounded-lg">
              <Button size="sm" variant={filter === 'all' ? 'primary' : 'secondary'} onClick={() => setFilter('all')} className={`${filter === 'all' ? 'shadow-sm' : '!shadow-none'} w-1/2`}>Tous</Button>
              <Button size="sm" variant={filter === 'debt' ? 'primary' : 'secondary'} onClick={() => setFilter('debt')} className={`${filter === 'debt' ? 'shadow-sm' : '!shadow-none'} w-1/2`}>Avec Crédits</Button>
          </div>
          <Input label="" id="search" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Button onClick={handleAddClient} size="md" className="whitespace-nowrap"><PlusIcon className="w-4 h-4 mr-1"/>Ajouter</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader sortKey="fullName" title="Nom" sortConfig={sortConfig} requestSort={requestSort} />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Téléphone</th>
              <SortableHeader sortKey="totalDueAmount" title="Montant Total Dû" sortConfig={sortConfig} requestSort={requestSort} className="hidden md:table-cell" />
              <SortableHeader sortKey="paymentsOnDebt" title="Versements" sortConfig={sortConfig} requestSort={requestSort} className="hidden md:table-cell" />
              <SortableHeader sortKey="debt" title="Solde Restant Dû" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader sortKey="orderCount" title="Nb. Commandes" sortConfig={sortConfig} requestSort={requestSort} className="hidden sm:table-cell" />
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedClients.map(client => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.fullName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{client.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{client.totalDueAmount > 0 ? `${client.totalDueAmount.toLocaleString()} FCFA` : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 hidden md:table-cell">{client.paymentsOnDebt > 0 ? `${client.paymentsOnDebt.toLocaleString()} FCFA` : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">{client.debt > 0 ? `${client.debt.toLocaleString()} FCFA` : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{client.orderCount}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleViewDetails(client)} className="text-gray-500 hover:text-gray-800 p-2 rounded-full inline-flex items-center justify-center" title="Voir les détails">
                    <EyeIcon />
                  </button>
                  <button onClick={() => handleEditClient(client)} className="text-primary-600 hover:text-primary-900 ml-2">Éditer</button>
                </td>
              </tr>
            ))}
             {sortedClients.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  {filter === 'debt' ? "Aucun client avec un solde impayé." : "Aucun client ne correspond à votre recherche."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedClient ? 'Éditer le Client' : 'Ajouter un Client'}>
        <ClientForm client={selectedClient} onClose={() => setIsModalOpen(false)} />
      </Modal>

      <Modal isOpen={isDetailModalOpen} onClose={() => setDetailModalOpen(false)} title={`Détails de ${selectedClient?.firstName} ${selectedClient?.lastName}`} contentClassName="max-w-4xl">
        {selectedClient && <ClientDetailView client={selectedClient} />}
      </Modal>
    </Card>
  );
};


const ClientDetailView: React.FC<{ client: ClientWithDetails }> = ({ client }) => {
    const { state } = useAminaShop();
    const { orders } = state;
    const [activeTab, setActiveTab] = useState('summary');

    const [generatedMessage, setGeneratedMessage] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingType, setGeneratingType] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    const handleGenerateSummary = () => {
        const lastOrder = orders
            .filter(o => o.clientId === client.id && !o.isArchived)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        let summaryText = `*** RÉSUMÉ CLIENT - CHIC & MIX ***\n\n`;
        summaryText += `Date de génération: ${new Date().toLocaleString('fr-FR')}\n`;
        summaryText += `------------------------------------\n\n`;
        summaryText += `CLIENT\n`;
        summaryText += `Nom: ${client.firstName} ${client.lastName}\n`;
        summaryText += `Téléphone: ${client.phone || 'N/A'}\n`;
        summaryText += `Email: ${client.email || 'N/A'}\n\n`;
        summaryText += `SITUATION FINANCIÈRE\n`;
        summaryText += `Solde total dû: ${client.debt.toLocaleString()} FCFA\n\n`;
        summaryText += `ACTIVITÉ RÉCENTE\n`;
        if (lastOrder) {
            summaryText += `Dernière commande: ${new Date(lastOrder.date).toLocaleDateString('fr-FR')}\n`;
            summaryText += `Montant dernière commande: ${Number(lastOrder.total || 0).toLocaleString()} FCFA\n`;
            summaryText += `Statut paiement: ${lastOrder.paymentStatus}\n`;
        } else {
            summaryText += `Dernière commande: Aucune commande enregistrée\n`;
        }
        summaryText += `\n------------------------------------\n`;
        summaryText += `Rapport généré par l'application de gestion CHIC & MIX.`;

        const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Resume_Client_${client.firstName}_${client.lastName}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    const handleGenerateMessage = async (type: 'reminder' | 'thanks' | 'promo') => {
        setGeneratingType(type);
        setIsGenerating(true);
        setGeneratedMessage('');
        try {
            if (!process.env.API_KEY) throw new Error("API key non configurée.");

            let prompt = '';
            switch (type) {
                case 'reminder':
                    prompt = `Rédige un SMS de rappel de paiement court, amical mais professionnel pour un client de ma boutique de mode CHIC & MIX. Le ton doit être respectueux. Informations: Nom du client: ${client.firstName}, Montant dû: ${client.debt.toLocaleString()} FCFA.`;
                    break;
                case 'thanks':
                    prompt = `Rédige un court SMS de remerciement chaleureux pour un client fidèle de ma boutique CHIC & MIX. Nom du client: ${client.firstName}. Mentionne que nous apprécions sa fidélité et que nous espérons le revoir bientôt.`;
                    break;
                case 'promo':
                    const favoriteProduct = client.favoriteProducts?.[0]?.name || 'nos nouveautés';
                    prompt = `Rédige un court SMS marketing pour proposer une offre spéciale à un client de ma boutique CHIC & MIX. Nom du client: ${client.firstName}. Suggère-lui qu'il pourrait aimer nos nouveautés, surtout qu'il a déjà acheté "${favoriteProduct}". Propose-lui une petite réduction de 15% sur sa prochaine visite.`;
                    break;
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            const text = response.text;
            if (text) {
                setGeneratedMessage(text);
            } else {
                throw new Error("La réponse de l'IA est vide.");
            }
        } catch (error) {
            console.error("Erreur de génération de message:", error);
            setGeneratedMessage("Désolé, une erreur est survenue lors de la génération du message.");
        } finally {
            setIsGenerating(false);
            setGeneratingType(null);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedMessage);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void, icon?: React.ReactNode }> = ({ label, active, onClick, icon }) => (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 focus:outline-none ${
                active
                    ? 'bg-white border-gray-200 border-t border-l border-r -mb-px text-primary-600'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-500'
            }`}
        >
            {icon} {label}
        </button>
    );
    
    return (
        <div>
            <div className="flex border-b">
                <TabButton label="Synthèse & Dettes" active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
                <TabButton label="Historique d'Achats" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
                <TabButton label="Statistiques & Fidélité" active={activeTab === 'loyalty'} onClick={() => setActiveTab('loyalty')} />
                <TabButton label="Communication IA" icon={<ChatBubbleLeftRightIcon className="w-4 h-4"/>} active={activeTab === 'ai_comm'} onClick={() => setActiveTab('ai_comm')} />
            </div>
            <div className="pt-6">
                {activeTab === 'summary' && (
                    <div className="space-y-6">
                        <div>
                             <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-800 mb-2">{client.firstName} {client.lastName}</h3>
                                    <p className="text-sm text-gray-600"><strong>Téléphone:</strong> {client.phone}</p>
                                    <p className="text-sm text-gray-600"><strong>Email:</strong> {client.email || 'N/A'}</p>
                                    <p className="text-sm text-gray-600"><strong>Adresse:</strong> {client.address || 'N/A'}</p>
                                </div>
                                <Button variant="secondary" size="sm" onClick={handleGenerateSummary}>
                                    <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                                    Générer Résumé
                                </Button>
                            </div>
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                                <p className="text-sm font-medium text-red-800">SOLDE TOTAL DÛ</p>
                                <p className="text-3xl font-bold text-red-600">{client.debt.toLocaleString()} FCFA</p>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-800 mb-2">Détail des commandes impayées</h4>
                            {client.debt > 0 ? (
                                <div className="overflow-x-auto border rounded-lg max-h-60">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Payé</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Solde</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {orders.filter(o => o.clientId === client.id && o.paymentStatus !== 'Payé' && !o.isArchived).map(order => (
                                                <tr key={order.id}>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-mono text-gray-500">{order.id.substring(order.id.length - 6)}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{new Date(order.date).toLocaleDateString()}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 text-right">{(Number(order.total) || 0).toLocaleString()} FCFA</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600 text-right">{(Number(order.paidAmount) || 0).toLocaleString()} FCFA</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-red-600 text-right">{(Number(order.total || 0) - Number(order.paidAmount || 0)).toLocaleString()} FCFA</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-6 bg-gray-50 rounded-md">
                                    <p className="text-sm text-gray-500">Aucune commande impayée pour ce client.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'history' && (
                     <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Historique de toutes les commandes</h4>
                        <div className="overflow-x-auto border rounded-lg max-h-96">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Paiement</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Livraison</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {orders.filter(o => o.clientId === client.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(order => (
                                        <tr key={order.id} className={`${order.isArchived ? 'bg-gray-100 opacity-60' : ''}`}>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-mono text-gray-500">{order.id.substring(order.id.length - 6)}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{new Date(order.date).toLocaleString()}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 text-right">{(Number(order.total) || 0).toLocaleString()} FCFA</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-center">{order.paymentStatus}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-center">{order.deliveryStatus}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'loyalty' && (() => {
                    const loyaltyColors: Record<LoyaltyStatus, string> = { 'Bronze': 'text-yellow-700', 'Argent': 'text-gray-500', 'Or': 'text-yellow-500' };
                    const loyaltyBg: Record<LoyaltyStatus, string> = { 'Bronze': 'bg-yellow-100', 'Argent': 'bg-gray-100', 'Or': 'bg-yellow-100' };

                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <div className={`p-4 rounded-lg flex items-center gap-4 ${loyaltyBg[client.loyaltyStatus]}`}>
                                    <StarIcon className={`w-10 h-10 flex-shrink-0 ${loyaltyColors[client.loyaltyStatus]}`} />
                                    <div>
                                        <p className="text-sm text-gray-600">Statut de fidélité</p>
                                        <p className={`text-2xl font-bold ${loyaltyColors[client.loyaltyStatus]}`}>Client {client.loyaltyStatus}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                                        <p className="text-sm text-gray-600">Total Dépensé</p>
                                        <p className="text-xl font-bold text-gray-800">{client.totalSpent.toLocaleString()} FCFA</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                                        <p className="text-sm text-gray-600">Commandes Totales</p>
                                        <p className="text-xl font-bold text-gray-800">{client.orderCount}</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2">Articles Préférés</h4>
                                {client.favoriteProducts.length > 0 ? (
                                    <ul className="list-decimal list-inside bg-gray-50 p-4 rounded-md text-sm space-y-2">
                                        {client.favoriteProducts.map(p => (
                                            <li key={p.productId} className="flex justify-between">
                                                <span>{p.name}</span>
                                                <span className="font-semibold bg-white px-2 py-0.5 rounded-full text-xs">{p.quantity} unités</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="text-center py-6 bg-gray-50 rounded-md">
                                        <p className="text-sm text-gray-500">Aucun achat enregistré pour ce client.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}
                {activeTab === 'ai_comm' && (
                     <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" onClick={() => handleGenerateMessage('reminder')} disabled={isGenerating || client.debt <= 0} title={client.debt <= 0 ? "Le client n'a pas de dette" : ''}>
                                <SparklesIcon className={`w-4 h-4 mr-1 ${isGenerating && generatingType === 'reminder' ? 'animate-spin' : ''}`} />
                                Rappel de Paiement
                            </Button>
                             <Button variant="secondary" onClick={() => handleGenerateMessage('thanks')} disabled={isGenerating}>
                                <SparklesIcon className={`w-4 h-4 mr-1 ${isGenerating && generatingType === 'thanks' ? 'animate-spin' : ''}`} />
                                Remerciement
                            </Button>
                             <Button variant="secondary" onClick={() => handleGenerateMessage('promo')} disabled={isGenerating || client.favoriteProducts.length === 0} title={client.favoriteProducts.length === 0 ? "Aucun historique d'achat pour suggérer une promo" : ''}>
                                <SparklesIcon className={`w-4 h-4 mr-1 ${isGenerating && generatingType === 'promo' ? 'animate-spin' : ''}`} />
                                Offre Spéciale
                            </Button>
                        </div>
                        <div className="relative">
                            <Textarea 
                                label="Message Suggéré"
                                value={isGenerating ? "Génération en cours..." : generatedMessage}
                                readOnly
                                rows={5}
                                className="bg-gray-50"
                            />
                            {generatedMessage && !isGenerating && (
                                <div className="absolute top-8 right-2">
                                    <Button size="sm" variant="secondary" onClick={handleCopy}>
                                        <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
                                        {copySuccess ? 'Copié !' : 'Copier'}
                                    </Button>
                                </div>
                            )}
                        </div>
                     </div>
                )}
            </div>
        </div>
    );
};