import React, { useState, useMemo } from 'react';
import { useAminaShop } from '../../context/AminaShopContext';
import { Card, Input, Select, useSortableData, SortableHeader, Button, Modal } from '../ui/Shared';
import { Order, PaymentStatus, DeliveryStatus } from '../../types';
import { CreditCardIcon, AlertIcon, OrdersIcon, POSIcon, ReportsIcon, CashIcon, BeakerIcon, DocumentArrowDownIcon } from '../icons';
import { GoogleGenAI } from "@google/genai";

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string; }> = ({ title, value, icon, color }) => (
    <Card className="flex items-center p-4">
        <div className={`p-3 rounded-full ${color} text-white mr-4`}>
            {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6"})}
        </div>
        <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </Card>
);

const getPaymentStatusClass = (status: PaymentStatus) => {
    switch (status) {
        case 'Payé': return 'bg-emerald-100 text-emerald-800';
        case 'En attente': return 'bg-amber-100 text-amber-800';
        case 'Partiellement payé': return 'bg-sky-100 text-sky-800';
        case 'Annulée': return 'bg-rose-100 text-rose-800';
        case 'Remboursé': return 'bg-gray-100 text-gray-800';
        case 'Partiellement remboursé': return 'bg-violet-100 text-violet-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const getDeliveryStatusClass = (status: DeliveryStatus) => {
    switch (status) {
        case 'Livrée': return 'bg-emerald-100 text-emerald-800';
        case 'En attente': return 'bg-amber-100 text-amber-800';
        case 'En préparation': return 'bg-sky-100 text-sky-800';
        case 'Annulée':
        case 'Rupture de stock': return 'bg-rose-100 text-rose-800';
        case 'Partiellement retourné':
        case 'Retourné': return 'bg-violet-100 text-violet-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};


type OrderWithDetails = Order & {
    clientName: string;
    balance: number;
};

interface ReportsPageProps {
    addNotification: (message: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ addNotification }) => {
    const { state } = useAminaShop();
    const { orders, products, clients } = state;

    const formatDateForInput = (date: Date): string => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = (`0${d.getMonth() + 1}`).slice(-2);
        const day = (`0${d.getDate()}`).slice(-2);
        return `${year}-${month}-${day}`;
    };

    const getInitialMonthRange = () => {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
            start: formatDateForInput(start),
            end: formatDateForInput(end)
        };
    };
    
    const [period, setPeriod] = useState<'custom' | 'this_week' | 'this_month' | 'this_year'>('this_month');
    const [startDate, setStartDate] = useState(getInitialMonthRange().start);
    const [endDate, setEndDate] = useState(getInitialMonthRange().end);
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | 'Tous'>('Tous');
    const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<DeliveryStatus | 'Tous'>('Tous');

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);


    const handlePeriodChange = (newPeriod: 'custom' | 'this_week' | 'this_month' | 'this_year') => {
        setPeriod(newPeriod);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let start, end;

        switch (newPeriod) {
            case 'this_week': {
                const firstDay = new Date(today);
                const day = firstDay.getDay();
                const diff = firstDay.getDate() - day + (day === 0 ? -6 : 1); // Monday is start of week
                start = new Date(firstDay.setDate(diff));
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                break;
            }
            case 'this_month': {
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            }
            case 'this_year': {
                start = new Date(today.getFullYear(), 0, 1);
                end = new Date(today.getFullYear(), 11, 31);
                break;
            }
            case 'custom':
            default:
                return;
        }
        setStartDate(formatDateForInput(start));
        setEndDate(formatDateForInput(end));
    };

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setStartDate(e.target.value);
        setPeriod('custom');
    };
    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEndDate(e.target.value);
        setPeriod('custom');
    };

    const filteredOrders = useMemo(() => {
        if (!startDate || !endDate) return [];

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return orders.filter(order => {
            const orderDate = new Date(order.date);
            const isWithinDateRange = !order.isArchived && orderDate >= start && orderDate <= end;
            const matchesPaymentStatus = paymentStatusFilter === 'Tous' || order.paymentStatus === paymentStatusFilter;
            const matchesDeliveryStatus = deliveryStatusFilter === 'Tous' || order.deliveryStatus === deliveryStatusFilter;
            return isWithinDateRange && matchesPaymentStatus && matchesDeliveryStatus;
        });
    }, [startDate, endDate, paymentStatusFilter, deliveryStatusFilter, orders]);

    const reportStats = useMemo(() => {
        const activeOrders = filteredOrders.filter(o => o.paymentStatus !== 'Annulée' && o.paymentStatus !== 'Remboursé');
        const totalRevenue = activeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        const totalPaid = activeOrders.reduce((sum, order) => sum + Number(order.paidAmount || 0), 0);
        const remainingBalance = totalRevenue - totalPaid;
        const numberOfSales = activeOrders.length;
        const averageOrderValue = numberOfSales > 0 ? totalRevenue / numberOfSales : 0;
        
        const grossProfit = activeOrders.reduce((totalProfit, order) => {
            const orderProfit = order.items.reduce((itemProfit, item) => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    const price = Number(item.price || 0);
                    const purchasePrice = Number(product.purchasePrice || 0);
                    const quantity = Number(item.quantity || 0);
                    return itemProfit + (price - purchasePrice) * quantity;
                }
                return itemProfit;
            }, 0);
            return totalProfit + orderProfit - Number(order.discount || 0);
        }, 0);

        return { totalRevenue, totalPaid, remainingBalance, numberOfSales, averageOrderValue, grossProfit };
    }, [filteredOrders, products]);

    const getClientName = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        return client ? `${client.firstName} ${client.lastName}` : 'Client Inconnu';
    };

    const ordersForTable = useMemo(() => filteredOrders.map(order => ({
        ...order,
        clientName: getClientName(order.clientId),
        balance: Number(order.total || 0) - Number(order.paidAmount || 0),
    })), [filteredOrders, clients]);

    const { items: sortedOrders, requestSort, sortConfig } = useSortableData<OrderWithDetails>(ordersForTable, { key: 'date', direction: 'descending' });

    const getProductName = (productId: string) => {
        const product = products.find(p => p.id === productId);
        return product ? product.name : 'Produit Inconnu';
    };

    const downloadCSV = (headers: string[], data: (string | number)[][], filename: string) => {
        if (data.length === 0) {
            alert("Aucune donnée à exporter pour la sélection actuelle.");
            return;
        }

        const escapeCsvCell = (cellData: any) => {
            const stringData = String(cellData ?? '');
            if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) {
                return `"${stringData.replace(/"/g, '""')}"`;
            }
            return stringData;
        };
    
        const rows = data.map(row => row.map(escapeCsvCell).join(','));
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
    
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    const exportSalesList = () => {
        const headers = ["ID Commande", "Date", "Client", "Total (FCFA)", "Encaissé (FCFA)", "Solde (FCFA)", "Statut Paiement", "Statut Livraison"];
        const data = sortedOrders.map(order => [
            order.id,
            new Date(order.date).toLocaleString('fr-FR'),
            order.clientName,
            order.total,
            order.paidAmount,
            order.balance,
            order.paymentStatus,
            order.deliveryStatus
        ]);
        downloadCSV(headers, data, `Liste_Ventes_${startDate}_au_${endDate}.csv`);
    };

    const exportSalesByProduct = () => {
        const activeOrders = filteredOrders.filter(o => o.paymentStatus !== 'Annulée' && o.paymentStatus !== 'Remboursé');
        const productSales = activeOrders
            .flatMap(order => order.items)
            .reduce((acc, item) => {
                const productInfo = acc[item.productId] || { name: getProductName(item.productId), quantity: 0, revenue: 0 };
                productInfo.quantity += Number(item.quantity);
                productInfo.revenue += Number(item.quantity) * Number(item.price);
                acc[item.productId] = productInfo;
                return acc;
            }, {} as Record<string, { name: string; quantity: number; revenue: number }>);
        
        // FIX: Explicitly cast the result of Object.values to correctly type the array for sorting and mapping.
        const sortedProductSales = (Object.values(productSales) as { name: string; quantity: number; revenue: number }[]).sort((a, b) => b.revenue - a.revenue);
        const headers = ["Produit", "Quantité Vendue", "Chiffre d'affaires (FCFA)"];
        const data = sortedProductSales.map(p => [p.name, p.quantity, p.revenue]);
        downloadCSV(headers, data, `Ventes_Par_Produit_${startDate}_au_${endDate}.csv`);
    };

    const exportSalesByClient = () => {
        const activeOrders = filteredOrders.filter(o => o.paymentStatus !== 'Annulée' && o.paymentStatus !== 'Remboursé');
        const clientSales = activeOrders
            .reduce((acc, order) => {
                const clientInfo = acc[order.clientId] || { name: getClientName(order.clientId), orderCount: 0, totalSpent: 0 };
                clientInfo.orderCount += 1;
                clientInfo.totalSpent += Number(order.total);
                acc[order.clientId] = clientInfo;
                return acc;
            }, {} as Record<string, { name: string; orderCount: number; totalSpent: number }>);

        // FIX: Explicitly cast the result of Object.values to correctly type the array for sorting and mapping.
        const sortedClientSales = (Object.values(clientSales) as { name: string; orderCount: number; totalSpent: number }[]).sort((a, b) => b.totalSpent - a.totalSpent);
        const headers = ["Client", "Nombre de Commandes", "Total Dépensé (FCFA)"];
        const data = sortedClientSales.map(c => [c.name, c.orderCount, c.totalSpent]);
        downloadCSV(headers, data, `Ventes_Par_Client_${startDate}_au_${endDate}.csv`);
    };

    const handleAnalysis = async () => {
        setIsAnalyzing(true);
        setAnalysisResult(null);
        setAnalysisError(null);
        try {
            if (!process.env.API_KEY) {
                throw new Error("Clé API non configurée.");
            }

            if (filteredOrders.length === 0) {
                throw new Error("Aucune donnée de vente à analyser pour la période sélectionnée.");
            }

            const topProductsByQuantity = [...filteredOrders]
                .flatMap(o => o.items)
                .reduce((acc, item) => {
                    const currentQty = Number(acc[item.productId]) || 0;
                    const itemQty = Number(item.quantity) || 0;
                    acc[item.productId] = currentQty + itemQty;
                    return acc;
                }, {} as Record<string, number>);
            
            const topProducts = Object.entries(topProductsByQuantity)
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .slice(0, 3)
                .map(([productId]) => getProductName(productId));

            const prompt = `En tant qu'analyste commercial pour une boutique de mode au Sénégal, analyse ce résumé des ventes pour la période du ${startDate} au ${endDate}.
            Fournis un résumé très court (une phrase) et une seule observation clé et actionnable pour la gérante.
            Sois concis, direct et utilise un ton professionnel mais encourageant.
            Ta réponse complète doit faire moins de 60 mots.
            Données:
            - Chiffre d'affaires: ${reportStats.totalRevenue.toLocaleString()} FCFA
            - Nombre de Ventes: ${reportStats.numberOfSales}
            - Panier moyen: ${reportStats.averageOrderValue.toLocaleString(undefined, {maximumFractionDigits: 0})} FCFA
            - Meilleurs produits vendus: ${topProducts.join(', ') || 'N/A'}
            `;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            const text = response.text;
            if (text) {
                setAnalysisResult(text);
                addNotification(text);
            } else {
                throw new Error("La réponse de l'IA est vide ou dans un format inattendu.");
            }

        } catch (err) {
            console.error("Erreur lors de l'analyse IA:", err);
            const errorMessage = (err instanceof Error) ? err.message : "L'analyse IA a échoué. Veuillez vérifier la console pour plus de détails.";
            setAnalysisError(errorMessage);
            addNotification(errorMessage);
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleExportAnalysis = () => {
        if (!analysisResult) {
            alert("Aucune analyse à exporter. Veuillez d'abord lancer l'analyse IA.");
            return;
        }
    
        const fileContent = `Analyse des Ventes - Période du ${startDate} au ${endDate}\n\n` +
                            `--------------------------------------------------\n\n` +
                            `${analysisResult}\n`;
    
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement("a");
    
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            const filename = `Analyse_IA_Ventes_${startDate}_au_${endDate}.txt`;
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
        <div className="space-y-6">
            <Card>
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filtrer par période</label>
                        <div className="flex flex-wrap gap-2">
                            <Button variant={period === 'this_week' ? 'primary' : 'secondary'} size="sm" onClick={() => handlePeriodChange('this_week')}>Cette semaine</Button>
                            <Button variant={period === 'this_month' ? 'primary' : 'secondary'} size="sm" onClick={() => handlePeriodChange('this_month')}>Ce mois-ci</Button>
                            <Button variant={period === 'this_year' ? 'primary' : 'secondary'} size="sm" onClick={() => handlePeriodChange('this_year')}>Cette année</Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            label="Date de début"
                            type="date"
                            value={startDate}
                            onChange={handleStartDateChange}
                        />
                        <Input
                            label="Date de fin"
                            type="date"
                            value={endDate}
                            onChange={handleEndDateChange}
                        />
                        <Select
                            label="Statut de paiement"
                            value={paymentStatusFilter}
                            onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
                        >
                            <option value="Tous">Tous</option>
                            <option value="Payé">Payé</option>
                            <option value="Partiellement payé">Partiellement payé</option>
                            <option value="En attente">En attente</option>
                            <option value="Annulée">Annulée</option>
                            <option value="Remboursé">Remboursé</option>
                            <option value="Partiellement remboursé">Partiellement remboursé</option>
                        </Select>
                        <Select
                            label="Statut de livraison"
                            value={deliveryStatusFilter}
                            onChange={(e) => setDeliveryStatusFilter(e.target.value as any)}
                        >
                            <option value="Tous">Tous</option>
                            <option value="En attente">En attente</option>
                            <option value="En préparation">En préparation</option>
                            <option value="Livrée">Livrée</option>
                            <option value="Annulée">Annulée</option>
                            <option value="Rupture de stock">Rupture de stock</option>
                            <option value="Partiellement retourné">Partiellement retourné</option>
                            <option value="Retourné">Retourné</option>
                        </Select>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Chiffre d'affaires" value={`${reportStats.totalRevenue.toLocaleString()} FCFA`} icon={<CashIcon />} color="bg-sky-500" />
                <StatCard title="Montant Encaissé" value={`${reportStats.totalPaid.toLocaleString()} FCFA`} icon={<CreditCardIcon />} color="bg-emerald-500" />
                <StatCard title="Solde Restant Dû" value={`${reportStats.remainingBalance.toLocaleString()} FCFA`} icon={<AlertIcon />} color="bg-rose-500" />
                <StatCard title="Nombre de Ventes" value={reportStats.numberOfSales.toString()} icon={<OrdersIcon />} color="bg-violet-500" />
                <StatCard title="Panier Moyen" value={`${reportStats.averageOrderValue.toLocaleString(undefined, {maximumFractionDigits: 0})} FCFA`} icon={<POSIcon />} color="bg-indigo-500" />
                <StatCard title="Bénéfice Brut Estimé" value={`${reportStats.grossProfit.toLocaleString()} FCFA`} icon={<ReportsIcon />} color="bg-teal-500" />
            </div>

             {(isAnalyzing || analysisResult || analysisError) && (
                <Card className={analysisError ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}>
                    <div className="flex items-start">
                        <div className={`flex-shrink-0 p-2 rounded-full mr-4 ${analysisError ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                           <BeakerIcon />
                        </div>
                        <div>
                            <h3 className={`text-lg font-semibold ${analysisError ? 'text-red-800' : 'text-blue-800'}`}>
                                {isAnalyzing ? "Analyse en cours..." : "Aperçu de l'Analyste IA"}
                            </h3>
                            {isAnalyzing && (
                                <p className="text-sm text-gray-600 mt-1">Veuillez patienter pendant que l'IA examine vos données de vente...</p>
                            )}
                            {analysisResult && <p className="text-gray-700 mt-2">{analysisResult}</p>}
                            {analysisError && <p className="text-red-700 mt-2">{analysisError}</p>}
                        </div>
                    </div>
                </Card>
            )}

            <Card>
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">Détail des Ventes</h3>
                     <div className="flex flex-wrap gap-2">
                        <Button onClick={handleAnalysis} disabled={isAnalyzing}>
                           {isAnalyzing ? "Analyse..." : <><BeakerIcon className="w-5 h-5 mr-2" /> Analyser les Ventes</>}
                        </Button>
                        <Button onClick={() => setIsExportModalOpen(true)}>
                           <DocumentArrowDownIcon className="w-5 h-5 mr-2" /> Exporter...
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleExportAnalysis}
                            disabled={!analysisResult || isAnalyzing}
                            title={!analysisResult ? "Lancez d'abord une analyse pour pouvoir l'exporter" : "Exporter l'analyse IA"}
                        >
                            Exporter l'Analyse
                        </Button>
                    </div>
                </div>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <SortableHeader sortKey="id" title="ID" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader sortKey="date" title="Date" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader sortKey="clientName" title="Client" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader sortKey="total" title="Total" sortConfig={sortConfig} requestSort={requestSort} textAlignment="right"/>
                                <SortableHeader sortKey="paidAmount" title="Encaissé" sortConfig={sortConfig} requestSort={requestSort} textAlignment="right"/>
                                <SortableHeader sortKey="balance" title="Solde" sortConfig={sortConfig} requestSort={requestSort} textAlignment="right"/>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paiement</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Livraison</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{order.id.slice(-6)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(order.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.clientName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">{(Number(order.total) || 0).toLocaleString()} FCFA</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">{(Number(order.paidAmount) || 0).toLocaleString()} FCFA</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${order.balance > 0 ? 'text-red-600' : 'text-gray-700'}`}>{order.balance.toLocaleString()} FCFA</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusClass(order.paymentStatus)}`}>
                                            {order.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDeliveryStatusClass(order.deliveryStatus)}`}>
                                            {order.deliveryStatus}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                             {sortedOrders.length === 0 && (
                                <tr><td colSpan={8} className="text-center py-8 text-gray-500">Aucune vente ne correspond aux filtres sélectionnés.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Exporter les Données" contentClassName="max-w-md">
                <div className="space-y-4">
                    <p className="text-gray-600">Choisissez le type de rapport à exporter au format CSV pour la période du <strong>{startDate}</strong> au <strong>{endDate}</strong>.</p>
                    <div className="grid grid-cols-1 gap-4">
                        <button onClick={() => { exportSalesList(); setIsExportModalOpen(false); }} className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <h4 className="font-semibold text-gray-800">Liste Détaillée des Ventes</h4>
                            <p className="text-sm text-gray-500">Un fichier CSV avec chaque vente sur une ligne.</p>
                        </button>
                         <button onClick={() => { exportSalesByProduct(); setIsExportModalOpen(false); }} className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <h4 className="font-semibold text-gray-800">Ventes agrégées par Produit</h4>
                            <p className="text-sm text-gray-500">Un résumé des quantités vendues et du chiffre d'affaires par produit.</p>
                        </button>
                         <button onClick={() => { exportSalesByClient(); setIsExportModalOpen(false); }} className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <h4 className="font-semibold text-gray-800">Ventes agrégées par Client</h4>
                            <p className="text-sm text-gray-500">Un résumé des dépenses et du nombre de commandes par client.</p>
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};