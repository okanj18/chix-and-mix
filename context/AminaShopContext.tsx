import React, { createContext, useContext, useReducer, ReactNode, useMemo, useEffect } from 'react';
import { Product, Client, Supplier, Order, PurchaseOrder, Payment, SupplierPayment, PaymentSchedule, OrderItem, PurchaseOrderItem, Installment, ProductVariant, PaymentStatus, Modification, ProductReturn, ReturnItem, User, UserRole, BackupSettings } from '../types';
import { mockProducts, mockClients, mockSuppliers, mockOrders, mockPurchaseOrders, mockPayments, mockSupplierPayments, mockPaymentSchedules, mockUsers } from '../data/mockData';

const generateUniqueId = (prefix: string): string => {
  // A simple and effective way to generate a more unique ID than just Date.now()
  // It combines a prefix, the current timestamp, and a random string.
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

interface AppState {
  products: Product[];
  clients: Client[];
  suppliers: Supplier[];
  orders: Order[];
  returns: ProductReturn[];
  purchaseOrders: PurchaseOrder[];
  payments: Payment[];
  supplierPayments: SupplierPayment[];
  paymentSchedules: PaymentSchedule[];
  categories: string[];
  users: User[];
  currentUser: User | null;
  backupSettings: BackupSettings;
}

type Action =
  | { type: 'LOGIN'; payload: { userId: string, pin: string } }
  | { type: 'LOGOUT' }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'DELETE_USER'; payload: string }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'ADD_CATEGORY'; payload: string }
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'UPDATE_CLIENT'; payload: Client }
  | { type: 'ADD_SUPPLIER'; payload: Supplier }
  | { type: 'UPDATE_SUPPLIER'; payload: Supplier }
  | { type: 'CREATE_ORDER'; payload: Omit<Order, 'id' | 'date' | 'paidAmount' | 'modificationHistory'> & { paymentStatus: PaymentStatus, discount: number, notes?: string, user: string } }
  | { type: 'UPDATE_ORDER'; payload: { orderId: string, data: { clientId: string, items: OrderItem[], discount: number, notes: string }, user: string } }
  | { type: 'UPDATE_ORDER_DELIVERY_STATUS'; payload: { orderId: string, status: Order['deliveryStatus'], user: string } }
  | { type: 'UPDATE_ORDER_PAYMENT_STATUS'; payload: { orderId: string; newStatus: PaymentStatus; oldStatus: PaymentStatus, user: string } }
  | { type: 'CANCEL_ORDER'; payload: { orderId: string, user: string } }
  | { type: 'CREATE_RETURN'; payload: Omit<ProductReturn, 'id' | 'date'> & { user: string } }
  | { type: 'ARCHIVE_ORDER'; payload: { orderId: string, user: string } }
  | { type: 'UNARCHIVE_ORDER'; payload: { orderId: string, user: string } }
  | { type: 'ADD_PAYMENT'; payload: Omit<Payment, 'id' | 'date'> & { user: string } }
  | { type: 'UPDATE_PAYMENT'; payload: { paymentId: string; newAmount: number; newMethod: Payment['method'], user: string } }
  | { type: 'DELETE_PAYMENT'; payload: { paymentId: string, user: string } }
  | { type: 'CREATE_PAYMENT_SCHEDULE'; payload: { orderId: string, installments: Omit<Installment, 'status'>[], user: string } }
  | { type: 'UPDATE_PAYMENT_SCHEDULE'; payload: { orderId: string, installments: Omit<Installment, 'status'>[], user: string } }
  | { type: 'MARK_INSTALLMENT_AS_PAID'; payload: { orderId: string; installmentIndex: number; paymentMethod: Payment['method'], user: string } }
  | { type: 'ADD_PURCHASE_ORDER'; payload: PurchaseOrder }
  | { type: 'UPDATE_PURCHASE_ORDER'; payload: PurchaseOrder }
  | { type: 'RECEIVE_PURCHASE_ORDER_ITEMS'; payload: { purchaseOrderId: string; receivedItems: Array<{ item: PurchaseOrderItem; quantityToReceive: number; }> } }
  | { type: 'ADD_SUPPLIER_PAYMENT'; payload: Omit<SupplierPayment, 'id' | 'date'> }
  | { type: 'UPDATE_BACKUP_SETTINGS'; payload: BackupSettings }
  | { type: 'UPDATE_LAST_BACKUP_TIMESTAMP'; payload: number }
  | { type: 'RESET_ALL_DATA' }
  | { type: 'RESTORE_DATA'; payload: AppState };


const initialState: AppState = {
  products: mockProducts,
  clients: mockClients,
  suppliers: mockSuppliers,
  orders: mockOrders,
  returns: [],
  purchaseOrders: mockPurchaseOrders,
  payments: mockPayments,
  supplierPayments: mockSupplierPayments,
  paymentSchedules: mockPaymentSchedules,
  categories: ['Vêtements', 'Accessoires', 'Chaussures'],
  users: mockUsers,
  currentUser: null,
  backupSettings: {
    enabled: false,
    frequency: 'daily',
    time: '22:00',
    lastBackupTimestamp: null
  },
};

const getInitialState = (): AppState => {
    try {
        const storedState = localStorage.getItem('aminaShopState');
        if (storedState) {
            const parsed = JSON.parse(storedState);
            const currentUser = sessionStorage.getItem('aminaShopCurrentUser');

            return {
                ...initialState, // Start with defaults
                ...parsed, // Override with saved data
                currentUser: currentUser ? JSON.parse(currentUser) : null,
                users: parsed.users || mockUsers, // Ensure users are loaded
                backupSettings: parsed.backupSettings || initialState.backupSettings, // Load backup settings
                products: (parsed.products || []).map((p: Product) => ({
                    ...p,
                    purchasePrice: Number(p.purchasePrice || 0),
                    sellingPrice: Number(p.sellingPrice || 0),
                    stock: Number(p.stock || 0),
                    alertThreshold: Number(p.alertThreshold || 0),
                    variants: (p.variants || []).map((v: ProductVariant) => ({
                        ...v,
                        quantity: Number(v.quantity || 0),
                    }))
                })),
                orders: (parsed.orders || []).map((o: Order) => ({
                    ...o, 
                    date: new Date(o.date),
                    total: Number(o.total || 0),
                    paidAmount: Number(o.paidAmount || 0),
                    discount: Number(o.discount || 0),
                    items: (o.items || []).map((item: OrderItem) => ({
                        ...item,
                        quantity: Number(item.quantity || 0),
                        price: Number(item.price || 0),
                    })),
                    modificationHistory: o.modificationHistory?.map((h: Modification) => ({...h, date: new Date(h.date)})) || [],
                    isArchived: o.isArchived || false,
                })),
                returns: (parsed.returns || []).map((r: ProductReturn) => ({ 
                    ...r, 
                    date: new Date(r.date),
                    refundAmount: Number(r.refundAmount || 0),
                    items: (r.items || []).map((item: ReturnItem) => ({
                        ...item,
                        quantity: Number(item.quantity || 0),
                        price: Number(item.price || 0),
                    })),
                })),
                purchaseOrders: (parsed.purchaseOrders || []).map((po: PurchaseOrder) => ({
                    ...po, 
                    date: new Date(po.date),
                    total: Number(po.total || 0),
                    paidAmount: Number(po.paidAmount || 0),
                    items: (po.items || []).map((item: PurchaseOrderItem) => ({
                        ...item,
                        quantity: Number(item.quantity || 0),
                        quantityReceived: Number(item.quantityReceived || 0),
                        purchasePrice: Number(item.purchasePrice || 0),
                    })),
                })),
                payments: (parsed.payments || []).map((p: Payment) => ({
                    ...p, 
                    date: new Date(p.date),
                    amount: Number(p.amount || 0),
                })),
                supplierPayments: (parsed.supplierPayments || []).map((sp: SupplierPayment) => ({
                    ...sp, 
                    date: new Date(sp.date),
                    amount: Number(sp.amount || 0),
                })),
                paymentSchedules: (parsed.paymentSchedules || []).map((ps: PaymentSchedule) => ({
                    ...ps, 
                    installments: (ps.installments || []).map((i: Installment) => ({
                        ...i, 
                        dueDate: new Date(i.dueDate),
                        amount: Number(i.amount || 0),
                    }))
                })),
            };
        }
    } catch (error) {
        console.error("Could not parse state from localStorage", error);
    }
    return initialState;
}


const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'LOGIN': {
      const { userId, pin } = action.payload;
      const user = state.users.find(u => u.id === userId && u.pin === pin);
      if (user) {
        sessionStorage.setItem('aminaShopCurrentUser', JSON.stringify(user));
        return { ...state, currentUser: user };
      }
      return state;
    }
    case 'LOGOUT':
      sessionStorage.removeItem('aminaShopCurrentUser');
      return { ...state, currentUser: null };
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.payload] };
    case 'UPDATE_USER':
      return { ...state, users: state.users.map(u => u.id === (action.payload as User).id ? action.payload as User : u) };
    case 'DELETE_USER':
      return { ...state, users: state.users.filter(u => u.id !== action.payload) };

    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':
      return { ...state, products: state.products.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter(p => p.id !== action.payload) };
    case 'ADD_CATEGORY':
        if (state.categories.includes(action.payload)) return state;
        return { ...state, categories: [...state.categories, action.payload] };
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, action.payload] };
    case 'UPDATE_CLIENT':
      return { ...state, clients: state.clients.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'ADD_SUPPLIER':
      return { ...state, suppliers: [...state.suppliers, action.payload] };
    case 'UPDATE_SUPPLIER':
      return { ...state, suppliers: state.suppliers.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'CREATE_ORDER': {
      const { items, paymentStatus, discount, user } = action.payload;
      const total = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0) - (Number(discount) || 0);
      
      const modificationHistory: Modification[] = [{
        date: new Date(),
        user: user,
        description: 'Commande créée.'
      }];

      if (paymentStatus === 'Payé') {
        modificationHistory.push({
          date: new Date(),
          user: user,
          description: `Commande marquée comme payée à la création pour ${total.toLocaleString()} FCFA.`
        });
      }

      const newOrder: Order = {
        ...action.payload,
        id: generateUniqueId('ord'),
        date: new Date(),
        total,
        paidAmount: paymentStatus === 'Payé' ? total : 0,
        deliveryStatus: 'En attente',
        modificationHistory,
        isArchived: false,
      };
      const newPayments = paymentStatus === 'Payé' ? [
        ...state.payments, { id: generateUniqueId('pay'), orderId: newOrder.id, date: new Date(), amount: total, method: 'Espèces' as const }
      ] : state.payments;

      const updatedProducts = state.products.map(product => {
        const itemsForThisProduct = items.filter(item => item.productId === product.id);
        if (itemsForThisProduct.length === 0) {
            return product; // No changes for this product
        }
    
        const totalQuantitySold = itemsForThisProduct.reduce((sum, item) => sum + Number(item.quantity), 0);
    
        const updatedProduct = {
            ...product,
            stock: Number(product.stock) - totalQuantitySold,
            variants: product.variants.map(v => ({ ...v }))
        };
    
        itemsForThisProduct.forEach(itemSold => {
            if (itemSold.size || itemSold.color) {
                const variantIndex = updatedProduct.variants.findIndex(v => (v.size || '') === (itemSold.size || '') && (v.color || '') === (itemSold.color || ''));
                if (variantIndex > -1) {
                    updatedProduct.variants[variantIndex].quantity -= Number(itemSold.quantity);
                }
            }
        });
    
        return updatedProduct;
      });

      return { ...state, orders: [newOrder, ...state.orders], payments: newPayments, products: updatedProducts };
    }
    case 'UPDATE_ORDER': {
      const { orderId, data, user } = action.payload;
      const originalOrder = state.orders.find(o => o.id === orderId);
      if (!originalOrder) return state;

      // --- Stock Adjustment Logic ---
      const stockAdjustments = new Map<string, { quantity: number; variants: Map<string, number> }>();

      // 1. Add back original quantities to stock
      originalOrder.items.forEach(item => {
          if (!stockAdjustments.has(item.productId)) {
              stockAdjustments.set(item.productId, { quantity: 0, variants: new Map() });
          }
          const adj = stockAdjustments.get(item.productId)!;
          adj.quantity += Number(item.quantity);
          if (item.size || item.color) {
              const variantKey = `${item.size || ''}-${item.color || ''}`;
              adj.variants.set(variantKey, (adj.variants.get(variantKey) || 0) + Number(item.quantity));
          }
      });

      // 2. Subtract new quantities from stock
      data.items.forEach(item => {
          if (!stockAdjustments.has(item.productId)) {
              stockAdjustments.set(item.productId, { quantity: 0, variants: new Map() });
          }
          const adj = stockAdjustments.get(item.productId)!;
          adj.quantity -= Number(item.quantity);
          if (item.size || item.color) {
              const variantKey = `${item.size || ''}-${item.color || ''}`;
              adj.variants.set(variantKey, (adj.variants.get(variantKey) || 0) - Number(item.quantity));
          }
      });

      const updatedProducts = state.products.map(product => {
          if (!stockAdjustments.has(product.id)) {
              return product;
          }

          const adj = stockAdjustments.get(product.id)!;
          const newProduct = { ...product, stock: Number(product.stock) + adj.quantity };

          if (adj.variants.size > 0) {
              newProduct.variants = product.variants.map(variant => {
                  const variantKey = `${variant.size || ''}-${variant.color || ''}`;
                  if (adj.variants.has(variantKey)) {
                      return { ...variant, quantity: Number(variant.quantity) + adj.variants.get(variantKey)! };
                  }
                  return variant;
              });
          }
          return newProduct;
      });
      // --- End Stock Adjustment ---

      return {
        ...state,
        products: updatedProducts,
        orders: state.orders.map(order => {
          if (order.id === orderId) {
            const newTotal = data.items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0) - (Number(data.discount) || 0);
            
            const currentPaidAmount = Number(order.paidAmount) || 0;
            let newPaymentStatus: PaymentStatus = 'En attente';
            if (currentPaidAmount >= newTotal) {
                newPaymentStatus = 'Payé';
            } else if (currentPaidAmount > 0) {
                newPaymentStatus = 'Partiellement payé';
            }

            const newHistoryEntry: Modification = {
                date: new Date(),
                user: user,
                description: 'Détails de la commande (client/articles/remise) mis à jour.'
            };

            return {
              ...order,
              ...data,
              total: newTotal,
              paymentStatus: newPaymentStatus,
              modificationHistory: [...(order.modificationHistory || []), newHistoryEntry]
            };
          }
          return order;
        }),
      };
    }
    case 'UPDATE_ORDER_DELIVERY_STATUS':
      return {
          ...state,
          orders: state.orders.map(o => {
              if (o.id === action.payload.orderId) {
                  const newHistoryEntry: Modification = {
                      date: new Date(),
                      user: action.payload.user,
                      description: `Statut de livraison mis à jour à '${action.payload.status}'.`
                  };
                  return {
                      ...o,
                      deliveryStatus: action.payload.status,
                      modificationHistory: [...(o.modificationHistory || []), newHistoryEntry]
                  };
              }
              return o;
          })
      };
    case 'UPDATE_ORDER_PAYMENT_STATUS': {
        const { orderId, newStatus, oldStatus, user } = action.payload;
        return {
            ...state,
            orders: state.orders.map(order => {
                if (order.id === orderId) {
                    const newHistoryEntry: Modification = {
                        date: new Date(),
                        user: user,
                        description: `Statut de paiement changé de '${oldStatus}' à '${newStatus}'.`
                    };
                    const existingHistory = order.modificationHistory || [];
                    return {
                        ...order,
                        paymentStatus: newStatus,
                        modificationHistory: [...existingHistory, newHistoryEntry]
                    };
                }
                return order;
            })
        };
    }
    case 'CANCEL_ORDER': {
        const { orderId, user } = action.payload;
        const orderToCancel = state.orders.find(o => o.id === orderId);
        if (!orderToCancel) return state;

        if ((Number(orderToCancel.paidAmount) || 0) > 0) {
            alert("Impossible d'annuler une commande avec des paiements. Veuillez d'abord supprimer les paiements.");
            return state;
        }

        const updatedProducts = state.products.map(product => {
            const itemInOrder = orderToCancel.items.find(item => item.productId === product.id);
            if (!itemInOrder) {
                return product;
            }

            const newProduct = { ...product, stock: Number(product.stock) + Number(itemInOrder.quantity) };

            if (itemInOrder.size || itemInOrder.color) {
                newProduct.variants = product.variants.map(variant => {
                    if ((variant.size || '') === (itemInOrder.size || '') && (variant.color || '') === (itemInOrder.color || '')) {
                        return { ...variant, quantity: Number(variant.quantity) + Number(itemInOrder.quantity) };
                    }
                    return variant;
                });
            }
            return newProduct;
        });

        const updatedOrders = state.orders.map(order => {
            if (order.id === orderId) {
                return {
                    ...order,
                    deliveryStatus: 'Annulée' as const,
                    paymentStatus: 'Annulée' as const,
                    modificationHistory: [
                        ...(order.modificationHistory || []),
                        {
                            date: new Date(),
                            user: user,
                            description: 'Commande annulée.'
                        }
                    ]
                };
            }
            return order;
        });

        return { ...state, products: updatedProducts, orders: updatedOrders };
    }
     case 'CREATE_RETURN': {
        const { orderId, items: returnedItems, refundAmount, refundMethod, user } = action.payload;
        const order = state.orders.find(o => o.id === orderId);
        if (!order) return state;

        // 1. Update stock
        const updatedProducts = state.products.map(product => {
            const itemsForThisProduct = returnedItems.filter(item => item.productId === product.id);
            if (itemsForThisProduct.length === 0) return product;

            const totalQuantityReturned = itemsForThisProduct.reduce((sum, item) => sum + Number(item.quantity), 0);
            const updatedProduct = { ...product, stock: Number(product.stock) + totalQuantityReturned, variants: product.variants.map(v => ({ ...v })) };

            itemsForThisProduct.forEach(itemReturned => {
                if (itemReturned.size || itemReturned.color) {
                    const variantIndex = updatedProduct.variants.findIndex(v => (v.size || '') === (itemReturned.size || '') && (v.color || '') === (itemReturned.color || ''));
                    if (variantIndex > -1) {
                        updatedProduct.variants[variantIndex].quantity += Number(itemReturned.quantity);
                    }
                }
            });
            return updatedProduct;
        });

        // 2. Create new return record
        const newReturn: ProductReturn = { ...action.payload, id: generateUniqueId('ret'), date: new Date() };

        // 3. Create refund payment record
        const newPayments = [...state.payments];
        if (Number(refundAmount) > 0) {
            newPayments.push({
                id: generateUniqueId('pay'),
                orderId,
                date: new Date(),
                amount: -Number(refundAmount), // Negative amount for refund
                method: refundMethod,
            });
        }
        
        // 4. Update order status
        const allReturnsForOrder = [...state.returns.filter(r => r.orderId === orderId), newReturn];
        const totalReturnedQty = allReturnsForOrder.reduce((sum, r) => sum + r.items.reduce((itemSum, i) => itemSum + Number(i.quantity), 0), 0);
        const totalOrderedQty = order.items.reduce((sum, i) => sum + Number(i.quantity), 0);

        let newDeliveryStatus: Order['deliveryStatus'] = order.deliveryStatus;
        if (totalReturnedQty >= totalOrderedQty) {
            newDeliveryStatus = 'Retourné';
        } else if (totalReturnedQty > 0) {
            newDeliveryStatus = 'Partiellement retourné';
        }

        const returnedItemsValue = returnedItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
        const newTotal = (Number(order.total) || 0) - returnedItemsValue;
        const newPaidAmount = (Number(order.paidAmount) || 0) - (Number(refundAmount) || 0);

        let newPaymentStatus: PaymentStatus;

        if (newTotal <= 0) {
            newPaymentStatus = 'Remboursé';
        } else if (Math.round(newPaidAmount) >= Math.round(newTotal)) {
            newPaymentStatus = 'Payé';
        } else if (newPaidAmount > 0) {
            if (Number(refundAmount) > 0 || order.paymentStatus === 'Partiellement remboursé') {
                newPaymentStatus = 'Partiellement remboursé';
            } else {
                newPaymentStatus = 'Partiellement payé';
            }
        } else {
            newPaymentStatus = 'En attente';
        }

        const updatedOrders = state.orders.map(o => {
            if (o.id === orderId) {
                return {
                    ...o,
                    total: newTotal,
                    paidAmount: newPaidAmount,
                    deliveryStatus: newDeliveryStatus,
                    paymentStatus: newPaymentStatus,
                    modificationHistory: [
                        ...(o.modificationHistory || []),
                        {
                            date: new Date(),
                            user: user,
                            description: `Retour de ${returnedItems.length} article(s) d'une valeur de ${returnedItemsValue.toLocaleString()} FCFA enregistré, avec un remboursement de ${(Number(refundAmount) || 0).toLocaleString()} FCFA.`
                        }
                    ]
                };
            }
            return o;
        });

        return {
            ...state,
            products: updatedProducts,
            returns: [...state.returns, newReturn],
            payments: newPayments,
            orders: updatedOrders,
        };
    }
    case 'ARCHIVE_ORDER':
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === action.payload.orderId ? {
            ...order,
            isArchived: true,
            modificationHistory: [
              ...(order.modificationHistory || []),
              {
                date: new Date(),
                user: action.payload.user,
                description: 'Commande archivée.'
              }
            ]
          } : order
        )
      };
    case 'UNARCHIVE_ORDER':
        return {
        ...state,
        orders: state.orders.map(order =>
            order.id === action.payload.orderId ? {
            ...order,
            isArchived: false,
            modificationHistory: [
                ...(order.modificationHistory || []),
                {
                date: new Date(),
                user: action.payload.user,
                description: 'Commande désarchivée.'
                }
            ]
            } : order
        )
        };
    case 'ADD_PAYMENT': {
      const { orderId, amount, user } = action.payload;
      const updatedOrders = state.orders.map(order => {
        if (order.id === orderId) {
          const newPaidAmount = (Number(order.paidAmount) || 0) + (Number(amount) || 0);
          const newPaymentStatus: PaymentStatus = newPaidAmount >= (Number(order.total) || 0) ? 'Payé' : 'Partiellement payé';
          const newHistoryEntry: Modification = {
            date: new Date(),
            user: user,
            description: `Nouveau paiement de ${(Number(amount) || 0).toLocaleString()} FCFA ajouté.`
          };
          return { ...order, paidAmount: newPaidAmount, paymentStatus: newPaymentStatus, modificationHistory: [...(order.modificationHistory || []), newHistoryEntry] };
        }
        return order;
      });
      const newPayment: Payment = { ...action.payload, id: generateUniqueId('pay'), date: new Date() };
      return { ...state, orders: updatedOrders, payments: [...state.payments, newPayment] };
    }
    case 'UPDATE_PAYMENT': {
        const { paymentId, newAmount, newMethod, user } = action.payload;
        const oldPayment = state.payments.find(p => p.id === paymentId);
        if (!oldPayment) return state;

        const amountDifference = (Number(newAmount) || 0) - (Number(oldPayment.amount) || 0);

        const updatedOrders = state.orders.map(order => {
            if (order.id === oldPayment.orderId) {
                const newPaidAmount = (Number(order.paidAmount) || 0) + amountDifference;
                const newPaymentStatus: PaymentStatus = newPaidAmount >= (Number(order.total) || 0) ? 'Payé' : (newPaidAmount > 0 ? 'Partiellement payé' : 'En attente');
                const newHistoryEntry: Modification = {
                    date: new Date(),
                    user: user,
                    description: `Paiement ${paymentId.slice(-4)} modifié: Montant de ${(Number(oldPayment.amount) || 0).toLocaleString()} FCFA à ${(Number(newAmount) || 0).toLocaleString()} FCFA, Méthode de '${oldPayment.method}' à '${newMethod}'.`
                };
                return { ...order, paidAmount: newPaidAmount, paymentStatus: newPaymentStatus, modificationHistory: [...(order.modificationHistory || []), newHistoryEntry] };
            }
            return order;
        });

        const updatedPayments = state.payments.map(p => p.id === paymentId ? { ...p, amount: newAmount, method: newMethod, date: p.date } : p);
        
        return { ...state, orders: updatedOrders, payments: updatedPayments };
    }
    case 'DELETE_PAYMENT': {
        const { paymentId, user } = action.payload;
        const paymentToDelete = state.payments.find(p => p.id === paymentId);
        if (!paymentToDelete) return state;

        const updatedOrders = state.orders.map(order => {
            if (order.id === paymentToDelete.orderId) {
                const newPaidAmount = (Number(order.paidAmount) || 0) - (Number(paymentToDelete.amount) || 0);
                const newPaymentStatus: PaymentStatus = newPaidAmount >= (Number(order.total) || 0) ? 'Payé' : (newPaidAmount > 0 ? 'Partiellement payé' : 'En attente');
                const newHistoryEntry: Modification = {
                    date: new Date(),
                    user: user,
                    description: `Paiement de ${(Number(paymentToDelete.amount) || 0).toLocaleString()} FCFA (${paymentToDelete.method}) supprimé.`
                };
                return { ...order, paidAmount: newPaidAmount, paymentStatus: newPaymentStatus, modificationHistory: [...(order.modificationHistory || []), newHistoryEntry] };
            }
            return order;
        });

        const updatedPayments = state.payments.filter(p => p.id !== paymentId);

        return { ...state, orders: updatedOrders, payments: updatedPayments };
    }
    case 'CREATE_PAYMENT_SCHEDULE': {
        const { user } = action.payload;
        const newSchedule: PaymentSchedule = {
            id: generateUniqueId('ps'),
            orderId: action.payload.orderId,
            installments: action.payload.installments.map(i => ({...i, status: 'En attente' }))
        };
        const updatedOrders = state.orders.map(o => {
            if (o.id === action.payload.orderId) {
                const newHistoryEntry: Modification = {
                    date: new Date(),
                    user: user,
                    description: `Échéancier de paiement créé avec ${action.payload.installments.length} échéance(s).`
                };
                return {
                    ...o,
                    paymentScheduleId: newSchedule.id,
                    modificationHistory: [...(o.modificationHistory || []), newHistoryEntry]
                };
            }
            return o;
        });
        return { ...state, paymentSchedules: [...state.paymentSchedules, newSchedule], orders: updatedOrders };
    }
    case 'UPDATE_PAYMENT_SCHEDULE': {
      const { orderId, installments, user } = action.payload;

      const updatedOrders = state.orders.map(o => {
        if (o.id === orderId) {
            const newHistoryEntry: Modification = {
                date: new Date(),
                user: user,
                description: `Échéancier de paiement mis à jour avec ${installments.length} échéance(s).`
            };
            return {
                ...o,
                modificationHistory: [...(o.modificationHistory || []), newHistoryEntry]
            };
        }
        return o;
    });
      
      let scheduleId = state.orders.find(o => o.id === orderId)?.paymentScheduleId;
      if (!scheduleId) {
          const existingSchedule = state.paymentSchedules.find(ps => ps.orderId === orderId);
          if (existingSchedule) scheduleId = existingSchedule.id;
      }

      if (!scheduleId) return state; // Should not happen if create is called first

      const updatedSchedules = state.paymentSchedules.map(ps => {
          if (ps.id === scheduleId) {
              return {
                  ...ps,
                  installments: installments.map((inst): Installment => ({...inst, status: 'En attente'}))
              };
          }
          return ps;
      });
      return { ...state, paymentSchedules: updatedSchedules, orders: updatedOrders };
    }
    case 'MARK_INSTALLMENT_AS_PAID': {
        const { orderId, installmentIndex, paymentMethod, user } = action.payload;
        const order = state.orders.find(o => o.id === orderId);
        if (!order || !order.paymentScheduleId) return state;

        const schedule = state.paymentSchedules.find(ps => ps.id === order.paymentScheduleId);
        if (!schedule || schedule.installments[installmentIndex]?.status === 'Payé') return state;

        const installment = schedule.installments[installmentIndex];

        // 1. Create a payment
        const newPayment: Payment = {
            id: generateUniqueId('pay'),
            orderId: orderId,
            date: new Date(),
            amount: Number(installment.amount),
            method: paymentMethod,
        };

        const newPaidAmount = (Number(order.paidAmount) || 0) + (Number(installment.amount) || 0);
        const newPaymentStatus: PaymentStatus = newPaidAmount >= (Number(order.total) || 0) ? 'Payé' : 'Partiellement payé';

        const updatedOrder: Order = {
            ...order,
            paidAmount: newPaidAmount,
            paymentStatus: newPaymentStatus,
            modificationHistory: [
                ...(order.modificationHistory || []),
                {
                    date: new Date(),
                    user: user,
                    description: `Échéance de ${(Number(installment.amount) || 0).toLocaleString()} FCFA payée via ${paymentMethod}.`,
                }
            ]
        };

        // 2. Update installment status
        const updatedSchedule: PaymentSchedule = {
            ...schedule,
            installments: schedule.installments.map((inst, index) =>
                index === installmentIndex ? { ...inst, status: 'Payé' } : inst
            ),
        };

        return {
            ...state,
            payments: [...state.payments, newPayment],
            orders: state.orders.map(o => o.id === orderId ? updatedOrder : o),
            paymentSchedules: state.paymentSchedules.map(ps => ps.id === schedule.id ? updatedSchedule : ps),
        };
    }
    case 'ADD_PURCHASE_ORDER':
      return { ...state, purchaseOrders: [action.payload, ...state.purchaseOrders] };
    case 'UPDATE_PURCHASE_ORDER':
        return {
            ...state,
            purchaseOrders: state.purchaseOrders.map(po =>
                po.id === action.payload.id ? action.payload : po
            ),
        };
    case 'RECEIVE_PURCHASE_ORDER_ITEMS': {
        const { purchaseOrderId, receivedItems } = action.payload;

        const updatedPOs = state.purchaseOrders.map(po => {
            if (po.id === purchaseOrderId) {
                const newItems = po.items.map(item => {
                    const received = receivedItems.find(ri => ri.item.productId === item.productId && ri.item.size === item.size && ri.item.color === item.color);
                    if (received) {
                        return { ...item, quantityReceived: Number(item.quantityReceived) + Number(received.quantityToReceive) };
                    }
                    return item;
                });
                const totalQty = newItems.reduce((sum, i) => sum + Number(i.quantity), 0);
                const totalReceived = newItems.reduce((sum, i) => sum + Number(i.quantityReceived), 0);
                const status: PurchaseOrder['status'] = totalReceived >= totalQty ? 'Reçue totalement' : 'Reçue partiellement';
                return { ...po, items: newItems, status };
            }
            return po;
        });
        
        const updatedProducts = state.products.map(product => {
            const receptionsForProduct = receivedItems.filter(ri => ri.item.productId === product.id);
            if (receptionsForProduct.length === 0) {
                return product;
            }
        
            const productCopy = {
                ...product,
                variants: product.variants.map(v => ({...v}))
            };

            receptionsForProduct.forEach(({ item, quantityToReceive }) => {
                productCopy.stock += Number(quantityToReceive);

                const variantIndex = productCopy.variants.findIndex(v => v.size === item.size && v.color === item.color);
                if (variantIndex > -1) {
                    productCopy.variants[variantIndex].quantity += Number(quantityToReceive);
                } else {
                    productCopy.variants.push({
                        size: item.size,
                        color: item.color,
                        quantity: Number(quantityToReceive)
                    });
                }
            });
            return productCopy;
        });

        return { ...state, purchaseOrders: updatedPOs, products: updatedProducts };
    }
    case 'ADD_SUPPLIER_PAYMENT': {
        const { purchaseOrderId, amount } = action.payload;
        const updatedPOs = state.purchaseOrders.map(po => {
            if (po.id === purchaseOrderId) {
                const newPaidAmount = (Number(po.paidAmount) || 0) + (Number(amount) || 0);
                const newPaymentStatus: PurchaseOrder['paymentStatus'] = newPaidAmount >= Number(po.total) ? 'Payé' : 'Partiellement payé';
                return { ...po, paidAmount: newPaidAmount, paymentStatus: newPaymentStatus };
            }
            return po;
        });
        const newPayment: SupplierPayment = { ...action.payload, id: generateUniqueId('spay'), date: new Date() };
        return { ...state, purchaseOrders: updatedPOs, supplierPayments: [...state.supplierPayments, newPayment] };
    }
    case 'UPDATE_BACKUP_SETTINGS':
      return { ...state, backupSettings: action.payload };
    case 'UPDATE_LAST_BACKUP_TIMESTAMP':
      return { ...state, backupSettings: { ...state.backupSettings, lastBackupTimestamp: action.payload } };
    case 'RESET_ALL_DATA':
        // Keep users and categories, wipe all transactional data for deployment
        sessionStorage.removeItem('aminaShopCurrentUser');
        return {
            ...initialState,
            products: [],
            clients: [],
            suppliers: [],
            orders: [],
            returns: [],
            purchaseOrders: [],
            payments: [],
            supplierPayments: [],
            paymentSchedules: [],
            currentUser: null,
        };
    case 'RESTORE_DATA':
        // Replace current state with restored data, but keep initial structure and log out
        sessionStorage.removeItem('aminaShopCurrentUser');
        return {
            ...initialState,
            ...action.payload,
            currentUser: null,
        };
    default:
      return state;
  }
};

const AminaShopContext = createContext<{ state: AppState; actions: any }>({ state: getInitialState(), actions: {} });

export const AminaShopProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, getInitialState());

  useEffect(() => {
    // Only save the non-session state to localStorage
    const { currentUser, ...stateToSave } = state;
    localStorage.setItem('aminaShopState', JSON.stringify(stateToSave));
  }, [state]);

  const actions = useMemo(() => {
    const user = state.currentUser;
    const userName = user?.name || 'Système';

    return {
        login: (userId: string, pin: string): boolean => {
            const targetUser = state.users.find(u => u.id === userId && u.pin === pin);
            if (targetUser) {
                dispatch({ type: 'LOGIN', payload: { userId, pin } });
                return true;
            }
            return false;
        },
        logout: () => dispatch({ type: 'LOGOUT' }),
        addUser: (userData: Omit<User, 'id'>) => dispatch({ type: 'ADD_USER', payload: { ...userData, id: generateUniqueId('user') } }),
        updateUser: (user: User) => dispatch({ type: 'UPDATE_USER', payload: user }),
        deleteUser: (userId: string) => dispatch({ type: 'DELETE_USER', payload: userId }),
        addProduct: (productData: Omit<Product, 'id'>) => dispatch({ type: 'ADD_PRODUCT', payload: { ...productData, id: generateUniqueId('prod') } }),
        updateProduct: (product: Product) => dispatch({ type: 'UPDATE_PRODUCT', payload: product }),
        deleteProduct: (productId: string) => dispatch({ type: 'DELETE_PRODUCT', payload: productId }),
        addCategory: (category: string) => dispatch({ type: 'ADD_CATEGORY', payload: category }),
        addClient: (clientData: Omit<Client, 'id'>) => dispatch({ type: 'ADD_CLIENT', payload: { ...clientData, id: generateUniqueId('cli') } }),
        updateClient: (client: Client) => dispatch({ type: 'UPDATE_CLIENT', payload: client }),
        addSupplier: (supplierData: Omit<Supplier, 'id'>) => dispatch({ type: 'ADD_SUPPLIER', payload: { ...supplierData, id: generateUniqueId('sup') } }),
        updateSupplier: (supplier: Supplier) => dispatch({ type: 'UPDATE_SUPPLIER', payload: supplier }),
        createOrder: (orderData: Omit<Order, 'id' | 'date' | 'paidAmount' | 'total' | 'modificationHistory'> & { paymentStatus: PaymentStatus, discount: number, notes?: string }) => dispatch({ type: 'CREATE_ORDER', payload: { ...orderData, user: userName } }),
        updateOrder: (orderId: string, data: { clientId: string, items: OrderItem[], discount: number, notes: string }) => dispatch({ type: 'UPDATE_ORDER', payload: { orderId, data, user: userName } }),
        updateOrderDeliveryStatus: (orderId: string, status: Order['deliveryStatus']) => dispatch({ type: 'UPDATE_ORDER_DELIVERY_STATUS', payload: { orderId, status, user: userName } }),
        updateOrderPaymentStatus: (orderId: string, newStatus: PaymentStatus, oldStatus: PaymentStatus) => dispatch({ type: 'UPDATE_ORDER_PAYMENT_STATUS', payload: { orderId, newStatus, oldStatus, user: userName } }),
        cancelOrder: (orderId: string) => dispatch({ type: 'CANCEL_ORDER', payload: { orderId, user: userName } }),
        createReturn: (returnData: Omit<ProductReturn, 'id' | 'date'>) => dispatch({ type: 'CREATE_RETURN', payload: { ...returnData, user: userName } }),
        archiveOrder: (orderId: string) => dispatch({ type: 'ARCHIVE_ORDER', payload: { orderId, user: userName } }),
        unarchiveOrder: (orderId: string) => dispatch({ type: 'UNARCHIVE_ORDER', payload: { orderId, user: userName } }),
        addPayment: (paymentData: Omit<Payment, 'id' | 'date'>) => dispatch({ type: 'ADD_PAYMENT', payload: { ...paymentData, user: userName } }),
        updatePayment: (paymentId: string, newAmount: number, newMethod: Payment['method']) => dispatch({ type: 'UPDATE_PAYMENT', payload: { paymentId, newAmount, newMethod, user: userName } }),
        deletePayment: (paymentId: string) => dispatch({ type: 'DELETE_PAYMENT', payload: { paymentId, user: userName } }),
        createPaymentSchedule: (orderId: string, installments: Omit<Installment, 'status'>[]) => dispatch({ type: 'CREATE_PAYMENT_SCHEDULE', payload: { orderId, installments, user: userName } }),
        updatePaymentSchedule: (orderId: string, installments: Omit<Installment, 'status'>[]) => dispatch({ type: 'UPDATE_PAYMENT_SCHEDULE', payload: { orderId, installments, user: userName } }),
        markInstallmentAsPaid: (orderId: string, installmentIndex: number, paymentMethod: Payment['method']) => dispatch({ type: 'MARK_INSTALLMENT_AS_PAID', payload: { orderId, installmentIndex, paymentMethod, user: userName } }),
        addPurchaseOrder: (poData: Omit<PurchaseOrder, 'id' | 'date' | 'status' | 'paidAmount' | 'paymentStatus'>) => {
            const newPO: PurchaseOrder = {
                ...poData,
                id: generateUniqueId('po'),
                date: new Date(),
                status: 'Envoyée',
                paidAmount: 0,
                paymentStatus: 'En attente'
            };
            dispatch({ type: 'ADD_PURCHASE_ORDER', payload: newPO });
        },
        updatePurchaseOrder: (purchaseOrder: PurchaseOrder) => dispatch({ type: 'UPDATE_PURCHASE_ORDER', payload: purchaseOrder }),
        receivePurchaseOrderItems: (purchaseOrderId: string, receivedItems: Array<{ item: PurchaseOrderItem; quantityToReceive: number; }>) => dispatch({ type: 'RECEIVE_PURCHASE_ORDER_ITEMS', payload: { purchaseOrderId, receivedItems } }),
        addSupplierPayment: (paymentData: Omit<SupplierPayment, 'id' | 'date'>) => dispatch({ type: 'ADD_SUPPLIER_PAYMENT', payload: paymentData }),
        resetAllData: () => dispatch({ type: 'RESET_ALL_DATA' }),
        restoreData: (data: AppState) => dispatch({ type: 'RESTORE_DATA', payload: data }),
        updateBackupSettings: (settings: BackupSettings) => dispatch({ type: 'UPDATE_BACKUP_SETTINGS', payload: settings }),
        updateLastBackupTimestamp: (timestamp: number) => dispatch({ type: 'UPDATE_LAST_BACKUP_TIMESTAMP', payload: timestamp }),
    }
  }, [state.currentUser, state.users]);

  return (
    <AminaShopContext.Provider value={{ state, actions }}>
      {children}
    </AminaShopContext.Provider>
  );
};

export const useAminaShop = () => useContext(AminaShopContext);