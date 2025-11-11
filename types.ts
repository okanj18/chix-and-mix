export interface ProductVariant {
  size?: string;
  color?: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  supplierId: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  alertThreshold: number;
  variants: ProductVariant[];
  imageUrl?: string;
}

export interface Client {
  id:string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}

export type PaymentStatus = 'Payé' | 'En attente' | 'Partiellement payé' | 'Annulée' | 'Remboursé' | 'Partiellement remboursé';
export type DeliveryStatus = 'En attente' | 'En préparation' | 'Livrée' | 'Annulée' | 'Rupture de stock' | 'Partiellement retourné' | 'Retourné';

export interface Modification {
  date: Date;
  user: string;
  description: string;
}

export interface Order {
  id: string;
  date: Date;
  clientId: string;
  items: OrderItem[];
  total: number;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  paidAmount: number;
  discount?: number;
  notes?: string;
  paymentScheduleId?: string;
  modificationHistory?: Modification[];
  isArchived?: boolean;
}

export interface ReturnItem {
  productId: string;
  size?: string;
  color?: string;
  quantity: number;
  price: number;
}

export interface ProductReturn {
  id: string;
  orderId: string;
  date: Date;
  items: ReturnItem[];
  refundAmount: number;
  refundMethod: Payment['method'];
  notes?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  date: Date;
  amount: number;
  method: 'Espèces' | 'Mobile Money' | 'Carte de crédit';
}

export interface Installment {
  dueDate: Date;
  amount: number;
  status: 'En attente' | 'Payé';
}

export interface PaymentSchedule {
  id: string;
  orderId: string;
  installments: Installment[];
}


export interface PurchaseOrderItem {
  productId: string;
  quantity: number;
  quantityReceived: number;
  purchasePrice: number;
  size?: string;
  color?: string;
}

export type PurchaseOrderStatus = 'Envoyée' | 'Reçue partiellement' | 'Reçue totalement';
export type PurchaseOrderPaymentStatus = 'Payé' | 'En attente' | 'Partiellement payé';

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  date: Date;
  items: PurchaseOrderItem[];
  status: PurchaseOrderStatus;
  total: number;
  paidAmount: number;
  paymentStatus: PurchaseOrderPaymentStatus;
  notes?: string;
}

export interface SupplierPayment {
  id: string;
  purchaseOrderId: string;
  date: Date;
  amount: number;
  method: 'Espèces' | 'Virement bancaire' | 'Chèque';
}

export interface Notification {
  id: number;
  message: string;
  read: boolean;
  timestamp: Date;
}

export type UserRole = 'Admin' | 'Manager' | 'Vendeur';

export interface User {
  id: string;
  name: string;
  pin: string; // Stored as a plain string for simplicity in this context
  role: UserRole;
}

export interface BackupSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  time: string; // "HH:MM" format
  lastBackupTimestamp: number | null;
}

export type Module = 'dashboard' | 'inventory' | 'clients' | 'suppliers' | 'productList' | 'orders' | 'approvisionnement' | 'reports' | 'settings';