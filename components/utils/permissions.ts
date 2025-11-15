import { UserRole, Module } from '../../types';

type Permissions = {
  [key in UserRole]: {
    [key in Module | 'canAddProducts' | 'canDeleteProducts' | 'canEditProducts' | 'canManageSuppliers' | 'canManageUsers' | 'canSeeFinancials']: boolean;
  };
};

export const permissions: Permissions = {
  Admin: {
    dashboard: true,
    inventory: true,
    clients: true,
    suppliers: true,
    productList: true,
    orders: true,
    approvisionnement: true,
    reports: true,
    settings: true,
    logoProposals: true,
    canAddProducts: true,
    canDeleteProducts: true,
    canEditProducts: true,
    canManageSuppliers: true,
    canManageUsers: true,
    canSeeFinancials: true,
  },
  Manager: {
    dashboard: true,
    inventory: true,
    clients: true,
    suppliers: true,
    productList: true,
    orders: true,
    approvisionnement: true,
    reports: true,
    settings: true,
    logoProposals: true,
    canAddProducts: true,
    canDeleteProducts: false,
    canEditProducts: true,
    canManageSuppliers: true,
    canManageUsers: true,
    canSeeFinancials: true,
  },
  Vendeur: {
    dashboard: true,
    inventory: false,
    clients: false,
    suppliers: false,
    productList: true,
    orders: true,
    approvisionnement: false,
    reports: false,
    settings: false,
    logoProposals: false,
    canAddProducts: false,
    canDeleteProducts: false,
    canEditProducts: false,
    canManageSuppliers: false,
    canManageUsers: false,
    canSeeFinancials: false,
  },
};