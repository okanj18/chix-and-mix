import React, { useState, useMemo, useEffect } from 'react';
import { useAminaShop } from '../../context/AminaShopContext';
import { Order, PaymentStatus, DeliveryStatus, Payment, Modification } from '../../types';
import { Card, Button, Input, Modal, Select, useSortableData, SortableHeader } from '../ui/Shared';
import { EyeIcon, PencilIcon, PlusIcon, ClockIcon, PrinterIcon } from '../icons';
import { PaymentScheduleForm } from '../forms/PaymentScheduleForm';

const getStatusClass = (status: PaymentStatus | DeliveryStatus) => {
    switch (status) {
        case 'Payé':
        case 'Livrée':
            return 'bg-emerald-100 text-emerald-800';
        case 'En attente':
            return 'bg-amber-100 text-amber-800';
        case 'Partiellement payé':
        case 'En préparation':
        case 'Partiellement remboursé':
            return 'bg-sky-100 text-sky-800';
        case 'Annulée':
        case 'Rupture de stock':
        case 'Remboursé':
            return 'bg-rose-100 text-rose-800';
        case 'Partiellement retourné':
        case 'Retourné':
            return 'bg-violet-100 text-violet-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const OrderDetailView: React.FC<{ order: Order; onEdit: () => void; onClose: () => void; }> = ({ order, onEdit, onClose }) => {
    const { state, actions } = useAminaShop();
    const { clients, products, payments, paymentSchedules } = state;

    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [isCancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    
    const client = clients.find(c => c.id === order.clientId);
    const schedule = paymentSchedules.find(ps => ps.id === order.paymentScheduleId);
    
    const getProductName = (productId: string) => products.find(p => p.id === productId)?.name || 'Produit Inconnu';
    
    const handleDeliveryStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        actions.updateOrderDeliveryStatus(order.id, e.target.value as DeliveryStatus);
    };

    const confirmCancelOrder = () => {
        actions.cancelOrder(order.id);
        setCancelConfirmOpen(false);
    };

    const handlePrint = () => {
        window.print();
    };

    const balance = (order.total || 0) - (order.paidAmount || 0);

    return (
        <div className="printable-content">
            <div className="space-y-6">
                <div className="flex justify-between items-start no-print">
                    <div>
                        <h3 className="text-xl font-semibold">Commande #{order.id.slice(-6)}</h3>
                        <p className="text-sm text-gray-500">{new Date(order.date).toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={handlePrint}><PrinterIcon className="w-4 h-4 mr-1"/> Imprimer</Button>
                        <Button variant="secondary" size="sm" onClick={onEdit} disabled={order.paymentStatus === 'Annulée'}><PencilIcon className="w-4 h-4 mr-1"/> Modifier</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-1">
                        <h4 className="font-semibold text-gray-800">Client</h4>
                        <p>{client?.firstName} {client?.lastName}</p>
                        <p>{client?.phone}</p>
                        <p>{client?.address}</p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-semibold text-gray-800">Statut de Livraison</h4>
                        <Select value={order.deliveryStatus} onChange={handleDeliveryStatusChange} disabled={order.paymentStatus === 'Annulée'}>
                            <option>En attente</option>
                            <option>En préparation</option>
                            <option>Livrée</option>
                            <option>Annulée</option>
                        </Select>
                    </div>
                </div>
                
                <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Articles</h4>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left p-2 font-medium">Produit</th>
                                    <th className="text-center p-2 font-medium">Qté</th>
                                    <th className="text-right p-2 font-medium">Prix Unitaire</th>
                                    <th className="text-right p-2 font-medium">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {order.items.map((item, i) => (
                                    <tr key={i}>
                                        <td className="p-2">{getProductName(item.productId)} {item.size || item.color ? `(${[item.size, item.color].filter(Boolean).join(', ')})` : ''}</td>
                                        <td className="text-center p-2">{item.quantity}</td>
                                        <td className="text-right p-2">{item.price.toLocaleString()} FCFA</td>
                                        <td className="text-right p-2 font-semibold">{(item.price * item.quantity).toLocaleString()} FCFA</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800">Paiements</h4>
                        <ul className="text-sm space-y-2">
                            {payments.filter(p => p.orderId === order.id).map(p => (
                                <li key={p.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                    <span>{new Date(p.date).toLocaleDateString()} via {p.method}</span>
                                    <span className="font-semibold">{p.amount.toLocaleString()} FCFA</span>
                                </li>
                            ))}
                        </ul>
                        {order.paymentStatus !== 'Annulée' && balance > 0 && (
                             <Button size="sm" onClick={() => setPaymentModalOpen(true)}><PlusIcon className="w-4 h-4 mr-1" /> Ajouter Paiement</Button>
                        )}
                    </div>
                    <div className="space-y-2 text-right text-sm">
                        <p>Sous-total: <span className="font-medium">{order.items.reduce((sum, i) => sum + i.price * i.quantity, 0).toLocaleString()} FCFA</span></p>
                        {order.discount && <p>Remise: <span className="font-medium text-red-600">-{order.discount.toLocaleString()} FCFA</span></p>}
                        <p className="text-base">Total: <span className="font-bold">{order.total.toLocaleString()} FCFA</span></p>
                        <p>Encaissé: <span className="font-medium text-green-600">{order.paidAmount.toLocaleString()} FCFA</span></p>
                        <p className="text-lg">Solde: <span className="font-bold text-red-600">{balance.toLocaleString()} FCFA</span></p>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(order.paymentStatus)}`}>
                            {order.paymentStatus}
                        </span>
                    </div>
                </div>

                {schedule && (
                    <div>
                        <h4 className="font-semibold text-gray-800">Échéancier de Paiement</h4>
                        <ul className="text-sm space-y-2 mt-2">
                            {schedule.installments.map((inst, i) => (
                                <li key={i} className={`flex justify-between p-2 rounded ${inst.status === 'Payé' ? 'bg-green-50' : 'bg-yellow-50'}`}>
                                    <span>Échéance {i + 1}: {new Date(inst.dueDate).toLocaleDateString()}</span>
                                    <span className="font-semibold">{inst.amount.toLocaleString()} FCFA</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${inst.status === 'Payé' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>{inst.status}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                 <Button size="sm" variant="secondary" onClick={() => setScheduleModalOpen(true)} disabled={order.paymentStatus === 'Annulée' || balance <= 0}>
                    <ClockIcon className="w-4 h-4 mr-1"/> {schedule ? "Modifier l'échéancier" : "Créer un échéancier"}
                </Button>

                {order.modificationHistory && order.modificationHistory.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-gray-800">Historique des Modifications</h4>
                        <ul className="text-xs text-gray-500 mt-2 space-y-1 max-h-24 overflow-y-auto">
                        {[...order.modificationHistory].reverse().map((mod: Modification, i: number) => (
                            <li key={i}>[{new Date(mod.date).toLocaleString('fr-FR')}] {mod.user}: {mod.description}</li>
                        ))}
                        </ul>
                    </div>
                )}
            </div>
            
            <div className="flex justify-between items-center mt-6 pt-4 border-t no-print">
                <Button variant="danger" onClick={() => setCancelConfirmOpen(true)} disabled={order.paymentStatus === 'Annulée'}>
                    Annuler la Commande
                </Button>
                <Button variant="secondary" onClick={onClose}>Fermer</Button>
            </div>

            <Modal isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Ajouter un Paiement">
                <PaymentForm order={order} onClose={() => setPaymentModalOpen(false)} />
            </Modal>

            <Modal isOpen={isScheduleModalOpen} onClose={() => setScheduleModalOpen(false)} title="Gérer l'échéancier">
                <PaymentScheduleForm order={order} schedule={schedule} onClose={() => setScheduleModalOpen(false)} />
            </Modal>
             <Modal isOpen={isCancelConfirmOpen} onClose={() => setCancelConfirmOpen(false)} title="Confirmer l'annulation">
                <div>
                    <p className="mb-4">Êtes-vous sûr de vouloir annuler cette commande ? Les stocks seront réajustés. Cette action est irréversible.</p>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setCancelConfirmOpen(false)}>Non</Button>
                        <Button variant="danger" onClick={confirmCancelOrder}>Oui, Annuler</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const PaymentForm: React.FC<{ order: Order; onClose: () => void }> = ({ order, onClose }) => {
    const { actions } = useAminaShop();
    const balance = (order.total || 0) - (order.paidAmount || 0);
    const [amount, setAmount] = useState(balance);
    const [method, setMethod] = useState<Payment['method']>('Espèces');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (amount > 0 && amount <= balance) {
            actions.addPayment({ orderId: order.id, amount, method });
            onClose();
        } else {
            alert("Le montant est invalide.");
        }
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Montant à payer (FCFA)" type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} max={balance} required/>
            <Select label="Méthode de paiement" value={method} onChange={e => setMethod(e.target.value as any)}>
                <option>Espèces</option>
                <option>Mobile Money</option>
                <option>Carte de crédit</option>
            </Select>
            <div className="flex justify-end gap-2">
                <Button variant="secondary" type="button" onClick={onClose}>Annuler</Button>
                <Button type="submit">Ajouter Paiement</Button>
            </div>
        </form>
    );
};


interface OrdersPageProps {
  orderToView: string | null;
  clearOrderToView: () => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({ orderToView, clearOrderToView }) => {
    const { state } = useAminaShop();
    const { orders, clients } = state;
    
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | 'Tous'>('Tous');
    const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<DeliveryStatus | 'Tous'>('Tous');
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        if (orderToView) {
            const order = orders.find(o => o.id === orderToView);
            if (order) {
                setSelectedOrder(order);
                setIsDetailModalOpen(true);
            }
        }
    }, [orderToView, orders]);
    
    const getClientName = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        return client ? `${client.firstName} ${client.lastName}` : 'Client Inconnu';
    };

    const ordersWithDetails = useMemo(() => orders.map(order => ({
        ...order,
        clientName: getClientName(order.clientId),
        balance: (order.total || 0) - (order.paidAmount || 0),
    })), [orders, clients]);

    const filteredOrders = useMemo(() => {
        return ordersWithDetails.filter(order => {
            if (!showArchived && order.isArchived) return false;
            if (showArchived && !order.isArchived) return false;
            if (paymentStatusFilter !== 'Tous' && order.paymentStatus !== paymentStatusFilter) return false;
            if (deliveryStatusFilter !== 'Tous' && order.deliveryStatus !== deliveryStatusFilter) return false;
            if (searchTerm && !order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) && !order.id.includes(searchTerm)) return false;
            return true;
        });
    }, [ordersWithDetails, searchTerm, paymentStatusFilter, deliveryStatusFilter, showArchived]);

    const { items: sortedOrders, requestSort, sortConfig } = useSortableData(filteredOrders, { key: 'date', direction: 'descending' });

    const handleViewDetails = (order: Order) => {
        setSelectedOrder(order);
        setIsDetailModalOpen(true);
    };
    
    const handleEditOrder = (order: Order) => {
        setSelectedOrder(order);
        setIsDetailModalOpen(false); // Close detail view first
        // setIsEditModalOpen(true); // Edit functionality is disabled for now
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedOrder(null);
        clearOrderToView();
    };

    return (
        <Card>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                 <div className="flex items-center gap-4">
                    <h2 className={`text-2xl font-serif font-black text-gray-800 shrink-0 cursor-pointer ${!showArchived ? 'text-primary-600' : ''}`} onClick={() => setShowArchived(false)}>Ventes Actives</h2>
                    <h2 className={`text-2xl font-serif font-black text-gray-400 shrink-0 cursor-pointer ${showArchived ? 'text-primary-600' : ''}`} onClick={() => setShowArchived(true)}>Archives</h2>
                 </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                    <Input label="" id="search" placeholder="Rechercher client, ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <Select label="" value={paymentStatusFilter} onChange={e => setPaymentStatusFilter(e.target.value as any)}>
                        <option value="Tous">Paiement (Tous)</option>
                        <option>Payé</option>
                        <option>Partiellement payé</option>
                        <option>En attente</option>
                        <option>Annulée</option>
                    </Select>
                    <Select label="" value={deliveryStatusFilter} onChange={e => setDeliveryStatusFilter(e.target.value as any)}>
                         <option value="Tous">Livraison (Tous)</option>
                         <option>En attente</option>
                         <option>En préparation</option>
                         <option>Livrée</option>
                         <option>Annulée</option>
                    </Select>
                </div>
            </div>
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <SortableHeader sortKey="date" title="Date" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="id" title="ID" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="clientName" title="Client" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="total" title="Total" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="balance" title="Solde" sortConfig={sortConfig} requestSort={requestSort} />
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paiement</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Livraison</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedOrders.map(order => (
                            <tr key={order.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(order.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{order.id.slice(-6)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{order.clientName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{order.total.toLocaleString()} FCFA</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${order.balance > 0 ? 'text-red-600' : ''}`}>{order.balance > 0 ? order.balance.toLocaleString() + ' FCFA' : '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(order.paymentStatus)}`}>
                                        {order.paymentStatus}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(order.deliveryStatus)}`}>
                                        {order.deliveryStatus}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Button variant="secondary" size="sm" onClick={() => handleViewDetails(order)}><EyeIcon /></Button>
                                </td>
                            </tr>
                        ))}
                         {sortedOrders.length === 0 && (
                            <tr><td colSpan={8} className="text-center py-8 text-gray-500">Aucune vente ne correspond aux filtres.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isDetailModalOpen} onClose={handleCloseDetailModal} title="Détails de la Commande" contentClassName="max-w-3xl">
                {selectedOrder && <OrderDetailView order={selectedOrder} onEdit={() => handleEditOrder(selectedOrder)} onClose={handleCloseDetailModal}/>}
            </Modal>

        </Card>
    );
};