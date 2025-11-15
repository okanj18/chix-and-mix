import React, { createContext, useContext, useReducer, ReactNode, useMemo, useEffect } from 'react';
import { Product, Client, Supplier, Order, PurchaseOrder, Payment, SupplierPayment, PaymentSchedule, OrderItem, PurchaseOrderItem, Installment, ProductVariant, PaymentStatus, Modification, ProductReturn, User, BackupSettings, DeliveryStatus } from '../types';
import { mockProducts, mockClients, mockSuppliers, mockOrders, mockPurchaseOrders, mockPayments, mockSupplierPayments, mockPaymentSchedules, mockUsers } from '../data/mockData';

// --- Helper Functions ---
const generateUniqueId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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
  isLoading: boolean;
  isInitialized: boolean;
  saveStatus: SaveStatus;
}

const emptyState: Omit<AppState, 'users' | 'currentUser' | 'isLoading' | 'categories' | 'isInitialized' | 'saveStatus'> = {
  products: [],
  clients: [],
  suppliers: [],
  orders: [],
  returns: [],
  purchaseOrders: [],
  payments: [],
  supplierPayments: [],
  paymentSchedules: [],
  backupSettings: {
    enabled: false,
    frequency: 'daily',
    time: '22:00',
    lastBackupTimestamp: null
  },
};

const initialState: AppState = {
    products: [],
    clients: [],
    suppliers: [],
    orders: [],
    returns: [],
    purchaseOrders: [],
    payments: [],
    supplierPayments: [],
    paymentSchedules: [],
    categories: ['Vêtements', 'Accessoires', 'Chaussures'],
    users: [],
    currentUser: null,
    backupSettings: {
        enabled: false,
        frequency: 'daily',
        time: '22:00',
        lastBackupTimestamp: null
    },
    isLoading: true,
    isInitialized: false,
    saveStatus: 'idle',
};

const appReducer = (state: AppState, action: any): AppState => {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_INITIAL_DATA':
            return { ...state, ...action.payload, isInitialized: true };
        case 'INITIALIZE_WITH_MOCK_DATA':
            return { ...state, ...action.payload, isInitialized: true };
        case 'LOGIN': {
            const { user } = action.payload;
            sessionStorage.setItem('aminaShopCurrentUser', JSON.stringify(user));
            return { ...state, currentUser: user };
        }
        case 'LOGOUT':
            sessionStorage.removeItem('aminaShopCurrentUser');
            return { ...state, currentUser: null };
        case 'ADD_PRODUCT':
            return { ...state, products: [...state.products, action.payload] };
        case 'UPDATE_PRODUCT':
            return {
                ...state,
                products: state.products.map(p => p.id === action.payload.id ? action.payload : p),
            };
        case 'DELETE_PRODUCT':
            return {
                ...state,
                products: state.products.filter(p => p.id !== action.payload),
            };
        case 'ADD_CATEGORY': {
            const newCategory = action.payload;
            if (state.categories.includes(newCategory)) {
                return state;
            }
            return { ...state, categories: [...state.categories, newCategory].sort() };
        }
        case 'ADD_CLIENT':
            return { ...state, clients: [...state.clients, action.payload] };
        case 'UPDATE_CLIENT':
            return {
                ...state,
                clients: state.clients.map(c => c.id === action.payload.id ? action.payload : c),
            };
        case 'ADD_SUPPLIER':
            return { ...state, suppliers: [...state.suppliers, action.payload] };
        case 'UPDATE_SUPPLIER':
            return {
                ...state,
                suppliers: state.suppliers.map(s => s.id === action.payload.id ? action.payload : s),
            };
        case 'CREATE_ORDER': {
            const { newOrder, newProducts, newPayments } = action.payload;
            return { ...state, orders: [...state.orders, newOrder], products: newProducts, payments: newPayments };
        }
        case 'UPDATE_ORDER': {
            const { updatedOrder, newProducts } = action.payload;
            return {
                ...state,
                orders: state.orders.map(o => o.id === updatedOrder.id ? updatedOrder : o),
                products: newProducts,
            };
        }
        case 'UPDATE_ORDER_DELIVERY_STATUS': {
            const { orderId, newStatus, modification } = action.payload;
            return {
                ...state,
                orders: state.orders.map(o => o.id === orderId ? { ...o, deliveryStatus: newStatus, modificationHistory: [...(o.modificationHistory || []), modification] } : o),
            };
        }
        case 'CANCEL_ORDER': {
             const { orderId, newProducts, modification } = action.payload;
             return {
                 ...state,
                 orders: state.orders.map(o => o.id === orderId ? { ...o, paymentStatus: 'Annulée', deliveryStatus: 'Annulée', modificationHistory: [...(o.modificationHistory || []), modification] } : o),
                 products: newProducts,
             };
        }
        case 'ADD_PAYMENT':
        case 'UPDATE_PAYMENTS_AND_ORDER': {
             const { updatedOrder, newPayments } = action.payload;
             return {
                 ...state,
                 orders: state.orders.map(o => o.id === updatedOrder.id ? updatedOrder : o),
                 payments: newPayments,
             };
        }
        case 'CREATE_PAYMENT_SCHEDULE':
        case 'UPDATE_PAYMENT_SCHEDULE': {
            const { orderId, schedule, modification } = action.payload;
            return {
                ...state,
                orders: state.orders.map(o => o.id === orderId ? { ...o, paymentScheduleId: schedule.id, modificationHistory: [...(o.modificationHistory || []), modification] } : o),
                paymentSchedules: [...state.paymentSchedules.filter(ps => ps.id !== schedule.id), schedule],
            };
        }
        case 'ADD_PURCHASE_ORDER':
            return { ...state, purchaseOrders: [...state.purchaseOrders, action.payload] };
        case 'UPDATE_PURCHASE_ORDER':
            return {
                ...state,
                purchaseOrders: state.purchaseOrders.map(po => po.id === action.payload.id ? action.payload : po),
            };
        case 'RECEIVE_PURCHASE_ORDER_ITEMS': {
            const { updatedPO, newProducts } = action.payload;
            return {
                ...state,
                purchaseOrders: state.purchaseOrders.map(po => po.id === updatedPO.id ? updatedPO : po),
                products: newProducts,
            };
        }
        case 'ADD_SUPPLIER_PAYMENT': {
            const { updatedPO, newPayment } = action.payload;
            return {
                ...state,
                purchaseOrders: state.purchaseOrders.map(po => po.id === updatedPO.id ? updatedPO : po),
                supplierPayments: [...state.supplierPayments, newPayment],
            };
        }
        case 'ADD_USER':
            return { ...state, users: [...state.users, action.payload] };
        case 'UPDATE_USER':
            return {
                ...state,
                users: state.users.map(u => u.id === action.payload.id ? action.payload : u),
            };
        case 'DELETE_USER':
            return {
                ...state,
                users: state.users.filter(u => u.id !== action.payload),
            };
        case 'RESET_ALL_DATA':
            sessionStorage.removeItem('aminaShopCurrentUser');
            // No longer need to remove from localStorage, will be handled by server
            return {
                ...initialState, 
                isLoading: false,
                isInitialized: false, 
                users: mockUsers, 
            };
        case 'RESTORE_DATA':
            sessionStorage.removeItem('aminaShopCurrentUser');
            return {
                ...state,
                ...action.payload,
                isInitialized: true,
                currentUser: null // Force logout after restore
            };
        case 'UPDATE_BACKUP_SETTINGS':
            return { ...state, backupSettings: action.payload };
        case 'UPDATE_LAST_BACKUP_TIMESTAMP':
            return {
                ...state,
                backupSettings: { ...state.backupSettings, lastBackupTimestamp: action.payload }
            };
        case 'SET_SAVE_STATUS':
             return { ...state, saveStatus: action.payload };
        default:
            return state;
    }
};

const AminaShopContext = createContext<{ state: AppState; actions: any }>({ state: initialState, actions: {} });

export const AminaShopProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);

    useEffect(() => {
        const loadData = async () => {
            dispatch({ type: 'SET_LOADING', payload: true });
    
            const safeNewDate = (d: any): Date => {
                if (d === null || d === undefined) return new Date(0); 
                const date = new Date(d);
                return isNaN(date.getTime()) ? new Date() : date;
            };
    
            try {
                const response = await fetch('/api/data');
                if (!response.ok) {
                    if (response.status === 404) {
                        // Data doesn't exist, start fresh
                        console.log("No existing data on server, initializing with a clean slate.");
                        dispatch({ type: 'SET_INITIAL_DATA', payload: { ...emptyState, users: mockUsers, isInitialized: false } });
                        return;
                    }
                    throw new Error(`Server responded with status: ${response.status}`);
                }
    
                const loadedData = await response.json();
    
                if (loadedData && typeof loadedData === 'object' && Array.isArray(loadedData.users)) {
                    const finalPayload = {
                        products: Array.isArray(loadedData.products) ? loadedData.products : [],
                        clients: Array.isArray(loadedData.clients) ? loadedData.clients : [],
                        suppliers: Array.isArray(loadedData.suppliers) ? loadedData.suppliers : [],
                        categories: Array.isArray(loadedData.categories) ? loadedData.categories : initialState.categories,
                        users: loadedData.users.length > 0 ? loadedData.users : mockUsers,
                        orders: (Array.isArray(loadedData.orders) ? loadedData.orders : []).map((o: any) => ({...o, date: safeNewDate(o.date), modificationHistory: (Array.isArray(o.modificationHistory) ? o.modificationHistory : []).map((m: any) => ({...m, date: safeNewDate(m.date)}))})),
                        returns: (Array.isArray(loadedData.returns) ? loadedData.returns : []).map((r: any) => ({...r, date: safeNewDate(r.date)})),
                        purchaseOrders: (Array.isArray(loadedData.purchaseOrders) ? loadedData.purchaseOrders : []).map((po: any) => ({...po, date: safeNewDate(po.date)})),
                        payments: (Array.isArray(loadedData.payments) ? loadedData.payments : []).map((p: any) => ({...p, date: safeNewDate(p.date)})),
                        supplierPayments: (Array.isArray(loadedData.supplierPayments) ? loadedData.supplierPayments : []).map((sp: any) => ({...sp, date: safeNewDate(sp.date)})),
                        paymentSchedules: (Array.isArray(loadedData.paymentSchedules) ? loadedData.paymentSchedules : []).map((ps: any) => ({...ps, installments: (Array.isArray(ps.installments) ? ps.installments : []).map((i: any) => ({...i, dueDate: safeNewDate(i.dueDate)}))})),
                        backupSettings: (loadedData.backupSettings && typeof loadedData.backupSettings === 'object') ? { ...initialState.backupSettings, ...loadedData.backupSettings } : initialState.backupSettings,
                    };

                    dispatch({ type: 'SET_INITIAL_DATA', payload: finalPayload });

                    const loggedInUserJSON = sessionStorage.getItem('aminaShopCurrentUser');
                    if (loggedInUserJSON) {
                        const userFromSession = JSON.parse(loggedInUserJSON);
                        const userExists = finalPayload.users.find((u: User) => u.id === userFromSession.id);
                        if (userExists) {
                            dispatch({ type: 'LOGIN', payload: { user: userExists } });
                        } else {
                            sessionStorage.removeItem('aminaShopCurrentUser');
                        }
                    }
                } else {
                     dispatch({ type: 'SET_INITIAL_DATA', payload: { ...emptyState, users: mockUsers } });
                }
            } catch (error) {
                console.error("Critical error during data loading. Starting fresh:", error);
                dispatch({ type: 'SET_INITIAL_DATA', payload: { ...emptyState, users: mockUsers, isInitialized: false } });
                sessionStorage.removeItem('aminaShopCurrentUser');
            } finally {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };

        loadData();
    }, []);

    // Effect for debounced saving
    useEffect(() => {
        if (state.isLoading || !state.isInitialized) {
            return;
        }

        dispatch({ type: 'SET_SAVE_STATUS', payload: 'idle' });

        const handler = setTimeout(() => {
            const saveData = async () => {
                dispatch({ type: 'SET_SAVE_STATUS', payload: 'saving' });
                try {
                    const { isLoading, currentUser, isInitialized, saveStatus, ...stateToSave } = state;
                    const response = await fetch('/api/data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(stateToSave),
                    });
                    if (!response.ok) {
                        throw new Error(`Server responded with status: ${response.status}`);
                    }
                    dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
                } catch (error) {
                    console.error("Failed to save state to server:", error);
                    dispatch({ type: 'SET_SAVE_STATUS', payload: 'error' });
                }
            };
            saveData();
        }, 1500);

        return () => {
            clearTimeout(handler);
        };
    }, [
        state.products, state.clients, state.suppliers, state.orders, 
        state.returns, state.purchaseOrders, state.payments, 
        state.supplierPayments, state.paymentSchedules, state.categories, 
        state.users, state.backupSettings
    ]);

    // Effect to clear the 'saved' status after a delay
    useEffect(() => {
        if (state.saveStatus === 'saved') {
            const timer = setTimeout(() => {
                dispatch({ type: 'SET_SAVE_STATUS', payload: 'idle' });
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [state.saveStatus]);

    const actions = useMemo(() => {
        const createModification = (description: string): Modification => ({
            date: new Date(),
            user: state.currentUser?.name || 'Système',
            description,
        });

        const recalculateOrderPaymentStatus = (order: Order, paidAmount: number): PaymentStatus => {
            if (paidAmount >= order.total) return 'Payé';
            if (paidAmount > 0) return 'Partiellement payé';
            return 'En attente';
        };

        return {
            initializeWithMockData: () => {
                const payload = {
                    products: mockProducts,
                    clients: mockClients,
                    suppliers: mockSuppliers,
                    orders: mockOrders,
                    returns: [],
                    purchaseOrders: mockPurchaseOrders,
                    payments: mockPayments,
                    supplierPayments: mockSupplierPayments,
                    paymentSchedules: mockPaymentSchedules,
                    users: mockUsers,
                    categories: ['Vêtements', 'Accessoires', 'Chaussures'],
                    backupSettings: { enabled: false, frequency: 'daily', time: '22:00', lastBackupTimestamp: null }
                };
                dispatch({ type: 'INITIALIZE_WITH_MOCK_DATA', payload });
            },
            login: (userId: string, pin: string): boolean => {
                const targetUser = state.users.find(u => u.id === userId && u.pin === pin);
                if (targetUser) {
                    dispatch({ type: 'LOGIN', payload: { user: targetUser } });
                    return true;
                }
                return false;
            },
            logout: () => dispatch({ type: 'LOGOUT' }),

            // Products
            addProduct: (productData: Omit<Product, 'id'>) => dispatch({ type: 'ADD_PRODUCT', payload: { ...productData, id: generateUniqueId('prod') } }),
            updateProduct: (product: Product) => dispatch({ type: 'UPDATE_PRODUCT', payload: product }),
            deleteProduct: (productId: string) => dispatch({ type: 'DELETE_PRODUCT', payload: productId }),
            addCategory: (categoryName: string) => dispatch({ type: 'ADD_CATEGORY', payload: categoryName }),

            // Clients & Suppliers
            addClient: (clientData: Omit<Client, 'id'>) => dispatch({ type: 'ADD_CLIENT', payload: { ...clientData, id: generateUniqueId('cli') } }),
            updateClient: (client: Client) => dispatch({ type: 'UPDATE_CLIENT', payload: client }),
            addSupplier: (supplierData: Omit<Supplier, 'id'>) => dispatch({ type: 'ADD_SUPPLIER', payload: { ...supplierData, id: generateUniqueId('sup') } }),
            updateSupplier: (supplier: Supplier) => dispatch({ type: 'UPDATE_SUPPLIER', payload: supplier }),

            // Orders
            createOrder: (orderData: { clientId: string; items: OrderItem[]; paymentStatus: PaymentStatus; discount?: number; notes?: string; }) => {
                const total = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0) - (orderData.discount || 0);
                const newOrder: Order = {
                    ...orderData,
                    id: generateUniqueId('ord'),
                    date: new Date(),
                    total,
                    paidAmount: orderData.paymentStatus === 'Payé' ? total : 0,
                    deliveryStatus: 'En préparation',
                    isArchived: false,
                    modificationHistory: [createModification('Commande créée.')],
                };
            
                const newProducts = state.products.map(p => {
                    const productInOrder = newOrder.items.find(i => i.productId === p.id);
                    if (!productInOrder) return p;
                    const productCopy = JSON.parse(JSON.stringify(p));
                    if (productInOrder.size || productInOrder.color) {
                        const variantIndex = productCopy.variants.findIndex((v: ProductVariant) => v.size === productInOrder.size && v.color === productInOrder.color);
                        if (variantIndex > -1) {
                            productCopy.variants[variantIndex].quantity -= productInOrder.quantity;
                        }
                    }
                    productCopy.stock -= productInOrder.quantity;
                    return productCopy;
                });
            
                const newPayments = [...state.payments];
                if (newOrder.paymentStatus === 'Payé') {
                    newPayments.push({ id: generateUniqueId('pay'), orderId: newOrder.id, date: new Date(), amount: newOrder.total, method: 'Espèces' });
                    newOrder.modificationHistory?.push(createModification(`Commande marquée comme payée à la création pour ${newOrder.total.toLocaleString()} FCFA.`));
                }
                dispatch({ type: 'CREATE_ORDER', payload: { newOrder, newProducts, newPayments } });
            },

            updateOrder: (orderId: string, updates: { clientId: string; items: OrderItem[]; discount: number; notes: string; }) => {
                const originalOrder = state.orders.find(o => o.id === orderId);
                if (!originalOrder) return;
                
                const stockChanges: Record<string, Record<string, number>> = {};
                const getKey = (item: OrderItem) => `${item.size || 'none'}-${item.color || 'none'}`;

                originalOrder.items.forEach(item => {
                    stockChanges[item.productId] = stockChanges[item.productId] || {};
                    stockChanges[item.productId][getKey(item)] = (stockChanges[item.productId][getKey(item)] || 0) + item.quantity;
                });
                updates.items.forEach(item => {
                    stockChanges[item.productId] = stockChanges[item.productId] || {};
                    stockChanges[item.productId][getKey(item)] = (stockChanges[item.productId][getKey(item)] || 0) - item.quantity;
                });

                const newProducts = state.products.map(p => {
                    if (!stockChanges[p.id]) return p;
                    const productCopy = JSON.parse(JSON.stringify(p));
                    let totalStockChange = 0;
                    Object.entries(stockChanges[p.id]).forEach(([key, diff]) => {
                        const [size, color] = key.split('-');
                        if (size === 'none' && color === 'none') {
                            totalStockChange += diff;
                        } else {
                            const variantIndex = productCopy.variants.findIndex((v: ProductVariant) => (v.size || 'none') === size && (v.color || 'none') === color);
                            if (variantIndex > -1) {
                                productCopy.variants[variantIndex].quantity += diff;
                                totalStockChange += diff;
                            }
                        }
                    });
                    productCopy.stock += totalStockChange;
                    return productCopy;
                });
                
                const total = updates.items.reduce((sum, item) => sum + item.price * item.quantity, 0) - updates.discount;
                const paidAmount = originalOrder.paidAmount;
                const paymentStatus = recalculateOrderPaymentStatus({ ...originalOrder, total }, paidAmount);

                const updatedOrder = { ...originalOrder, ...updates, total, paymentStatus, modificationHistory: [...(originalOrder.modificationHistory || []), createModification('Commande modifiée.')]};
                dispatch({ type: 'UPDATE_ORDER', payload: { updatedOrder, newProducts } });
            },

            updateOrderDeliveryStatus: (orderId: string, newStatus: DeliveryStatus) => {
                dispatch({ type: 'UPDATE_ORDER_DELIVERY_STATUS', payload: { orderId, newStatus, modification: createModification(`Statut de livraison mis à jour à '${newStatus}'.`) } });
            },

            cancelOrder: (orderId: string) => {
                const order = state.orders.find(o => o.id === orderId);
                if (!order) return;
                const newProducts = state.products.map(p => {
                    const productInOrder = order.items.find(i => i.productId === p.id);
                    if (!productInOrder) return p;
                    const productCopy = JSON.parse(JSON.stringify(p));
                    if (productInOrder.size || productInOrder.color) {
                         const variantIndex = productCopy.variants.findIndex((v: ProductVariant) => v.size === productInOrder.size && v.color === productInOrder.color);
                        if (variantIndex > -1) {
                            productCopy.variants[variantIndex].quantity += productInOrder.quantity;
                        }
                    }
                    productCopy.stock += productInOrder.quantity;
                    return productCopy;
                });
                dispatch({ type: 'CANCEL_ORDER', payload: { orderId, newProducts, modification: createModification('Commande annulée.') } });
            },

            addPayment: (paymentData: { orderId: string; amount: number; method: Payment['method']; }) => {
                const order = state.orders.find(o => o.id === paymentData.orderId);
                if (!order) return;
                const newPayment = { ...paymentData, id: generateUniqueId('pay'), date: new Date() };
                const newPayments = [...state.payments, newPayment];
                const newPaidAmount = order.paidAmount + paymentData.amount;
                const newPaymentStatus = recalculateOrderPaymentStatus(order, newPaidAmount);
                const updatedOrder = { ...order, paidAmount: newPaidAmount, paymentStatus: newPaymentStatus, modificationHistory: [...(order.modificationHistory || []), createModification(`Nouveau paiement de ${paymentData.amount.toLocaleString()} FCFA ajouté.`)] };
                dispatch({ type: 'UPDATE_PAYMENTS_AND_ORDER', payload: { updatedOrder, newPayments } });
            },
            
            updatePayment: (paymentId: string, newAmount: number, newMethod: Payment['method']) => {
                const payment = state.payments.find(p => p.id === paymentId);
                if (!payment) return;
                const order = state.orders.find(o => o.id === payment.orderId);
                if (!order) return;

                const newPayments = state.payments.map(p => p.id === paymentId ? {...p, amount: newAmount, method: newMethod, date: new Date()} : p);
                const newPaidAmount = newPayments.filter(p => p.orderId === order.id).reduce((sum, p) => sum + p.amount, 0);
                const newPaymentStatus = recalculateOrderPaymentStatus(order, newPaidAmount);
                const updatedOrder = { ...order, paidAmount: newPaidAmount, paymentStatus: newPaymentStatus, modificationHistory: [...(order.modificationHistory || []), createModification(`Paiement de ${payment.amount.toLocaleString()} FCFA modifié à ${newAmount.toLocaleString()} FCFA.`)] };
                dispatch({ type: 'UPDATE_PAYMENTS_AND_ORDER', payload: { updatedOrder, newPayments } });
            },

            deletePayment: (paymentId: string) => {
                const payment = state.payments.find(p => p.id === paymentId);
                if (!payment) return;
                const order = state.orders.find(o => o.id === payment.orderId);
                if (!order) return;

                const newPayments = state.payments.filter(p => p.id !== paymentId);
                const newPaidAmount = order.paidAmount - payment.amount;
                const newPaymentStatus = recalculateOrderPaymentStatus(order, newPaidAmount);
                const updatedOrder = { ...order, paidAmount: newPaidAmount, paymentStatus: newPaymentStatus, modificationHistory: [...(order.modificationHistory || []), createModification(`Paiement de ${payment.amount.toLocaleString()} FCFA supprimé.`)] };
                dispatch({ type: 'UPDATE_PAYMENTS_AND_ORDER', payload: { updatedOrder, newPayments } });
            },

            createPaymentSchedule: (orderId: string, installments: Omit<Installment, 'status'>[]) => {
                const newSchedule: PaymentSchedule = { id: generateUniqueId('ps'), orderId, installments: installments.map(i => ({...i, status: 'En attente'})) };
                dispatch({ type: 'CREATE_PAYMENT_SCHEDULE', payload: { orderId, schedule: newSchedule, modification: createModification(`Échéancier de paiement créé avec ${installments.length} échéance(s).`) } });
            },

            updatePaymentSchedule: (orderId: string, installments: Omit<Installment, 'status'>[]) => {
                 const schedule = state.paymentSchedules.find(ps => ps.orderId === orderId);
                 if(!schedule) return actions.createPaymentSchedule(orderId, installments);
                 const updatedSchedule: PaymentSchedule = { ...schedule, installments: installments.map(i => ({...i, status: 'En attente'})) };
                 dispatch({ type: 'UPDATE_PAYMENT_SCHEDULE', payload: { orderId, schedule: updatedSchedule, modification: createModification(`Échéancier de paiement mis à jour.`) } });
            },

            markInstallmentAsPaid: (orderId: string, installmentIndex: number, method: Payment['method']) => {
                const order = state.orders.find(o => o.id === orderId);
                const schedule = state.paymentSchedules.find(ps => ps.orderId === orderId);
                if (!order || !schedule) return;
                const installment = schedule.installments[installmentIndex];
                if (installment.status === 'Payé') return;
                
                // Add payment
                actions.addPayment({ orderId, amount: installment.amount, method });

                // Update schedule state in a new dispatch to avoid race conditions with state update from addPayment
                const updatedSchedule = JSON.parse(JSON.stringify(schedule));
                updatedSchedule.installments[installmentIndex].status = 'Payé';
                dispatch({ type: 'UPDATE_PAYMENT_SCHEDULE', payload: { orderId, schedule: updatedSchedule, modification: createModification(`Échéance de ${installment.amount.toLocaleString()} FCFA marquée comme payée.`) } });
            },

            // Purchase Orders
            addPurchaseOrder: (poData: { supplierId: string, items: PurchaseOrderItem[], total: number, notes?: string }) => {
                const newPO: PurchaseOrder = {
                    ...poData,
                    id: generateUniqueId('po'),
                    date: new Date(),
                    status: 'Envoyée',
                    paidAmount: 0,
                    paymentStatus: 'En attente',
                };
                dispatch({ type: 'ADD_PURCHASE_ORDER', payload: newPO });
            },

            updatePurchaseOrder: (po: PurchaseOrder) => dispatch({ type: 'UPDATE_PURCHASE_ORDER', payload: po }),

            receivePurchaseOrderItems: (poId: string, receivedItems: Array<{ item: PurchaseOrderItem; quantityToReceive: number }>) => {
                const po = state.purchaseOrders.find(p => p.id === poId);
                if (!po) return;

                const newProducts = state.products.map(p => {
                    const productCopy = JSON.parse(JSON.stringify(p));
                    let totalStockChange = 0;
                    receivedItems.forEach(({ item, quantityToReceive }) => {
                        if (item.productId === p.id) {
                            if(item.size || item.color) {
                                const variantIndex = productCopy.variants.findIndex((v: ProductVariant) => v.size === item.size && v.color === item.color);
                                if (variantIndex > -1) {
                                    productCopy.variants[variantIndex].quantity += quantityToReceive;
                                }
                            }
                            totalStockChange += quantityToReceive;
                        }
                    });
                    productCopy.stock += totalStockChange;
                    return productCopy;
                });
                
                const updatedItems = po.items.map(item => {
                    const receivedInfo = receivedItems.find(ri => ri.item.productId === item.productId && ri.item.size === item.size && ri.item.color === item.color);
                    return { ...item, quantityReceived: item.quantityReceived + (receivedInfo?.quantityToReceive || 0) };
                });
                
                const allReceived = updatedItems.every(item => item.quantityReceived >= item.quantity);
                const someReceived = updatedItems.some(item => item.quantityReceived > 0);
                const status: PurchaseOrder['status'] = allReceived ? 'Reçue totalement' : someReceived ? 'Reçue partiellement' : 'Envoyée';

                const updatedPO = { ...po, items: updatedItems, status };
                dispatch({ type: 'RECEIVE_PURCHASE_ORDER_ITEMS', payload: { updatedPO, newProducts } });
            },
            
            addSupplierPayment: (paymentData: Omit<SupplierPayment, 'id'|'date'>) => {
                 const po = state.purchaseOrders.find(p => p.id === paymentData.purchaseOrderId);
                 if (!po) return;
                 const newPaidAmount = po.paidAmount + paymentData.amount;
                 const paymentStatus: PurchaseOrder['paymentStatus'] = newPaidAmount >= po.total ? 'Payé' : 'Partiellement payé';
                 const updatedPO = { ...po, paidAmount: newPaidAmount, paymentStatus };
                 const newPayment = { ...paymentData, id: generateUniqueId('spay'), date: new Date() };
                 dispatch({ type: 'ADD_SUPPLIER_PAYMENT', payload: { updatedPO, newPayment } });
            },

            // Users & Settings
            addUser: (userData: Omit<User, 'id'>) => dispatch({ type: 'ADD_USER', payload: { ...userData, id: generateUniqueId('usr') } }),
            updateUser: (user: User) => dispatch({ type: 'UPDATE_USER', payload: user }),
            deleteUser: (userId: string) => dispatch({ type: 'DELETE_USER', payload: userId }),
            resetAllData: () => dispatch({ type: 'RESET_ALL_DATA' }),
            restoreData: (data: any) => {
                dispatch({ type: 'RESTORE_DATA', payload: data });
                sessionStorage.removeItem('aminaShopCurrentUser');
            },
            updateBackupSettings: (settings: BackupSettings) => dispatch({ type: 'UPDATE_BACKUP_SETTINGS', payload: settings }),
            updateLastBackupTimestamp: (timestamp: number) => dispatch({ type: 'UPDATE_LAST_BACKUP_TIMESTAMP', payload: timestamp }),
        }
    }, [state]);

    if (state.isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-2xl font-semibold">Chargement des données...</p>
                    <p className="text-gray-500">Veuillez patienter.</p>
                </div>
            </div>
        );
    }

    return (
        <AminaShopContext.Provider value={{ state, actions }}>
            {children}
        </AminaShopContext.Provider>
    );
};

export const useAminaShop = () => useContext(AminaShopContext);