
import React, { useState, useEffect } from 'react';
import { AminaShopProvider, useAminaShop } from './context/AminaShopContext';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './components/pages/Dashboard';
import { InventoryPage } from './components/pages/InventoryPage';
import { ClientsPage } from './components/pages/ClientsPage';
import { SuppliersPage } from './components/pages/SuppliersPage';
import { PointOfSalePage } from './components/pages/PointOfSalePage';
import { OrdersPage } from './components/pages/OrdersPage';
import { ReplenishmentPage } from './components/pages/ReplenishmentPage';
import { ReportsPage } from './components/pages/ReportsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { LoginPage } from './components/pages/LoginPage';
import { Module, Notification, User } from './types';
import { permissions } from './components/utils/permissions';

const AppContent: React.FC = () => {
  const { state, actions } = useAminaShop();
  const { currentUser, backupSettings } = state;

  const [activeModule, setActiveModule] = useState<Module>('dashboard');
  const [clientPageFilter, setClientPageFilter] = useState<'all' | 'debt'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [orderToView, setOrderToView] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const addNotification = (message: string) => {
    const newNotification: Notification = {
      id: Date.now(),
      message,
      read: false,
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 10));
  };
  
  useEffect(() => {
    const backupInterval = setInterval(() => {
      if (!backupSettings.enabled) return;

      const now = new Date();
      const [hours, minutes] = backupSettings.time.split(':').map(Number);
      
      const scheduledTimeToday = new Date();
      scheduledTimeToday.setHours(hours, minutes, 0, 0);

      const lastBackup = backupSettings.lastBackupTimestamp ? new Date(backupSettings.lastBackupTimestamp) : new Date(0);

      const isTimeForBackup = now >= scheduledTimeToday && lastBackup < scheduledTimeToday;

      if (isTimeForBackup) {
          const hoursSinceLastBackup = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);
          
          let shouldBackup = false;
          if (backupSettings.frequency === 'daily' && hoursSinceLastBackup >= 23) {
            shouldBackup = true;
          } else if (backupSettings.frequency === 'weekly' && hoursSinceLastBackup >= (24 * 7 - 1)) {
            shouldBackup = true;
          }

          if (shouldBackup) {
              console.log('Déclenchement de la sauvegarde automatique...');
              try {
                const { currentUser, ...stateToSave } = state;
                const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                    JSON.stringify(stateToSave, null, 2)
                )}`;
                const link = document.createElement("a");
                link.href = jsonString;
                const date = new Date().toISOString().slice(0, 10);
                link.download = `chicandmix_backup_auto_${date}.json`;
                link.click();

                actions.updateLastBackupTimestamp(Date.now());
                addNotification("Sauvegarde automatique des données effectuée avec succès.");
              } catch (error) {
                  console.error("Échec de la sauvegarde automatique :", error);
                  addNotification("Erreur : La sauvegarde automatique a échoué.");
              }
          }
      }

    }, 60000); // Check every minute

    return () => clearInterval(backupInterval);
  }, [backupSettings, state, actions, addNotification]);


  if (!currentUser) {
    return <LoginPage />;
  }
  
  const userPermissions = permissions[currentUser.role];

  const handleSetActiveModule = (module: Module) => {
    if (activeModule === 'clients' && module !== 'clients') {
      setClientPageFilter('all');
    }
    if (module !== 'orders') {
        setOrderToView(null);
    }
    setActiveModule(module);
    setIsSidebarOpen(false); // Close sidebar on navigation
  };

  const showClientsWithDebt = () => {
    setClientPageFilter('debt');
    setActiveModule('clients');
  };

  const handleViewOrder = (orderId: string) => {
    setOrderToView(orderId);
    handleSetActiveModule('orders');
  };

  const markNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const renderModule = () => {
    if (!userPermissions[activeModule]) {
        return <Dashboard setActiveModule={handleSetActiveModule} showClientsWithDebt={showClientsWithDebt} viewOrder={handleViewOrder} />;
    }

    switch (activeModule) {
      case 'dashboard':
        return <Dashboard setActiveModule={handleSetActiveModule} showClientsWithDebt={showClientsWithDebt} viewOrder={handleViewOrder} />;
      case 'inventory':
        return <InventoryPage />;
      case 'clients':
        return <ClientsPage filter={clientPageFilter} setFilter={setClientPageFilter} />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'productList':
        return <PointOfSalePage />;
      case 'orders':
        return <OrdersPage orderToView={orderToView} clearOrderToView={() => setOrderToView(null)} />;
      case 'approvisionnement':
        return <ReplenishmentPage />;
      case 'reports':
        return <ReportsPage addNotification={addNotification} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard setActiveModule={handleSetActiveModule} showClientsWithDebt={showClientsWithDebt} viewOrder={handleViewOrder} />;
    }
  };

  return (
    <div className="min-h-screen flex">
      <MainLayout 
        activeModule={activeModule} 
        setActiveModule={handleSetActiveModule}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        notifications={notifications}
        markNotificationsAsRead={markNotificationsAsRead}
      >
        {renderModule()}
      </MainLayout>
    </div>
  );
};


const App: React.FC = () => {
  return (
    <AminaShopProvider>
      <AppContent />
    </AminaShopProvider>
  );
};

export default App;