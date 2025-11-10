
import React, { useState, useMemo } from 'react';
import { useAminaShop } from '../../context/AminaShopContext';
import { Order, PaymentSchedule, Installment } from '../../types';
import { Button, Input } from '../ui/Shared';
import { PlusIcon, TrashIcon } from '../icons';

interface PaymentScheduleFormProps {
    order: Order;
    schedule?: PaymentSchedule | null;
    onClose: () => void;
}

// Use a simple object for form state to avoid issues with Date object references
type FormInstallment = { 
    dueDate: string; // Use string for input compatibility
    amount: number;
    key: number; 
};

export const PaymentScheduleForm: React.FC<PaymentScheduleFormProps> = ({ order, schedule, onClose }) => {
    const { actions } = useAminaShop();
    
    const formatDateForInput = (date: Date): string => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = (`0${d.getMonth() + 1}`).slice(-2);
        const day = (`0${d.getDate()}`).slice(-2);
        return `${year}-${month}-${day}`;
    };

    const [installments, setInstallments] = useState<FormInstallment[]>(() => {
        const remainingBalance = (Number(order.total) || 0) - (Number(order.paidAmount) || 0);
        if (schedule?.installments?.length) {
            return schedule.installments.map(i => ({ 
                ...i, 
                dueDate: formatDateForInput(new Date(i.dueDate)), 
                key: Math.random() 
            }));
        }
        // Default to one installment for the remaining balance
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return [{ key: Date.now(), dueDate: formatDateForInput(tomorrow), amount: remainingBalance > 0 ? remainingBalance : 0 }];
    });

    const handleDateChange = (key: number, dateStr: string) => {
        setInstallments(current => current.map(i => i.key === key ? { ...i, dueDate: dateStr } : i));
    };

    const handleAmountChange = (key: number, amountStr: string) => {
        const amount = parseFloat(amountStr) || 0;
        setInstallments(current => current.map(i => i.key === key ? { ...i, amount } : i));
    };

    const addInstallment = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setInstallments(current => [...current, { key: Date.now(), dueDate: formatDateForInput(tomorrow), amount: 0 }]);
    };
    
    const removeInstallment = (key: number) => {
        setInstallments(current => current.filter(i => i.key !== key));
    };

    const remainingBalance = (Number(order.total) || 0) - (Number(order.paidAmount) || 0);
    const installmentsTotal = useMemo(() => installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0), [installments]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalInstallments: Omit<Installment, 'status'>[] = installments
            .filter(i => Number(i.amount) > 0)
            .map(({ key, ...rest }) => ({ ...rest, dueDate: new Date(rest.dueDate), amount: Number(rest.amount) }));

        if (finalInstallments.length === 0 && remainingBalance > 0) {
            alert("Veuillez définir au moins une échéance avec un montant valide.");
            return;
        }

        if (schedule) {
            actions.updatePaymentSchedule(order.id, finalInstallments);
        } else {
            actions.createPaymentSchedule(order.id, finalInstallments);
        }
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <p>Solde restant à payer : <strong className="text-lg">{remainingBalance.toLocaleString()} FCFA</strong></p>
                <p>Total des échéances : <strong className={`text-lg ${Math.round(installmentsTotal) !== Math.round(remainingBalance) ? 'text-red-600' : 'text-green-600'}`}>{installmentsTotal.toLocaleString()} FCFA</strong></p>
                {Math.round(installmentsTotal) !== Math.round(remainingBalance) && <p className="text-xs text-red-500 mt-1">Le total des échéances ne correspond pas au solde restant.</p>}
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {installments.map(inst => (
                    <div key={inst.key} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-md bg-gray-50">
                        <div className="col-span-6">
                            <Input label="Date d'échéance" type="date" value={inst.dueDate} onChange={e => handleDateChange(inst.key, e.target.value)} required />
                        </div>
                        <div className="col-span-5">
                            <Input label="Montant (FCFA)" type="number" value={inst.amount} onChange={e => handleAmountChange(inst.key, e.target.value)} required min="0" />
                        </div>
                        <div className="col-span-1 flex justify-end">
                            {installments.length > 1 && (
                                <button type="button" onClick={() => removeInstallment(inst.key)} className="p-2 text-red-500 hover:text-red-700" aria-label="Supprimer l'échéance">
                                    <TrashIcon />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addInstallment}><PlusIcon className="w-4 h-4 mr-1" /> Ajouter une échéance</Button>

            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                <Button type="submit">Enregistrer l'échéancier</Button>
            </div>
        </form>
    );
};
