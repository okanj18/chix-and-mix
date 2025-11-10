import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAminaShop } from '../../context/AminaShopContext';
import { Order, PaymentStatus, DeliveryStatus, OrderItem, Payment, PaymentSchedule, Product, Client } from '../../types';
import { Card, Button, Input, Modal, Select, useSortableData, SortableHeader, Textarea } from '../ui/Shared';
import { EyeIcon, PencilIcon, TrashIcon, CashIcon, PlusIcon, ClockIcon, XMarkIcon, ArrowPathIcon, PrinterIcon, DocumentArrowDownIcon } from '../icons';
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

const VariantSelectionModal: React.FC<{ 
    product: Product; 
    onClose: () => void; 
    onAddToCart: (product: Product, variant: { size?: string, color?: string }, quantity: number) => void; 
}> = ({ product, onClose, onAddToCart }) => {
    
    const hasSizes = useMemo(() => product.variants.some(v => v.size), [product]);
    const hasColors = useMemo(() => product.variants.some(v => v.color), [product]);

    const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
    const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
    const [quantity, setQuantity] = useState(1);

    const availableSizes = useMemo(() => hasSizes ? [...new Set(product.variants.map(v => v.size).filter(Boolean))] as string[] : [], [product, hasSizes]);
    
    const availableColors = useMemo(() => {
        if (!hasColors) return [];
        let variants = product.variants;
        if (hasSizes && selectedSize) {
            variants = variants.filter(v => v.size === selectedSize);
        }
        return [...new Set(variants.map(v => v.color).filter(Boolean))] as string[];
    }, [product, hasColors, hasSizes, selectedSize]);

    useEffect(() => {
        if (availableSizes.length > 0) {
            setSelectedSize(availableSizes[0]);
        }
    }, [availableSizes]);

    useEffect(() => {
        if (availableColors.length > 0) {
            setSelectedColor(prev => {
                const isPreviousSelectionValid = prev && availableColors.includes(prev);
                return isPreviousSelectionValid ? prev : availableColors[0];
            });
        } else {
             setSelectedColor(undefined);
        }
    }, [availableColors]);
    
    const selectedVariant = useMemo(() => {
        return product.variants.find(v => {
            const sizeMatch = hasSizes ? v.size === selectedSize : true;
            const colorMatch = hasColors ? v.color === selectedColor : true;
            return sizeMatch && colorMatch;
        });
    }, [product, hasSizes, hasColors, selectedSize, selectedColor]);

    const availableStock = selectedVariant?.quantity || 0;

    const handleAddToCartClick = () => {
        if (!selectedVariant || quantity <= 0) return;
        onAddToCart(product, { size: selectedSize, color: selectedColor }, quantity);
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Sélectionner pour ${product.name}`}>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hasSizes && (
                        <Select label="Taille" value={selectedSize || ''} onChange={e => setSelectedSize(e.target.value)}>
                            {availableSizes.map(size => <option key={size} value={size}>{size}</option>)}
                        </Select>
                    )}
                    {hasColors && (
                        <Select label="Couleur" value={selectedColor || ''} onChange={e => setSelectedColor(e.target.value)} disabled={availableColors.length === 0}>
                            {availableColors.map(color => <option key={color} value={color}>{color}</option>)}
                        </Select>
                    )}
                </div>
                <div>
                    <Input 
                        label="Quantité" 
                        type="number" 
                        value={quantity} 
                        onChange={e => setQuantity(parseInt(e.target.value) || 1)} 
                        min="1" 
                    />
                    <p className="text-sm text-gray-500 mt-1">
                        Stock disponible pour cette sélection : <span className={`font-bold ${availableStock < 0 ? 'text-red-600' : ''}`}>{availableStock}</span>
                    </p>
                </div>
                 <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                    <Button onClick={handleAddToCartClick} disabled={!selectedVariant}>Ajouter</Button>
                </div>
            </div>
        </Modal>
    );
};


const OrderDetailModal: React.FC<{ orderId: string; onClose: () => void }> = ({ orderId, onClose }) => {
    const { state, actions } = useAminaShop();
    const printRef = useRef<HTMLDivElement>(null);
    
    const originalOrder = state.orders.find(o => o.id === orderId);

    const order = useMemo(() => {
        if (!originalOrder) return null;
        return {
            ...originalOrder,
            total: Number(originalOrder.total || 0),
            paidAmount: Number(originalOrder.paidAmount || 0),
            discount: Number(originalOrder.discount || 0),
            items: (originalOrder.items || []).map(item => ({
                ...item,
                quantity: Number(item.quantity || 0),
                price: Number(item.price || 0),
            })),
        };
    }, [originalOrder]);

    useEffect(() => {
        if (!order) {
            onClose();
        }
    }, [order, onClose]);

    const [newPaymentAmount, setNewPaymentAmount] = useState(0);
    const [newPaymentMethod, setNewPaymentMethod] = useState<Payment['method']>('Espèces');
    const [deliveryError, setDeliveryError] = useState<string | null>(null);
    
    const [isEditing, setIsEditing] = useState(false);
    const [editedClientId, setEditedClientId] = useState('');
    const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
    const [editedDiscount, setEditedDiscount] = useState(0);
    const [editedNotes, setEditedNotes] = useState('');
    const [productToAdd, setProductToAdd] = useState<string>('');
    const [isVariantModalOpenForEdit, setVariantModalOpenForEdit] = useState(false);
    const [productForVariantSelection, setProductForVariantSelection] = useState<Product | null>(null);

    const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
    const [editedPaymentAmount, setEditedPaymentAmount] = useState(0);
    const [editedPaymentMethod, setEditedPaymentMethod] = useState<Payment['method']>('Espèces');
    const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [installmentToPayIndex, setInstallmentToPayIndex] = useState<number | null>(null);
    const [paymentMethodForInstallment, setPaymentMethodForInstallment] = useState<Payment['method']>('Espèces');
    
    if (!order) {
        return null;
    }

    const client = state.clients.find(c => c.id === order.clientId);
    const payments = state.payments.filter(p => p.orderId === order.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const schedule = order.paymentScheduleId ? state.paymentSchedules.find(ps => ps.id === order.paymentScheduleId) : null;

    const getProductName = (productId: string) => state.products.find(p => p.id === productId)?.name || 'Produit Inconnu';
    
    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) {
            console.error("Printable content not found!");
            return;
        }

        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const printDocument = iframe.contentWindow!.document;

        // Clone all head elements from the main document to the iframe
        const headContent = document.head.innerHTML;

        // Clone the printable content
        const clonedContent = printContent.cloneNode(true) as HTMLElement;

        printDocument.open();
        printDocument.write(`
            <html>
                <head>
                    <title>Facture ${order.id}</title>
                    ${headContent}
                    <style>
                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body style="padding: 1.5rem; margin: 0;">
                    ${clonedContent.innerHTML}
                </body>
            </html>
        `);
        printDocument.close();

        iframe.onload = () => {
            setTimeout(() => { // Timeout ensures all styles are applied
                iframe.contentWindow!.focus();
                iframe.contentWindow!.print();
                document.body.removeChild(iframe);
            }, 500);
        };
    };


    const handleAddPayment = () => {
        const remainingBalance = order.total - order.paidAmount;
        const paymentAmount = Number(newPaymentAmount);
        if (paymentAmount > 0 && paymentAmount <= remainingBalance) {
            actions.addPayment({ orderId: order.id, amount: paymentAmount, method: newPaymentMethod });
            setNewPaymentAmount(0);
        } else {
            alert(`Le montant doit être supérieur à 0 et ne peut pas dépasser le solde restant de ${remainingBalance.toLocaleString()} FCFA.`);
        }
    };
    
    const handleDeliveryStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as DeliveryStatus;
        setDeliveryError(null);

        if (newStatus === 'Livrée') {
            const outOfStockItems: string[] = [];

            for (const item of order.items) {
                const product = state.products.find(p => p.id === item.productId);
                if (!product) continue;

                if (item.size || item.color) { // It's a variant
                    const variant = product.variants.find(v => (v.size || '') === (item.size || '') && (v.color || '') === (item.color || ''));
                    if (variant && Number(variant.quantity) < 0) {
                        outOfStockItems.push(`${product.name} (${item.size || ''}${item.size && item.color ? ', ' : ''}${item.color || ''})`);
                    } else if (!variant) {
                        outOfStockItems.push(`${product.name} (variant introuvable)`);
                    }
                } else { // It's a simple product
                    if (Number(product.stock) < 0) {
                        outOfStockItems.push(product.name);
                    }
                }
            }

            if (outOfStockItems.length > 0) {
                const errorMessage = 
                    `Impossible de marquer la commande comme "Livrée".\n\n` +
                    `Le stock était insuffisant pour les articles suivants au moment de la vente :\n` +
                    `- ${outOfStockItems.join('\n- ')}\n\n` +
                    `Veuillez réapprovisionner le stock ou modifier la commande.`;
                setDeliveryError(errorMessage);
                return; // Prevent status change
            }
        }

        actions.updateOrderDeliveryStatus(order.id, newStatus);
    };

    const handleCancelOrder = () => {
        setIsCancelConfirmOpen(true);
    };

    const confirmCancelOrder = () => {
        actions.cancelOrder(order.id);
        setIsCancelConfirmOpen(false);
    };
    
    const handleStartEdit = () => {
        setEditedClientId(order.clientId);
        setEditedItems(order.items.map(item => ({
            ...item,
            price: Number(item.price || 0),
            quantity: Number(item.quantity || 0),
        })));
        setEditedDiscount(Number(order.discount || 0));
        setEditedNotes(order.notes || '');
        setIsEditing(true);
    };

    const handleCancelEdit = () => setIsEditing(false);
    
    const handleSaveEdit = () => {
        if (editedItems.length === 0) {
            alert("La commande doit contenir au moins un article.");
            return;
        }
        actions.updateOrder(order.id, {
            clientId: editedClientId,
            items: editedItems,
            discount: editedDiscount,
            notes: editedNotes,
        });
        setIsEditing(false);
    };

    const handleItemQuantityChange = (index: number, quantity: number) => {
        if (quantity < 1) return; 
        const newItems = [...editedItems];
        newItems[index].quantity = quantity;
        setEditedItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        setEditedItems(editedItems.filter((_, i) => i !== index));
    };

    const handleAddItem = () => {
        if (!productToAdd) return;
        const product = state.products.find(p => p.id === productToAdd);
        if (!product) return;
    
        if (product.variants && product.variants.length > 0) {
            setProductForVariantSelection(product);
            setVariantModalOpenForEdit(true);
        } else {
            const existingItemIndex = editedItems.findIndex(item => item.productId === product.id);
            if (existingItemIndex > -1) {
                handleItemQuantityChange(existingItemIndex, editedItems[existingItemIndex].quantity + 1);
            } else {
                setEditedItems([...editedItems, {
                    productId: product.id,
                    quantity: 1,
                    price: product.sellingPrice,
                }]);
            }
            setProductToAdd('');
        }
    };

    const handleAddToCartFromVariantModal = (product: Product, variant: { size?: string, color?: string }, quantity: number) => {
        const existingItemIndex = editedItems.findIndex(
            item => item.productId === product.id && item.size === variant.size && item.color === variant.color
        );
    
        if (existingItemIndex > -1) {
            const newQuantity = editedItems[existingItemIndex].quantity + quantity;
            handleItemQuantityChange(existingItemIndex, newQuantity);
        } else {
            setEditedItems([...editedItems, {
                productId: product.id,
                quantity: quantity,
                price: product.sellingPrice,
                size: variant.size,
                color: variant.color
            }]);
        }
        setVariantModalOpenForEdit(false);
        setProductForVariantSelection(null);
        setProductToAdd('');
    };

    const editedSubtotal = useMemo(() => editedItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [editedItems]);
    const editedTotal = useMemo(() => editedSubtotal - editedDiscount, [editedSubtotal, editedDiscount]);

    const handleStartEditPayment = (payment: Payment) => {
        setEditingPaymentId(payment.id);
        setEditedPaymentAmount(Number(payment.amount));
        setEditedPaymentMethod(payment.method);
    };

    const handleCancelEditPayment = () => setEditingPaymentId(null);

    const handleSavePayment = (paymentId: string) => {
        const payment = payments.find(p => p.id === paymentId);
        if (!payment) return;
        const remainingBalanceWithoutOldPayment = (order.total - order.paidAmount) + Number(payment.amount);
        if (editedPaymentAmount <= 0 || editedPaymentAmount > remainingBalanceWithoutOldPayment) {
             alert(`Le montant du paiement est invalide. Il doit être supérieur à 0 et ne peut pas dépasser le nouveau solde de ${remainingBalanceWithoutOldPayment.toLocaleString()} FCFA.`);
             return;
        }
        actions.updatePayment(paymentId, editedPaymentAmount, editedPaymentMethod);
        setEditingPaymentId(null);
    };
    
    const handleDeletePayment = (payment: Payment) => setPaymentToDelete(payment);

    const confirmDeletePayment = () => {
        if (paymentToDelete) {
            actions.deletePayment(paymentToDelete.id);
            setPaymentToDelete(null);
        }
    };

    const handlePayInstallment = (index: number) => setInstallmentToPayIndex(index);

    const confirmPayInstallment = () => {
        if (installmentToPayIndex !== null) {
            actions.markInstallmentAsPaid(order.id, installmentToPayIndex, paymentMethodForInstallment);
            setInstallmentToPayIndex(null);
        }
    };

    const isCancelDisabled = order.paidAmount > 0 || order.deliveryStatus === 'Livrée' || order.deliveryStatus === 'Annulée';
    const cancelDisabledReason = 
        order.paidAmount > 0 ? "Annulation impossible : des paiements ont été enregistrés." :
        order.deliveryStatus === 'Livrée' ? "Annulation impossible : la commande est déjà livrée." :
        order.deliveryStatus === 'Annulée' ? "La commande est déjà annulée." : "";


    return (
        <>
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            title={`${isEditing ? 'Modification' : 'Détails'} de la Commande ${order.id.slice(-6)}`} 
        >
            <div ref={printRef}>
                 {/* INVOICE HEADER */}
                <div className="mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-serif font-black">
                                <span className="text-primary-900">CHIC </span>
                                <span className="text-primary-500 italic">&amp;</span>
                                <span className="text-primary-900"> MIX</span>
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                123 Avenue de l'Élégance, Dakar, Sénégal<br />
                                +221 77 123 45 67 | contact@chicandmix.sn
                            </p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-semibold uppercase text-gray-700">Facture</h2>
                            <p className="text-sm text-gray-500"><strong>Commande N°:</strong> {order.id}</p>
                            <p className="text-sm text-gray-500"><strong>Date:</strong> {new Date(order.date).toLocaleDateString('fr-FR')}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {!isEditing && (
                        <>
                            <div className="grid grid-cols-1 text-sm border-t border-b py-4">
                                <div>
                                    <h4 className="font-semibold text-gray-800 mb-1">Facturé à</h4>
                                    <p className="font-medium text-gray-900">{client?.firstName} {client?.lastName}</p>
                                    {client?.address && <p className="text-gray-600">{client.address}</p>}
                                    <p className="text-gray-600">{client?.phone}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2 sr-only">Articles</h4>
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium text-gray-600">Description</th>
                                                <th className="px-4 py-2 text-center font-medium text-gray-600">Quantité</th>
                                                <th className="px-4 py-2 text-right font-medium text-gray-600">Prix Unitaire</th>
                                                <th className="px-4 py-2 text-right font-medium text-gray-600">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {order.items.map((item, index) => {
                                                const variantString = [item.size, item.color].filter(Boolean).join(' / ');
                                                return (
                                                    <tr key={index}>
                                                        <td className="px-4 py-2">
                                                            {getProductName(item.productId)}
                                                            {variantString && <span className="text-gray-500 text-xs block"> ({variantString})</span>}
                                                        </td>
                                                        <td className="px-4 py-2 text-center">{item.quantity}</td>
                                                        <td className="px-4 py-2 text-right">{item.price.toLocaleString()} FCFA</td>
                                                        <td className="px-4 py-2 text-right font-medium">{(item.price * item.quantity).toLocaleString()} FCFA</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>


                            <div className="flex justify-end">
                                <div className="w-full max-w-sm space-y-2 text-sm">
                                    <div className="flex justify-between"><span>Sous-total:</span><span>{(order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)).toLocaleString()} FCFA</span></div>
                                    {order.discount > 0 && <div className="flex justify-between text-red-600"><span>Remise:</span><span>-{order.discount.toLocaleString()} FCFA</span></div>}
                                    <div className="flex justify-between text-base font-bold border-t pt-2 mt-2"><span>Total:</span><span>{order.total.toLocaleString()} FCFA</span></div>
                                    <div className="flex justify-between text-green-600"><strong>Payé:</strong><strong>{order.paidAmount.toLocaleString()} FCFA</strong></div>
                                    <div className="flex justify-between text-lg font-bold text-red-700 bg-gray-100 p-2 rounded-md"><span>Solde Restant:</span><span>{(order.total - order.paidAmount).toLocaleString()} FCFA</span></div>
                                </div>
                            </div>
                            
                             {/* INVOICE FOOTER */}
                            <div className="text-center mt-8 pt-4 border-t">
                                <p className="text-gray-600">Merci de votre confiance !</p>
                                <p className="text-xs text-gray-400">CHIC & MIX - La mode qui vous ressemble.</p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="space-y-6 no-print mt-6">
                {isEditing ? (
                    <div className="space-y-4">
                        <Select label="Client" value={editedClientId} onChange={e => setEditedClientId(e.target.value)}>
                            {state.clients.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                        </Select>

                        <div>
                            <h4 className="font-semibold text-gray-800 mb-2">Articles</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {editedItems.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                    <div>
                                        <p className="font-medium">{getProductName(item.productId)}</p>
                                        {(item.size || item.color) && (
                                            <p className="text-xs text-gray-500">
                                                {item.size}{item.size && item.color ? ' / ' : ''}{item.color}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500">{item.price.toLocaleString()} FCFA</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input label="" type="number" value={item.quantity} onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value))} className="w-16 text-center" />
                                        <button onClick={() => handleRemoveItem(index)} className="p-1.5 text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                            </div>
                            <div className="flex items-end gap-2 mt-4">
                                <div className="flex-grow">
                                    <Select label="Ajouter un produit" value={productToAdd} onChange={e => setProductToAdd(e.target.value)}>
                                        <option value="">Sélectionner un produit...</option>
                                        {state.products 
                                            .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                        }
                                    </Select>
                                </div>
                                <Button type="button" variant="secondary" onClick={handleAddItem} disabled={!productToAdd}><PlusIcon/></Button>
                            </div>
                        </div>

                        <Input label="Remise (FCFA)" type="number" value={editedDiscount} onChange={e => setEditedDiscount(parseFloat(e.target.value) || 0)} />
                        <Input label="Remarques" value={editedNotes} onChange={e => setEditedNotes(e.target.value)} />

                        <div className="border-t pt-4 text-right">
                            <p className="text-lg">Sous-total: {editedSubtotal.toLocaleString()} FCFA</p>
                            <p className="text-lg">Total: <span className="font-bold">{editedTotal.toLocaleString()} FCFA</span></p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="border-2 border-gray-300 p-3 rounded-lg">
                                <Select 
                                    label="Statut de Livraison" 
                                    labelClassName="!text-base !font-semibold !text-gray-900"
                                    value={order.deliveryStatus} 
                                    onChange={handleDeliveryStatusChange} 
                                    disabled={order.deliveryStatus === 'Annulée' || order.deliveryStatus === 'Retourné'}
                                >
                                    <option>En attente</option>
                                    <option>En préparation</option>
                                    <option>Livrée</option>
                                    <option>Rupture de stock</option>
                                    <option disabled>--</option>
                                    <option disabled>Partiellement retourné</option>
                                    <option disabled>Retourné</option>
                                    <option disabled>Annulée</option>
                                </Select>
                                {deliveryError && (
                                    <div className="mt-2 p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-md whitespace-pre-wrap">
                                        {deliveryError}
                                    </div>
                                )}
                            </div>
                            {order.paymentStatus !== 'Payé' && order.paymentStatus !== 'Annulée' && order.paymentStatus !== 'Remboursé' && (
                                <form onSubmit={e => {e.preventDefault(); handleAddPayment();}} className="space-y-2">
                                    <Input label="Ajouter un Paiement" type="number" value={newPaymentAmount} onChange={e => setNewPaymentAmount(parseFloat(e.target.value) || 0)} max={order.total - order.paidAmount} />
                                    <div className="flex gap-2">
                                        <Select label="" value={newPaymentMethod} onChange={e => setNewPaymentMethod(e.target.value as any)} className="flex-grow">
                                            <option>Espèces</option><option>Mobile Money</option><option>Carte de crédit</option>
                                        </Select>
                                        <Button type="submit">Ajouter</Button>
                                    </div>
                                </form>
                            )}
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-800 mb-2">Historique des Paiements</h4>
                            {payments.length > 0 ? (
                                <ul className="space-y-2 text-sm text-gray-600 max-h-48 overflow-y-auto pr-2">
                                    {payments.map(p => (
                                        <li key={p.id} className={`p-2 rounded-md ${Number(p.amount) < 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                                            {editingPaymentId === p.id ? (
                                                <div className="space-y-2">
                                                    <div className="grid grid-cols-2 gap-2">
                                                    <Input label="Montant" type="number" value={editedPaymentAmount} onChange={e => setEditedPaymentAmount(parseFloat(e.target.value) || 0)} autoFocus />
                                                    <Select label="Méthode" value={editedPaymentMethod} onChange={e => setEditedPaymentMethod(e.target.value as Payment['method'])}>
                                                        <option>Espèces</option><option>Mobile Money</option><option>Carte de crédit</option>
                                                    </Select>
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="secondary" onClick={handleCancelEditPayment}>Annuler</Button>
                                                        <Button size="sm" onClick={() => handleSavePayment(p.id)}>Enregistrer</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p>{new Date(p.date).toLocaleString()}</p>
                                                        <p className={`font-semibold text-base ${Number(p.amount) < 0 ? 'text-orange-600' : ''}`}>
                                                            {Number(p.amount) < 0 && 'Remboursement: '}
                                                            {Math.abs(Number(p.amount)).toLocaleString()} FCFA 
                                                            <span className="text-xs text-gray-500 font-normal"> ({p.method})</span>
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 no-print">
                                                        {Number(p.amount) > 0 && (
                                                            <>
                                                                <button onClick={() => handleStartEditPayment(p)} className="p-1.5 text-gray-500 hover:text-primary-600 rounded-full hover:bg-gray-100">
                                                                    <PencilIcon className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleDeletePayment(p)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100">
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-center text-gray-500 py-4">Aucun paiement enregistré.</p>}
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-800 mb-2">Échéancier de Paiement</h4>
                            {schedule ? (
                                <div className="space-y-2">
                                    <ul className="space-y-2 text-sm max-h-32 overflow-y-auto pr-2">
                                        {schedule.installments.map((inst, index) => (
                                        <li key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                            <div>
                                                <p>Échéance: <span className="font-semibold">{new Date(inst.dueDate).toLocaleDateString()}</span></p>
                                                <p>Montant: <span className="font-semibold">{Number(inst.amount).toLocaleString()} FCFA</span></p>
                                            </div>
                                            <div>
                                            {inst.status === 'Payé' ? (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Payé</span>
                                            ) : (
                                                <Button size="sm" onClick={() => handlePayInstallment(index)} className="no-print">
                                                    <CashIcon className="w-4 h-4 mr-1"/> Encaisser
                                                </Button>
                                            )}
                                            </div>
                                        </li>
                                        ))}
                                    </ul>
                                    <Button variant="secondary" size="sm" onClick={() => setIsScheduleModalOpen(true)} className="mt-2 no-print">
                                        <PencilIcon className="w-4 h-4 mr-1"/> Modifier l'échéancier
                                    </Button>
                                </div>
                            ) : (
                                order.paymentStatus !== 'Payé' && (
                                <div className="text-center py-4 bg-gray-50 rounded-md no-print">
                                    <p className="text-sm text-gray-500 mb-2">Aucun échéancier défini.</p>
                                    <Button variant="secondary" size="sm" onClick={() => setIsScheduleModalOpen(true)}>Créer un échéancier</Button>
                                </div>
                                )
                            )}
                        </div>
                        
                        {order.modificationHistory && order.modificationHistory.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2">Historique des Modifications</h4>
                                <div className="border rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto">
                                    <ul className="space-y-3">
                                        {order.modificationHistory.slice().reverse().map((mod, index) => (
                                            <li key={index} className="flex items-start gap-3 text-sm">
                                                <div>
                                                    <ClockIcon className="w-4 h-4 text-gray-500 mt-0.5" />
                                                </div>
                                                <div>
                                                    <p className="text-gray-700">{mod.description}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(mod.date).toLocaleString('fr-FR', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            

            <div className="flex justify-between items-center pt-4 border-t mt-6 no-print">
                <div className="flex flex-wrap gap-2 items-center">
                    {!isEditing && (
                        <>
                            <Button variant="secondary" onClick={handlePrint}>
                                <DocumentArrowDownIcon className="w-4 h-4 mr-2"/>
                                Exporter en PDF
                            </Button>
                            <Button variant="secondary" onClick={handlePrint}>
                                <PrinterIcon className="w-4 h-4 mr-2"/>
                                Imprimer la Facture
                            </Button>
                             <div title={cancelDisabledReason}>
                                <Button 
                                    variant="danger" 
                                    onClick={handleCancelOrder} 
                                    disabled={isCancelDisabled}
                                    className="!bg-red-200 !text-red-800 hover:!bg-red-300 disabled:!bg-gray-200 disabled:!text-gray-500 disabled:cursor-not-allowed"
                                >
                                    <XMarkIcon className="w-4 h-4 mr-1"/> Annuler
                                </Button>
                            </div>
                        </>
                    )}
                </div>
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <Button variant="secondary" onClick={handleCancelEdit}>Annuler</Button>
                            <Button onClick={handleSaveEdit}>Enregistrer</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="secondary" onClick={onClose}>Fermer</Button>
                            <Button onClick={handleStartEdit}><PencilIcon className="w-4 h-4 mr-1"/> Modifier</Button>
                        </>
                    )}
                </div>
            </div>
        </Modal>
        
        {isVariantModalOpenForEdit && productForVariantSelection && (
            <VariantSelectionModal
                product={productForVariantSelection}
                onClose={() => { setVariantModalOpenForEdit(false); setProductForVariantSelection(null); }}
                onAddToCart={handleAddToCartFromVariantModal}
            />
        )}
        
        {isScheduleModalOpen && (
            <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Gérer l'échéancier de paiement">
                <PaymentScheduleForm order={order} schedule={schedule} onClose={() => setIsScheduleModalOpen(false)} />
            </Modal>
        )}

        <Modal isOpen={installmentToPayIndex !== null} onClose={() => setInstallmentToPayIndex(null)} title="Encaisser l'échéance">
            {installmentToPayIndex !== null && schedule && (
                <div className="space-y-4">
                    <p>Confirmer le paiement de l'échéance de <strong className="text-lg">{Number(schedule.installments[installmentToPayIndex].amount).toLocaleString()} FCFA</strong> due le {new Date(schedule.installments[installmentToPayIndex].dueDate).toLocaleDateString()} ?</p>
                    <Select label="Méthode de paiement" value={paymentMethodForInstallment} onChange={e => setPaymentMethodForInstallment(e.target.value as Payment['method'])}>
                        <option>Espèces</option><option>Mobile Money</option><option>Carte de crédit</option>
                    </Select>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="secondary" onClick={() => setInstallmentToPayIndex(null)}>Annuler</Button>
                        <Button onClick={confirmPayInstallment}>Confirmer Paiement</Button>
                    </div>
                </div>
            )}
        </Modal>

        <Modal isOpen={!!paymentToDelete} onClose={() => setPaymentToDelete(null)} title="Confirmer la suppression">
            {paymentToDelete && (
                <div>
                    <p className="mb-4">Êtes-vous sûr de vouloir supprimer ce paiement de <strong>{Number(paymentToDelete.amount).toLocaleString()} FCFA</strong> ?</p>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setPaymentToDelete(null)}>Annuler</Button>
                        <Button variant="danger" onClick={confirmDeletePayment}>Supprimer</Button>
                    </div>
                </div>
            )}
        </Modal>

        <Modal isOpen={isCancelConfirmOpen} onClose={() => setIsCancelConfirmOpen(false)} title="Confirmer l'Annulation">
            <div>
                <p className="text-gray-700 mb-4">
                    Êtes-vous sûr de vouloir annuler la commande <strong>{order.id.slice(-6)}</strong> ?
                    <br/>
                    Les articles seront retournés en stock. Cette action est irréversible.
                </p>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary" onClick={() => setIsCancelConfirmOpen(false)}>Non, garder la commande</Button>
                    <Button variant="danger" onClick={confirmCancelOrder}>Oui, annuler la commande</Button>
                </div>
            </div>
        </Modal>
        </>
    );
};

interface OrdersPageProps {
    orderToView?: string | null;
    clearOrderToView?: () => void;
}

// Define constant arrays for status filters
const PAYMENT_STATUSES: PaymentStatus[] = ['Payé', 'Partiellement payé', 'En attente', 'Partiellement remboursé', 'Remboursé', 'Annulée'];
const DELIVERY_STATUSES: DeliveryStatus[] = ['En attente', 'En préparation', 'Livrée', 'Partiellement retourné', 'Retourné', 'Annulée', 'Rupture de stock'];


export const OrdersPage: React.FC<OrdersPageProps> = ({ orderToView, clearOrderToView }) => {
    const { state } = useAminaShop();
    const { orders, clients } = state;
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState<string>('all');
    const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all' | 'unpaid'>('all');
    const [deliveryFilter, setDeliveryFilter] = useState<DeliveryStatus | 'all'>('all');
    const [showArchived, setShowArchived] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const intervalId = setInterval(() => {
            setLastRefreshed(new Date());
        }, 30000); // Auto-refresh every 30 seconds
        return () => clearInterval(intervalId);
    }, []);

    const handleRefresh = () => {
        setLastRefreshed(new Date());
    };

    useEffect(() => {
        if (orderToView && clearOrderToView) {
            setSelectedOrderId(orderToView);
            clearOrderToView();
        }
    }, [orderToView, clearOrderToView]);

    const getClientName = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        return client ? `${client.firstName} ${client.lastName}` : 'Client Inconnu';
    };

    const filteredOrders = useMemo(() => {
        return orders
            .filter(order => showArchived ? order.isArchived : !order.isArchived)
            .filter(order => {
                if (clientFilter !== 'all' && order.clientId !== clientFilter) return false;

                if (paymentFilter === 'unpaid') {
                    if (order.paymentStatus !== 'En attente' && order.paymentStatus !== 'Partiellement payé') return false;
                } else if (paymentFilter !== 'all' && order.paymentStatus !== paymentFilter) {
                    return false;
                }

                if (deliveryFilter !== 'all' && order.deliveryStatus !== deliveryFilter) return false;

                const orderDate = new Date(order.date);
                if (startDate) {
                    const start = new Date(startDate);
                    start.setHours(0, 0, 0, 0);
                    if (orderDate < start) return false;
                }
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    if (orderDate > end) return false;
                }
                
                const clientName = getClientName(order.clientId).toLowerCase();
                const searchLower = searchTerm.toLowerCase();
                
                return clientName.includes(searchLower) || order.id.toLowerCase().includes(searchLower);
            })
    }, [orders, searchTerm, paymentFilter, deliveryFilter, showArchived, clients, lastRefreshed, clientFilter, startDate, endDate]);
    
    const augmentedOrders = useMemo(() => filteredOrders.map(order => ({
        ...order,
        clientName: getClientName(order.clientId)
    })), [filteredOrders, clients]);

    const { items: sortedOrders, requestSort, sortConfig } = useSortableData(augmentedOrders, { key: 'date', direction: 'descending' });

    const handleExportCSV = () => {
        if (sortedOrders.length === 0) {
            alert("Aucune donnée à exporter pour la sélection actuelle.");
            return;
        }
    
        const headers = [
            "ID Commande",
            "Date",
            "Client",
            "Total (FCFA)",
            "Encaissé (FCFA)",
            "Solde (FCFA)",
            "Statut Paiement",
            "Statut Livraison"
        ];
    
        const escapeCsvCell = (cellData: any) => {
            const stringData = String(cellData ?? '');
            if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) {
                return `"${stringData.replace(/"/g, '""')}"`;
            }
            return stringData;
        };
        
        const rows = sortedOrders.map(order => [
            order.id,
            new Date(order.date).toLocaleString('fr-FR'),
            order.clientName,
            order.total,
            order.paidAmount,
            (Number(order.total) || 0) - (Number(order.paidAmount) || 0),
            order.paymentStatus,
            order.deliveryStatus
        ].map(escapeCsvCell));
    
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
    
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            const filename = `Rapport_Ventes_${startDate}_au_${endDate}.csv`;
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    return (
        <Card>
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6">
                <h2 className="text-2xl font-serif font-black text-gray-800 shrink-0">Historique des Ventes</h2>
                 <div className="flex flex-wrap items-end gap-2">
                    <Input label="" id="search" placeholder="Rechercher par client/ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-auto" />
                    <Select label="" id="client-filter" value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="w-full sm:w-auto">
                        <option value="all">Tous les clients</option>
                        {clients.sort((a, b) => a.lastName.localeCompare(b.lastName)).map(client => (
                            <option key={client.id} value={client.id}>
                                {client.firstName} {client.lastName}
                            </option>
                        ))}
                    </Select>
                    <Input label="Du" id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full sm:w-auto" />
                    <Input label="Au" id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full sm:w-auto" />
                    <Select label="" id="payment-filter" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value as any)} className="w-full sm:w-auto">
                        <option value="all">Tous paiements</option>
                        <option value="unpaid">Impayées (En attente/Partiel)</option>
                        {PAYMENT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                    </Select>
                     <Select label="" id="delivery-filter" value={deliveryFilter} onChange={e => setDeliveryFilter(e.target.value as any)} className="w-full sm:w-auto">
                        <option value="all">Toutes livraisons</option>
                        {DELIVERY_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                    </Select>
                     <div className="flex items-center p-2 rounded-md bg-gray-50 justify-center">
                        <input
                            id="show-archived"
                            type="checkbox"
                            checked={showArchived}
                            onChange={(e) => setShowArchived(e.target.checked)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="show-archived" className="ml-2 block text-sm text-gray-900 whitespace-nowrap">
                            Afficher archivées
                        </label>
                    </div>
                    <Button variant="secondary" onClick={handleExportCSV}>
                        <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                        Exporter
                    </Button>
                     <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        <Button variant="secondary" size="sm" onClick={handleRefresh} className="!p-1.5" title="Actualiser les données">
                            <ArrowPathIcon className="w-4 h-4" />
                        </Button>
                        <div className="text-xs text-gray-500 whitespace-nowrap pr-1">
                            <p>Mise à jour</p>
                            <p className="font-medium">{lastRefreshed.toLocaleTimeString('fr-FR')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <SortableHeader sortKey="id" title="Commande ID" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="clientName" title="Client" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="date" title="Date" sortConfig={sortConfig} requestSort={requestSort} className="hidden sm:table-cell" />
                            <SortableHeader sortKey="total" title="Total" sortConfig={sortConfig} requestSort={requestSort} textAlignment="right"/>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paiement</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Livraison</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{order.id.slice(-6)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.clientName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{new Date(order.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">{order.total.toLocaleString()} FCFA</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(order.paymentStatus)}`}>
                                        {order.paymentStatus}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm hidden md:table-cell">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(order.deliveryStatus)}`}>
                                        {order.deliveryStatus}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Button variant="secondary" size="sm" onClick={() => setSelectedOrderId(order.id)}>Détails</Button>
                                </td>
                            </tr>
                        ))}
                         {sortedOrders.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-500">Aucune commande ne correspond aux filtres sélectionnés.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {selectedOrderId && <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />}
        </Card>
    );
};