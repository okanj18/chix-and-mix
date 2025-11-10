import React, { useMemo, useState } from 'react';
import { useAminaShop } from '../../context/AminaShopContext';
import { Card, Button } from '../ui/Shared';
import { Module } from '../../types';
import { InventoryIcon, ClientsIcon, POSIcon, OrdersIcon, SuppliersIcon, CreditCardIcon, BellIcon } from '../icons';

interface DashboardProps {
  setActiveModule: (module: Module) => void;
  showClientsWithDebt: () => void;
  viewOrder: (orderId: string) => void;
}

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    onClick?: () => void;
    className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, onClick, className }) => (
  <div onClick={onClick} className={`bg-white rounded-lg shadow-md flex items-center p-4 transition-all duration-300 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''} ${className || ''}`}>
    <div className={`p-3 rounded-full ${color} text-white mr-4`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const QuickLink: React.FC<{ title: string; module: Module; icon: React.ReactNode; onClick: (module: Module) => void; }> = ({ title, module, icon, onClick }) => (
    <button onClick={() => onClick(module)} className="flex flex-col items-center justify-center p-6 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors duration-200">
        <div className="text-primary-600 mb-2">{icon}</div>
        <p className="font-semibold text-primary-700">{title}</p>
    </button>
);


export const Dashboard: React.FC<DashboardProps> = ({ setActiveModule, showClientsWithDebt, viewOrder }) => {
  const { state } = useAminaShop();
  const { products, orders, clients, purchaseOrders, paymentSchedules } = state;

  const [salesPeriod, setSalesPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const salesReportData = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (salesPeriod) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const firstDayOfWeek = new Date(now);
        const day = firstDayOfWeek.getDay();
        const diff = firstDayOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        firstDayOfWeek.setDate(diff);
        startDate = new Date(firstDayOfWeek.getFullYear(), firstDayOfWeek.getMonth(), firstDayOfWeek.getDate());
        break;
      case 'monthly':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
    
    startDate.setHours(0, 0, 0, 0);

    const filteredOrders = orders.filter(order => !order.isArchived && new Date(order.date) >= startDate);

    const totalRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const numberOfSales = filteredOrders.length;
    
    const grossProfit = filteredOrders.reduce((totalProfit, order) => {
      const orderProfit = order.items.reduce((itemProfit, item) => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          return itemProfit + ((Number(item.price) || 0) - (Number(product.purchasePrice) || 0)) * (Number(item.quantity) || 0);
        }
        return itemProfit;
      }, 0);
      return totalProfit + orderProfit - (Number(order.discount) || 0);
    }, 0);

    return { totalRevenue, numberOfSales, grossProfit };
  }, [salesPeriod, orders, products]);


  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const salesToday = orders
    .filter(order => !order.isArchived && new Date(order.date) >= today)
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  const lowStockProducts = products.filter(p => p.stock <= p.alertThreshold).length;

  const supplierDebt = purchaseOrders
    .filter(po => po.paymentStatus !== 'Payé')
    .reduce((sum, po) => sum + (Number(po.total || 0) - Number(po.paidAmount || 0)), 0);
    
  const clientDebt = orders
    .filter(order => !order.isArchived && order.paymentStatus !== 'Payé')
    .reduce((sum, order) => sum + (Number(order.total || 0) - Number(order.paidAmount || 0)), 0);

  const paymentReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reminders: any[] = [];
    
    paymentSchedules.forEach(schedule => {
        const order = orders.find(o => o.id === schedule.orderId);
        if (!order || order.isArchived) return;

        const client = clients.find(c => c.id === order.clientId);
        if (!client) return;

        schedule.installments.forEach(installment => {
            if (installment.status === 'En attente') {
                const dueDate = new Date(installment.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                
                const diffTime = dueDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Overdue or due within the next 7 days
                if (diffDays <= 7) {
                    reminders.push({
                        orderId: order.id,
                        clientName: `${client.firstName} ${client.lastName}`,
                        clientPhone: client.phone,
                        clientEmail: client.email,
                        amount: installment.amount,
                        dueDate: installment.dueDate,
                        diffDays: diffDays,
                    });
                }
            }
        });
    });

    return reminders.sort((a, b) => a.diffDays - b.diffDays);
  }, [paymentSchedules, orders, clients]);

  const recentOrders = orders.filter(o => !o.isArchived).slice(0, 5);
  
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : 'Client Inconnu';
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black tracking-wide">
                <span className="text-primary-900">CHIC </span>
                <span className="text-primary-500 italic">&amp;</span>
                <span className="text-primary-900"> MIX</span>
            </h1>
            <div className="mt-2 h-1.5 w-48 sm:w-56 lg:w-64 bg-primary-300 rounded-full" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif font-black text-gray-800">Bienvenue, Amina !</h2>
        <p className="text-gray-500 mt-1">Voici un aperçu de votre boutique aujourd'hui.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <StatCard title="Ventes Aujourd'hui" value={`${salesToday.toLocaleString()} FCFA`} icon={<OrdersIcon/>} color="bg-emerald-500" />
        <StatCard 
            title="Crédits Clients" 
            value={`${clientDebt.toLocaleString()} FCFA`} 
            icon={<CreditCardIcon/>} 
            color="bg-amber-500" 
            onClick={showClientsWithDebt}
            className={clientDebt > 50000 ? 'animate-pulse ring-2 ring-orange-400' : ''}
        />
        <StatCard title="Dettes Fournisseurs" value={`${supplierDebt.toLocaleString()} FCFA`} icon={<SuppliersIcon/>} color="bg-rose-500" />
        <StatCard title="Produits en Alerte Stock" value={lowStockProducts.toString()} icon={<InventoryIcon/>} color="bg-yellow-400" />
        <StatCard title="Nombre de Clients" value={clients.length.toString()} icon={<ClientsIcon/>} color="bg-sky-500" />
      </div>
      
       {/* Quick Links & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
             <div>
                 <h3 className="text-xl font-semibold text-gray-800 mb-4">Accès Rapide</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <QuickLink title="Nouvelle Vente" module="productList" icon={<POSIcon/>} onClick={setActiveModule} />
                    <QuickLink title="Marchandises" module="inventory" icon={<InventoryIcon/>} onClick={setActiveModule} />
                    <QuickLink title="Clients" module="clients" icon={<ClientsIcon/>} onClick={setActiveModule} />
                    <QuickLink title="Historique des Ventes" module="orders" icon={<OrdersIcon/>} onClick={setActiveModule} />
                 </div>
             </div>
             <Card title="Rapport des Ventes">
              <div className="flex justify-center p-1 bg-gray-100 rounded-lg mb-4">
                <Button size="sm" variant={salesPeriod === 'daily' ? 'primary' : 'secondary'} onClick={() => setSalesPeriod('daily')} className={`${salesPeriod === 'daily' ? 'shadow-sm' : '!shadow-none'} flex-1`}>Jour</Button>
                <Button size="sm" variant={salesPeriod === 'weekly' ? 'primary' : 'secondary'} onClick={() => setSalesPeriod('weekly')} className={`${salesPeriod === 'weekly' ? 'shadow-sm' : '!shadow-none'} flex-1`}>Semaine</Button>
                <Button size="sm" variant={salesPeriod === 'monthly' ? 'primary' : 'secondary'} onClick={() => setSalesPeriod('monthly')} className={`${salesPeriod === 'monthly' ? 'shadow-sm' : '!shadow-none'} flex-1`}>Mois</Button>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">Chiffre d'affaires</p>
                  <p className="text-lg font-bold text-gray-800">{salesReportData.totalRevenue.toLocaleString()} FCFA</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">Nombre de ventes</p>
                  <p className="text-lg font-bold text-gray-800">{salesReportData.numberOfSales}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">Bénéfice brut estimé</p>
                  <p className="text-lg font-bold text-green-600">{salesReportData.grossProfit.toLocaleString()} FCFA</p>
                </div>
              </div>
            </Card>
        </div>
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <div className="flex items-center mb-4">
                    <div className="p-2 bg-yellow-100 rounded-full mr-3"><BellIcon className="h-5 w-5 text-yellow-600"/></div>
                    <h3 className="text-xl font-semibold text-gray-800">Rappels de Paiement</h3>
                </div>
                {paymentReminders.length > 0 ? (
                    <ul className="divide-y divide-yellow-200 max-h-96 overflow-y-auto pr-2">
                        {paymentReminders.map((reminder, index) => (
                        <li key={index} className="py-3 px-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <p className="font-semibold text-gray-800">{reminder.clientName}</p>
                                <p className="text-lg font-bold text-gray-900">{reminder.amount.toLocaleString()} FCFA</p>
                                <p className={`text-sm font-medium ${reminder.diffDays < 0 ? 'text-red-600' : 'text-yellow-800'}`}>
                                {reminder.diffDays < 0 
                                    ? `En retard de ${Math.abs(reminder.diffDays)} jour(s)`
                                    : (reminder.diffDays === 0 ? `Aujourd'hui` : `Dans ${reminder.diffDays} jour(s)`)
                                }
                                <span className="text-gray-500 font-normal"> - {new Date(reminder.dueDate).toLocaleDateString()}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-center">
                                <Button variant="secondary" size="sm" onClick={() => window.location.href = `tel:${reminder.clientPhone}`}>Contacter</Button>
                                <Button size="sm" onClick={() => viewOrder(reminder.orderId)}>Voir la vente</Button>
                            </div>
                            </div>
                        </li>
                        ))}
                    </ul>
                    ) : (
                    <div className="text-center py-6">
                        <BellIcon className="mx-auto h-8 w-8 text-green-500" />
                        <p className="mt-2 text-sm text-gray-600">Aucun rappel de paiement pour le moment.</p>
                        <p className="text-xs text-gray-500">Toutes les échéances sont à jour.</p>
                    </div>
                )}
            </Card>
            <Card title="Ventes Récentes">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Client</th>
                      <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Total</th>
                      <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(order => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-800">{getClientName(order.clientId)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{(Number(order.total) || 0).toLocaleString()} FCFA</td>
                        <td className="py-3 px-4 text-sm">
                           <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.paymentStatus === 'Payé' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {order.paymentStatus}
                           </span>
                        </td>
                      </tr>
                    ))}
                     {recentOrders.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center py-4 text-gray-500">Aucune vente récente.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
        </div>
      </div>
    </div>
  );
};