import React, { useState, useMemo } from 'react';
import { useAminaShop } from '../../context/AminaShopContext';
import { PurchaseOrderItem, PurchaseOrder } from '../../types';
import { Button, Input, Select, Textarea } from '../ui/Shared';
import { PlusIcon, TrashIcon } from '../icons';

interface PurchaseOrderFormProps {
    onClose: () => void;
    purchaseOrder?: PurchaseOrder;
    initialSupplierId?: string;
    initialItems?: Omit<PurchaseOrderItem, 'quantityReceived'>[];
}

type FormItem = Omit<PurchaseOrderItem, 'quantityReceived'> & { key: number };

export const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({ onClose, purchaseOrder, initialSupplierId, initialItems }) => {
    const { state, actions } = useAminaShop();
    const isEditMode = !!purchaseOrder;
    const canEditItems = !isEditMode || (purchaseOrder && purchaseOrder.status !== 'Reçue totalement');
    const supplierIsPreselected = !!initialSupplierId;

    const [supplierId, setSupplierId] = useState<string>(purchaseOrder?.supplierId || initialSupplierId || '');
    const [notes, setNotes] = useState<string>(purchaseOrder?.notes || '');
    
    const [items, setItems] = useState<FormItem[]>(() => {
        if (purchaseOrder?.items) {
            return purchaseOrder.items.map(item => ({ ...item, key: Math.random() }));
        }
        if (initialItems) {
            return initialItems.map(item => ({ ...item, key: Math.random() }));
        }
        return [{ key: Date.now(), productId: '', quantity: 1, purchasePrice: 0, size: '', color: '' }];
    });


    const handleItemChange = (key: number, field: keyof FormItem, value: any) => {
        setItems(currentItems => currentItems.map(item => {
            if (item.key === key) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'productId') {
                    const product = state.products.find(p => p.id === value);
                    updatedItem.purchasePrice = product?.purchasePrice || 0;
                    updatedItem.size = ''; // Reset variant selection
                    updatedItem.color = '';
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const addItem = () => {
        setItems([...items, { key: Date.now(), productId: '', quantity: 1, purchasePrice: 0, size: '', color: '' }]);
    };

    const removeItem = (key: number) => {
        setItems(items.filter(item => item.key !== key));
    };

    const total = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);
    }, [items]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalItems = items.filter(i => i.productId && i.quantity > 0);

        if (!supplierId || finalItems.length === 0) {
            alert("Veuillez sélectionner un fournisseur et ajouter au moins un produit avec une quantité valide.");
            return;
        }

        const purchaseOrderItems: PurchaseOrderItem[] = finalItems.map(({ key, ...item }) => {
            const originalItem = purchaseOrder?.items.find(oi => oi.productId === item.productId && oi.size === item.size && oi.color === item.color);
            return {
                ...item,
                quantityReceived: originalItem ? originalItem.quantityReceived : 0,
            };
        });

        if (isEditMode) {
            actions.updatePurchaseOrder({
                ...purchaseOrder,
                supplierId,
                items: purchaseOrderItems,
                total,
                notes,
            });
        } else {
            actions.addPurchaseOrder({
                supplierId,
                items: purchaseOrderItems,
                total,
                notes,
            });
        }
        onClose();
    };

    const renderVariantSelectors = (item: FormItem) => {
        const product = state.products.find(p => p.id === item.productId);
        if (!product || !product.variants || product.variants.length === 0) return null;

        const sizes = [...new Set(product.variants.map(v => v.size).filter(Boolean))];
        const colors = [...new Set(product.variants.filter(v => !item.size || v.size === item.size).map(v => v.color).filter(Boolean))];

        return (
            <div className="col-span-12 grid grid-cols-2 gap-2 mt-1">
                {sizes.length > 0 && (
                    <Select label="Taille" value={item.size} onChange={e => handleItemChange(item.key, 'size', e.target.value)} disabled={!canEditItems}>
                        <option value="">--</option>
                        {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                )}
                {colors.length > 0 && (
                     <Select label="Couleur" value={item.color} onChange={e => handleItemChange(item.key, 'color', e.target.value)} disabled={!canEditItems}>
                        <option value="">--</option>
                        {colors.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                )}
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Select label="Fournisseur" value={supplierId} onChange={e => setSupplierId(e.target.value)} required disabled={isEditMode || supplierIsPreselected}>
                <option value="">Sélectionner un fournisseur</option>
                {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}
            </Select>

            <div className="flex justify-between items-center border-t pt-4">
                <h4 className="font-semibold text-gray-800">Articles</h4>
                {!canEditItems && <p className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded-md">Les articles ne peuvent plus être modifiés car la commande est marquée comme "Reçue totalement".</p>}
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {items.map(item => (
                    <div key={item.key} className="p-3 border rounded-lg bg-gray-50">
                        <div className="grid grid-cols-12 gap-2 items-start">
                            <div className="col-span-5">
                                <Select label="Produit" value={item.productId} onChange={e => handleItemChange(item.key, 'productId', e.target.value)} required disabled={!canEditItems}>
                                    <option value="">Choisir un produit</option>
                                    {state.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </Select>
                            </div>
                            <div className="col-span-3">
                                <Input label="Prix d'achat" type="number" value={item.purchasePrice} onChange={e => handleItemChange(item.key, 'purchasePrice', parseFloat(e.target.value) || 0)} required disabled={!canEditItems} />
                            </div>
                            <div className="col-span-2">
                                <Input label="Quantité" type="number" value={item.quantity} onChange={e => handleItemChange(item.key, 'quantity', parseInt(e.target.value, 10) || 1)} min="1" required disabled={!canEditItems} />
                            </div>
                            <div className="col-span-2 flex items-end justify-end h-full">
                                <button type="button" onClick={() => removeItem(item.key)} className="p-2 text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed" aria-label="Supprimer l'article" disabled={!canEditItems}>
                                    <TrashIcon />
                                </button>
                            </div>
                             {renderVariantSelectors(item)}
                        </div>
                    </div>
                ))}
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addItem} disabled={!canEditItems}><PlusIcon className="w-4 h-4 mr-1"/> Ajouter un article</Button>

            <Textarea
                label="Notes (optionnel)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Ajoutez des commentaires sur la commande, la livraison, etc."
            />

            <div className="border-t pt-4 text-right">
                <p className="text-xl font-bold">Total: {total.toLocaleString()} FCFA</p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                <Button type="submit">{isEditMode ? "Mettre à jour" : "Créer le Bon de Commande"}</Button>
            </div>
        </form>
    );
};