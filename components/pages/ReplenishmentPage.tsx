import React, { useState, useMemo } from 'react';
import { useAminaShop } from '../../context/AminaShopContext';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderPaymentStatus } from '../../types';
import { Card, Button, Modal, useSortableData, SortableHeader } from '../ui/Shared';
import { ReceivePOForm } from '../forms/ReceivePOForm';
import { EyeIcon, PencilIcon } from '../icons';
import { PurchaseOrderForm } from '../forms/PurchaseOrderForm';


export const ReplenishmentPage: React.FC = () => {
    const { state, actions } = useAminaShop();
    const { purchaseOrders, suppliers, products } = state;

    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

    const getSupplierName = (supplierId: string) => suppliers.find(s => s.id === supplierId)?.companyName || 'N/A';
    const getProductName = (productId: string) => products.find(p => p.id === productId)?.name || 'N/A';
    
    const purchaseOrdersWithDetails = useMemo(() => purchaseOrders.map(po => ({
        ...po,
        supplierName: getSupplierName(po.supplierId)
    })), [purchaseOrders, suppliers]);

    const { items: sortedPurchaseOrders, requestSort, sortConfig } = useSortableData(purchaseOrdersWithDetails, { key: 'date', direction: 'descending' });

    const handleOpenReceiveModal = (po: PurchaseOrder) => {
        setSelectedPO(po);
        setIsReceiveModalOpen(true);
    };
    
    const handleOpenEditModal = (po: PurchaseOrder) => {
        setSelectedPO(po);
        setIsEditModalOpen(true);
    };

    const handleOpenDetailModal = (po: PurchaseOrder) => {
        setSelectedPO(po);
        setIsDetailModalOpen(true);
    };

    const handleReceiveSubmit = (receivedItems: Array<{ item: PurchaseOrderItem; quantityToReceive: number }>) => {
        if (selectedPO) {
            actions.receivePurchaseOrderItems(selectedPO.id, receivedItems);
        }
        setIsReceiveModalOpen(false);
        setSelectedPO(null);
    };

    const getPOStatusClass = (status: PurchaseOrder['status']) => {
        switch(status) {
            case 'Reçue totalement': return 'bg-emerald-100 text-emerald-800';
            case 'Envoyée': return 'bg-amber-100 text-amber-800';
            case 'Reçue partiellement': return 'bg-sky-100 text-sky-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPaymentStatusClass = (status: PurchaseOrderPaymentStatus) => {
        switch(status) {
            case 'Payé': return 'bg-emerald-100 text-emerald-800';
            case 'En attente': return 'bg-amber-100 text-amber-800';
            case 'Partiellement payé': return 'bg-sky-100 text-sky-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <>
            <Card>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                    <h2 className="text-2xl font-serif font-black text-gray-800 shrink-0">Suivi des Approvisionnements</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <SortableHeader sortKey="id" title="ID" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader sortKey="supplierName" title="Fournisseur" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader sortKey="date" title="Date" sortConfig={sortConfig} requestSort={requestSort} className="hidden sm:table-cell" />
                                <SortableHeader sortKey="total" title="Total" sortConfig={sortConfig} requestSort={requestSort} />
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Statut Réception</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut Paiement</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedPurchaseOrders.map(po => (
                                <tr key={po.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{po.id.slice(-6)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{po.supplierName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{new Date(po.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{po.total.toLocaleString()} FCFA</td>
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
                                        <Button variant="secondary" size="sm" onClick={() => handleOpenDetailModal(po)}><EyeIcon /></Button>
                                        {po.status !== 'Reçue totalement' && (
                                            <Button variant="secondary" size="sm" onClick={() => handleOpenEditModal(po)}><PencilIcon /></Button>
                                        )}
                                        {po.status !== 'Reçue totalement' && (
                                            <Button size="sm" onClick={() => handleOpenReceiveModal(po)}>Réceptionner</Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} title={`Réceptionner la commande ${selectedPO?.id}`}>
                {selectedPO && <ReceivePOForm purchaseOrder={selectedPO} onClose={() => setIsReceiveModalOpen(false)} onSubmit={handleReceiveSubmit} />}
            </Modal>
            
            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={`Détails de la commande ${selectedPO?.id}`}>
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

                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2">Articles Commandés</h4>
                            <div className="max-h-60 overflow-y-auto pr-2">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="py-1 px-2 text-left font-medium">Produit</th>
                                            <th className="py-1 px-2 text-center font-medium">Commandé</th>
                                            <th className="py-1 px-2 text-center font-medium">Reçu</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedPO.items.map((item, idx) => {
                                            const variantString = (item.size || item.color) ? ` (${item.size || ''}${item.size && item.color ? ', ' : ''}${item.color || ''})` : '';
                                            return (
                                                <tr key={idx} className="border-b">
                                                    <td className="py-2 px-2">{getProductName(item.productId)}{variantString}</td>
                                                    <td className="py-2 px-2 text-center">{item.quantity}</td>
                                                    <td className="py-2 px-2 text-center">{item.quantityReceived}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                             <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>Fermer</Button>
                        </div>
                    </div>
                )}
            </Modal>

             <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Modifier la commande ${selectedPO?.id}`}>
                {selectedPO && <PurchaseOrderForm purchaseOrder={selectedPO} onClose={() => setIsEditModalOpen(false)} />}
            </Modal>
        </>
    );
};