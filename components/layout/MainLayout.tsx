import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { Module, Notification, User } from '../../types';
import { useAminaShop } from '../../context/AminaShopContext';
import { permissions } from '../utils/permissions';
import { DashboardIcon, InventoryIcon, ClientsIcon, SuppliersIcon, POSIcon, OrdersIcon, ReplenishmentIcon, MenuIcon, XMarkIcon, ReportsIcon, BellIcon, SettingsIcon, UserCircleIcon } from '../icons';
import { Modal, Button } from '../ui/Shared';

interface NavLinkProps {
  icon: React.ReactElement;
  label: string;
  module: Module;
  activeModule: Module;
  setActiveModule: (module: Module) => void;
}

const NavLink: React.FC<NavLinkProps> = ({ icon, label, module, activeModule, setActiveModule }) => {
  const isActive = activeModule === module;
  return (
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); setActiveModule(module); }}
      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
        isActive ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
      }`}
    >
      {React.cloneElement(icon, { className: "w-6 h-6"})}
      <span className="ml-4">{label}</span>
    </a>
  );
};


const Sidebar: React.FC<{
  activeModule: Module;
  setActiveModule: (module: Module) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentUser: User;
}> = ({ activeModule, setActiveModule, isOpen, setIsOpen, currentUser }) => {

  const userPermissions = permissions[currentUser.role];

  const navItems: { icon: React.ReactElement; label: string; module: Module }[] = [
    { icon: <DashboardIcon />, label: "Tableau de Bord", module: "dashboard" },
    { icon: <POSIcon />, label: "Commande client", module: "productList" },
    { icon: <InventoryIcon />, label: "Marchandises", module: "inventory" },
    { icon: <ReplenishmentIcon />, label: "Approvisionnement", module: "approvisionnement" },
    { icon: <OrdersIcon />, label: "Ventes", module: "orders" },
    { icon: <ClientsIcon />, label: "Clients", module: "clients" },
    { icon: <SuppliersIcon />, label: "Fournisseurs", module: "suppliers" },
    { icon: <ReportsIcon />, label: "Rapports", module: "reports" },
    { icon: <SettingsIcon />, label: "Paramètres", module: "settings" },
  ];

  const visibleNavItems = navItems.filter(item => userPermissions[item.module]);
  
  return (
    <aside className={`w-64 flex-shrink-0 bg-white shadow-lg h-screen fixed top-0 left-0 overflow-y-auto z-50 transition-transform duration-300 ease-in-out print:hidden
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      md:translate-x-0`}>
      <div className="flex items-center justify-between h-20 border-b px-4">
        <h1 className="text-2xl font-serif font-black text-center">
            <span className="text-primary-900">CHIC </span>
            <span className="text-primary-500 italic">&amp;</span>
            <span className="text-primary-900"> MIX</span>
        </h1>
        <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-gray-200 md:hidden">
            <XMarkIcon />
        </button>
      </div>
      <nav className="mt-6 px-4 space-y-2">
        {visibleNavItems.map(item => <NavLink key={item.module} {...item} activeModule={activeModule} setActiveModule={setActiveModule} />)}
      </nav>
    </aside>
  );
};

const timeSince = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `il y a ${Math.floor(interval)} an(s)`;
    interval = seconds / 2592000;
    if (interval > 1) return `il y a ${Math.floor(interval)} mois`;
    interval = seconds / 86400;
    if (interval > 1) return `il y a ${Math.floor(interval)} jour(s)`;
    interval = seconds / 3600;
    if (interval > 1) return `il y a ${Math.floor(interval)} heure(s)`;
    interval = seconds / 60;
    if (interval > 1) return `il y a ${Math.floor(interval)} minute(s)`;
    return `à l'instant`;
};

const Header: React.FC<{ 
    moduleName: Module; 
    onMenuClick: () => void; 
    notifications: Notification[];
    markNotificationsAsRead: () => void;
    currentUser: User;
    logout: () => void;
}> = ({ moduleName, onMenuClick, notifications, markNotificationsAsRead, currentUser, logout }) => {
  const moduleDisplayNames: Record<Module, string> = {
    dashboard: 'Tableau de Bord',
    productList: 'Nouvelle Vente',
    inventory: 'Marchandises',
    approvisionnement: 'Approvisionnement',
    orders: 'Ventes',
    clients: 'Clients',
    suppliers: 'Fournisseurs',
    reports: 'Rapports de Ventes',
    settings: 'Paramètres',
  };

  const displayName = moduleDisplayNames[moduleName] || moduleName;
  
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleTogglePopover = () => {
    const willOpen = !isPopoverOpen;
    setIsPopoverOpen(willOpen);
    if (willOpen && unreadCount > 0) {
        setTimeout(() => markNotificationsAsRead(), 1000);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popoverRef, userMenuRef]);
  
  const handleLogout = () => {
    logout();
    setIsLogoutConfirmOpen(false);
  };
  
  return (
    <>
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm shadow-sm flex-shrink-0 z-40 print:hidden">
        <div className="py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
          <div className="flex items-center">
              <button onClick={onMenuClick} className="md:hidden mr-4 p-2 text-gray-600 hover:text-gray-900">
                  <MenuIcon />
              </button>
              {moduleName !== 'dashboard' && <h1 className="text-2xl font-serif font-black text-gray-900">{displayName}</h1>}
          </div>
          <div className="flex items-center gap-4">
              <div className="relative" ref={popoverRef}>
                  <button onClick={handleTogglePopover} className="relative p-2 text-gray-600 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                      <span className="sr-only">Voir les notifications</span>
                      <BellIcon className="w-6 h-6"/>
                      {unreadCount > 0 && (
                          <span className="absolute top-1 right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                      )}
                  </button>
                  {isPopoverOpen && (
                      <div className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="px-4 py-3">
                              <p className="text-sm font-medium text-gray-900">Notifications</p>
                      </div>
                      <div className="py-1 max-h-80 overflow-y-auto">
                              {notifications.length > 0 ? notifications.map(notification => (
                                  <div key={notification.id} className={`block px-4 py-3 text-sm transition-colors duration-300 ${!notification.read ? 'bg-primary-50' : 'bg-white'}`}>
                                      <p className="font-medium text-gray-800">{notification.message}</p>
                                      <p className="text-xs text-gray-500 mt-1">{timeSince(new Date(notification.timestamp))}</p>
                                  </div>
                              )) : (
                                  <div className="px-4 py-5 text-center">
                                      <p className="text-sm text-gray-500">Aucune nouvelle notification</p>
                                  </div>
                              )}
                      </div>
                      </div>
                  )}
              </div>

               <div className="relative" ref={userMenuRef}>
                  <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-200">
                      <UserCircleIcon className="w-8 h-8 text-gray-500"/>
                      <div className="text-left hidden sm:block">
                          <p className="font-semibold text-sm text-gray-800">{currentUser.name}</p>
                          <p className="text-xs text-gray-500">{currentUser.role}</p>
                      </div>
                  </button>
                  {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <div className="py-1">
                              <button
                                  onClick={() => {
                                    setIsUserMenuOpen(false);
                                    setIsLogoutConfirmOpen(true);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                  Se déconnecter
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
        </div>
      </header>
      <Modal
          isOpen={isLogoutConfirmOpen}
          onClose={() => setIsLogoutConfirmOpen(false)}
          title="Confirmer la Déconnexion"
          contentClassName="max-w-md"
      >
          <div className="space-y-6">
              <p className="text-gray-700">Êtes-vous sûr de vouloir vous déconnecter ?</p>
              <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setIsLogoutConfirmOpen(false)}>
                      Annuler
                  </Button>
                  <Button variant="danger" onClick={handleLogout}>
                      Se Déconnecter
                  </Button>
              </div>
          </div>
      </Modal>
    </>
  );
};


interface MainLayoutProps {
  children: ReactNode;
  activeModule: Module;
  setActiveModule: (module: Module) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  notifications: Notification[];
  markNotificationsAsRead: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, activeModule, setActiveModule, isSidebarOpen, setIsSidebarOpen, notifications, markNotificationsAsRead }) => {
  const { state, actions } = useAminaShop();
  const { currentUser } = state;

  if (!currentUser) return null; // Should be handled by App.tsx, but as a safeguard

  return (
    <div className="w-full bg-gray-100">
      <Sidebar 
        activeModule={activeModule} 
        setActiveModule={setActiveModule} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        currentUser={currentUser}
      />
       {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}
      <div className="md:ml-64 flex flex-col flex-1 min-h-screen print:ml-0">
        <Header 
            moduleName={activeModule} 
            onMenuClick={() => setIsSidebarOpen(true)} 
            notifications={notifications} 
            markNotificationsAsRead={markNotificationsAsRead} 
            currentUser={currentUser}
            logout={actions.logout}
        />
        <main className="flex-1">
          <div className="py-8 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};