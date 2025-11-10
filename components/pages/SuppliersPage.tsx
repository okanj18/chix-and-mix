import React, { useState, useMemo } from 'react';
import { useAminaShop } from '../../context/AminaShopContext';
import { Supplier, PurchaseOrder, PurchaseOrderItem, Product } from '../../types';
import { Card, Button, Input, Modal, Select, useSortableData, SortableHeader } from '../ui/Shared';
import { PlusIcon, EyeIcon } from '../icons';
import { PurchaseOrderForm } from '../forms/PurchaseOrderForm';

// Supplier Form (existing, no changes needed)
const SupplierForm: React.FC<{ supplier?: Supplier; onClose: () => void }> = ({ supplier, onClose }) => {
  const { actions } = useAminaShop();
  const [formData, setFormData] = useState<Omit<Supplier, 'id'>>({
    companyName: supplier?.companyName || '',
    contactPerson: supplier?.contactPerson || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (supplier) {
      actions.updateSupplier({ ...formData, id: supplier.id });
    } else {
      actions.addSupplier(formData);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Nom de l'entreprise" name="companyName" value={formData.companyName} onChange={handleChange} required />
        <Input label="Personne à contacter" name="contactPerson" value={formData.contactPerson} onChange={handleChange} required />
        <Input label="Téléphone" name="phone" value={formData.phone} onChange={handleChange} required />
        <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
        <Input label="Adresse" name="address" value={formData.address} onChange={handleChange} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
        <Button type="submit">{supplier ? 'Mettre à jour' : 'Ajouter Fournisseur'}</Button>
      </div>
    </form>
  );
};

// NEW: SupplierPaymentForm
const SupplierPaymentForm: React.FC<{ purchaseOrder: PurchaseOrder, onClose: () => void }> = ({ purchaseOrder, onClose }) => {
    const { actions } = useAminaShop();
    const [amount, setAmount] = useState(0);
    const [method, setMethod] = useState<'Espèces' | 'Virement bancaire' | 'Chèque'>('Virement bancaire');
    
    const balance = (purchaseOrder.total || 0) - (purchaseOrder.paidAmount || 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (amount > 0 && amount <= balance) {
            actions.addSupplierPayment({
                purchaseOrderId: purchaseOrder.id,
                amount,
                method,
            });
            onClose();
        } else {
            alert('Le montant du paiement est invalide.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-lg mt-4 space-y-3">
            <h4 className="font-semibold text-gray-800">Ajouter un paiement fournisseur</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Input label="Montant (FCFA)" type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)} max={balance} required/>
                <Select label="Méthode" value={method} onChange={e => setMethod(e.target.value as any)}>
                    <option>Virement bancaire</option>
                    <option>Chèque</option>
                    <option>Espèces</option>
                </Select>
                <Button type="submit" className="w-full">Ajouter Paiement</Button>
            </div>
        </form>
    );
};

export const SuppliersPage: React.FC = () => {
  const { state } = useAminaShop();
  const { suppliers, purchaseOrders, products, supplierPayments } = state;
  const [searchTerm, setSearchTerm] = useState('');
  const [isSupplierModalOpen, setSupplierModalOpen] = useState(false);
  const [isPOModalOpen, setPOModalOpen] = useState(false);
  const [isPODetailModalOpen, setPODetailModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>(undefined);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  
  const getSupplierName = (supplierId: string) => suppliers.find(s => s.id === supplierId)?.companyName || 'N/A';
  const getProductName = (productId: string) => products.find(p => p.id === productId)?.name || 'N/A';

  const filteredSuppliers = useMemo(() =>
    suppliers.filter(s =>
      s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    ), [suppliers, searchTerm]);

  const purchaseOrdersWithDetails = useMemo(() => purchaseOrders.map(po => ({
    ...po,
    supplierName: getSupplierName(po.supplierId)
  })), [purchaseOrders, suppliers]);

  const { items: sortedSuppliers, requestSort: requestSupplierSort, sortConfig: supplierSortConfig } = useSortableData(filteredSuppliers);
  const { items: sortedPOs, requestSort: requestPOSort, sortConfig: poSortConfig } = useSortableData(purchaseOrdersWithDetails, { key: 'date', direction: 'descending' });

  const handleAddSupplier = () => { setSelectedSupplier(undefined); setSupplierModalOpen(true); };
  const handleEditSupplier = (supplier: Supplier) => { setSelectedSupplier(supplier); setSupplierModalOpen(true); };
  const handleViewPODetails = (po: PurchaseOrder) => { setSelectedPO(po); setPODetailModalOpen(true); };

  const getPOStatusClass = (status: PurchaseOrder['status']) => {
    switch(status) {
        case 'Reçue totalement': return 'bg-emerald-100 text-emerald-800';
        case 'Envoyée': return 'bg-amber-100 text-amber-800';
        case 'Reçue partiellement': return 'bg-sky-100 text-sky-800';
        default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusClass = (status: PurchaseOrder['paymentStatus']) => {
    switch(status) {
        case 'Payé': return 'bg-emerald-100 text-emerald-800';
        case 'En attente': return 'bg-amber-100 text-amber-800';
        case 'Partiellement payé': return 'bg-sky-100 text-sky-800';
        default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
          <h2 className="text-2xl font-serif font-black text-gray-800 shrink-0">Gestion des Fournisseurs</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Input label="" id="search" placeholder="Rechercher par nom..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Button onClick={handleAddSupplier} className="whitespace-nowrap"><PlusIcon/>Ajouter un Fournisseur</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader sortKey="companyName" title="Entreprise" sortConfig={supplierSortConfig} requestSort={requestSupplierSort} />
                <SortableHeader sortKey="contactPerson" title="Contact" sortConfig={supplierSortConfig} requestSort={requestSupplierSort} className="hidden sm:table-cell" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Téléphone</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedSuppliers.map(supplier => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{supplier.companyName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{supplier.contactPerson}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{supplier.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEditSupplier(supplier)} className="text-primary-600 hover:text-primary-900">Éditer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      <Card>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
          <h2 className="text-2xl font-serif font-black text-gray-800 shrink-0">Achats auprès des Fournisseurs</h2>
          <Button onClick={() => setPOModalOpen(true)} className="w-full md:w-auto whitespace-nowrap"><PlusIcon/>Nouveau Bon de Commande</Button>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <SortableHeader sortKey="id" title="ID" sortConfig={poSortConfig} requestSort={requestPOSort} />
                        <SortableHeader sortKey="supplierName" title="Fournisseur" sortConfig={poSortConfig} requestSort={requestPOSort} />
                        <SortableHeader sortKey="date" title="Date" sortConfig={poSortConfig} requestSort={requestPOSort} className="hidden sm:table-cell" />
                        <SortableHeader sortKey="total" title="Total" sortConfig={poSortConfig} requestSort={requestPOSort} />
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Statut Commande</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut Paiement</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {sortedPOs.map(po => (
                        <tr key={po.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{po.id.slice(-6)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{po.supplierName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{new Date(po.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(po.total || 0).toLocaleString()} FCFA</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm hidden md:table-cell">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPOStatusClass(po.status)}`}>
                                    {po.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusClass(po.paymentStatus)}`}>
                                    {po.paymentStatus}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                <Button variant="secondary" size="sm" onClick={() => handleViewPODetails(po)}><EyeIcon /></Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </Card>
      
      <Modal isOpen={isSupplierModalOpen} onClose={() => setSupplierModalOpen(false)} title={selectedSupplier ? 'Éditer le Fournisseur' : 'Ajouter un Fournisseur'}>
        <SupplierForm supplier={selectedSupplier} onClose={() => setSupplierModalOpen(false)} />
      </Modal>
      <Modal isOpen={isPOModalOpen} onClose={() => setPOModalOpen(false)} title="Créer un Bon de Commande">
        <PurchaseOrderForm onClose={() => setPOModalOpen(false)} />
      </Modal>
      <Modal isOpen={isPODetailModalOpen} onClose={() => setPODetailModalOpen(false)} title={`Détails Achat: ${selectedPO?.id}`}>
        {selectedPO && (
            <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <p><strong>Fournisseur:</strong><br/>{getSupplierName(selectedPO.supplierId)}</p>
                    <p><strong>Date:</strong><br/>{new Date(selectedPO.date).toLocaleString()}</p>
                    <p><strong>Statut:</strong><br/>{selectedPO.status}</p>
                 </div>
                 {selectedPO.notes && (
                    <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2">Notes</h4>
                        <p className="text-sm p-3 bg-gray-50 rounded-md whitespace-pre-wrap">{selectedPO.notes}</p>
                    </div>
                 )}
                 <div className="border-t pt-4"><h4 className="font-semibold mb-2">Articles</h4>
                    <ul className="list-disc list-inside bg-gray-50 p-3 rounded-md text-sm">
                        {selectedPO.items.map((item, idx) => {
                            const variantString = (item.size || item.color) ? ` (${item.size || ''}${item.size && item.color ? ', ' : ''}${item.color || ''})` : '';
                            return (<li key={`${item.productId}-${idx}`} className="flex justify-between"><span>{getProductName(item.productId)}{variantString} x {item.quantity}</span><span>{((item.purchasePrice || 0) * (item.quantity || 0)).toLocaleString()} FCFA</span></li>)
                        })}
                    </ul>
                </div>
                <div className="border-t pt-4 space-y-2 text-right text-sm">
                    <p className="text-base font-bold">Total: {(selectedPO.total || 0).toLocaleString()} FCFA</p>
                    <p className="text-green-600"><strong>Payé:</strong> {(selectedPO.paidAmount || 0).toLocaleString()} FCFA</p>
                    <p className="text-lg font-bold">Solde Restant: {((selectedPO.total || 0) - (selectedPO.paidAmount || 0)).toLocaleString()} FCFA</p>
                </div>
                <div className="border-t pt-4"><h4 className="font-semibold mb-2">Paiements Effectués</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                        {supplierPayments.filter(p => p.purchaseOrderId === selectedPO.id).map(p => (<li key={p.id} className="flex justify-between items-center bg-gray-50 p-2 rounded"><span>{new Date(p.date).toLocaleDateString()}</span><span className="font-semibold">{(p.amount || 0).toLocaleString()} FCFA</span><span className="text-xs bg-white p-1 rounded border">{p.method}</span></li>))}
                         {supplierPayments.filter(p => p.purchaseOrderId === selectedPO.id).length === 0 && (
                            <li className="text-center text-gray-500 py-2">Aucun paiement enregistré.</li>
                        )}
                    </ul>
                </div>
                {selectedPO.paymentStatus !== 'Payé' && <SupplierPaymentForm purchaseOrder={selectedPO} onClose={() => setPODetailModalOpen(false)} />}
                 <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="secondary" onClick={() => setPODetailModalOpen(false)}>Fermer</Button>
                </div>
            </div>
        )}
      </Modal>
    </div>
  );
};