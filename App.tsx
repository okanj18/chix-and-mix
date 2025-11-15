import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { LogoProposalsPage } from './components/pages/LogoProposalsPage';
import { Module, Notification } from './types';
import { permissions } from './components/utils/permissions';

const AppContent: React.FC = () => {
  const { state, actions } = useAminaShop();
  const { currentUser } = state;

  const [activeModule, setActiveModule] = useState<Module>('dashboard');
  const [clientPageFilter, setClientPageFilter] = useState<'all' | 'debt'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [orderToView, setOrderToView] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const addNotification = useCallback((message: string) => {
    const newNotification: Notification = {
      id: Date.now(),
      message,
      read: false,
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 10));
  }, []);

  // Use refs to access the latest state and actions inside the interval
  // without making the useEffect dependent on them, which would reset the interval on every state change.
  const latestState = useRef(state);
  const latestActions = useRef(actions);
  useEffect(() => {
    latestState.current = state;
    latestActions.current = actions;
  }); // This effect updates the refs on every render.

  // Destructure backup settings to use as stable dependencies for the effect.
  const { enabled, frequency, time } = state.backupSettings;
  
  useEffect(() => {
    // If backups are not enabled, do nothing.
    if (!enabled) {
      return;
    }

    const backupInterval = setInterval(() => {
        // Inside the interval, always use the latest state and actions from the refs.
        const currentState = latestState.current;
        const currentActions = latestActions.current;

        // Re-check if backups are enabled in case they were turned off.
        if (!currentState.backupSettings.enabled) return;

        const now = new Date();
        const lastBackup = currentState.backupSettings.lastBackupTimestamp 
            ? new Date(currentState.backupSettings.lastBackupTimestamp) 
            : new Date(0);

        // This logic is now robust because it uses the most up-to-date state from the ref.
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastBackupDay = new Date(lastBackup.getFullYear(), lastBackup.getMonth(), lastBackup.getDate());

        if (today > lastBackupDay) {
            const [hours, minutes] = currentState.backupSettings.time.split(':').map(Number);
            
            if (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)) {
                
                const daysSinceLastBackup = (today.getTime() - lastBackupDay.getTime()) / (1000 * 60 * 60 * 24);
                
                let shouldBackup = false;
                if (currentState.backupSettings.frequency === 'daily') {
                    shouldBackup = true;
                } else if (currentState.backupSettings.frequency === 'weekly' && daysSinceLastBackup >= 7) {
                    shouldBackup = true;
                }

                if (shouldBackup) {
                    console.log('Déclenchement de la sauvegarde automatique...');
                    try {
                        const { currentUser, ...stateToSave } = currentState;
                        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                            JSON.stringify(stateToSave, null, 2)
                        )}`;
                        const link = document.createElement("a");
                        link.href = jsonString;
                        const date = new Date().toISOString().slice(0, 10);
                        link.download = `chicandmix_backup_auto_${date}.json`;
                        link.click();

                        currentActions.updateLastBackupTimestamp(Date.now());
                        addNotification("Sauvegarde automatique des données effectuée avec succès.");
                    } catch (error) {
                        console.error("Échec de la sauvegarde automatique :", error);
                        addNotification("Erreur : La sauvegarde automatique a échoué.");
                    }
                }
            }
        }

    }, 60000); // Check every minute

    // Cleanup function to clear the interval when the component unmounts
    // or when the backup settings change.
    return () => clearInterval(backupInterval);
  }, [enabled, frequency, time, addNotification]); // Dependencies are now stable primitives.


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
      case 'logoProposals':
        return <LogoProposalsPage />;
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