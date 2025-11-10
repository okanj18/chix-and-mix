import React, { useState, useEffect } from 'react';
import { PurchaseOrder, PurchaseOrderItem } from '../../types';
import { useAminaShop } from '../../context/AminaShopContext';
import { Button, Input } from '../ui/Shared';

interface ReceivePOFormProps {
    purchaseOrder: PurchaseOrder;
    onClose: () => void;
    onSubmit: (receivedItems: Array<{ item: PurchaseOrderItem; quantityToReceive: number }>) => void;
}

interface ReceptionItemState {
    item: PurchaseOrderItem;
    quantityToReceive: number;
}

export const ReceivePOForm: React.FC<ReceivePOFormProps> = ({ purchaseOrder, onClose, onSubmit }) => {
    const { state } = useAminaShop();
    const [receptionState, setReceptionState] = useState<ReceptionItemState[]>([]);

    useEffect(() => {
        const initialState = purchaseOrder.items.map(item => ({
            item: item,
            quantityToReceive: item.quantity - item.quantityReceived,
        }));
        setReceptionState(initialState);
    }, [purchaseOrder]);

    const handleQuantityChange = (index: number, value: string) => {
        const newQuantity = parseInt(value, 10) || 0;
        const originalItem = receptionState[index].item;
        const maxReceivable = originalItem.quantity - originalItem.quantityReceived;

        if (newQuantity < 0 || newQuantity > maxReceivable) return;

        const newState = [...receptionState];
        newState[index].quantityToReceive = newQuantity;
        setReceptionState(newState);
    };

    const getProductName = (productId: string) => state.products.find(p => p.id === productId)?.name || 'N/A';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const itemsToSubmit = receptionState.filter(rs => rs.quantityToReceive > 0);
        if (itemsToSubmit.length === 0) {
            alert("Veuillez saisir une quantité pour au moins un article.");
            return;
        }
        onSubmit(itemsToSubmit);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">
                Saisissez les quantités reçues pour chaque article. Le stock sera mis à jour en conséquence.
            </p>
            <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                {receptionState.map((rs, index) => {
                    const remaining = rs.item.quantity - rs.item.quantityReceived;
                    const variantString = (rs.item.size || rs.item.color) ? ` (${rs.item.size || ''}${rs.item.size && rs.item.color ? ', ' : ''}${rs.item.color || ''})` : '';
                    
                    if (remaining <= 0) return null;

                    return (
                        <div key={`${rs.item.productId}-${rs.item.size}-${rs.item.color}`} className="p-3 bg-gray-50 border rounded-lg">
                           <p className="font-semibold">{getProductName(rs.item.productId)}{variantString}</p>
                           <div className="grid grid-cols-3 gap-4 text-sm mt-2 items-end">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">Commandé</label>
                                    <p className="font-bold">{rs.item.quantity}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">Déjà Reçu</label>
                                    <p className="font-bold">{rs.item.quantityReceived}</p>
                                </div>
                                <Input 
                                    label="Quantité à Réceptionner" 
                                    type="number" 
                                    value={rs.quantityToReceive}
                                    onChange={e => handleQuantityChange(index, e.target.value)}
                                    min="0"
                                    max={remaining}
                                    required
                                    autoFocus={index === 0}
                                />
                           </div>
                        </div>
                    )
                })}
            </div>
             <div className="flex justify-end gap-2 mt-6 border-t pt-4">
                <Button variant="secondary" type="button" onClick={onClose}>Annuler</Button>
                <Button variant="primary" type="submit">Confirmer la Réception</Button>
            </div>
        </form>
    );
};
