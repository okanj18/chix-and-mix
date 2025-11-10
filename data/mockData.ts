import { Product, Client, Supplier, Order, PurchaseOrder, Payment, SupplierPayment, PaymentSchedule, Modification, User } from '../types';

export const mockUsers: User[] = [
  { id: 'user1', name: 'Amina', pin: '1234', role: 'Admin' },
  { id: 'user2', name: 'Fatou', pin: '5678', role: 'Manager' },
  { id: 'user3', name: 'Mamadou', pin: '0000', role: 'Vendeur' },
];

export const mockSuppliers: Supplier[] = [
  { id: 'sup1', companyName: 'Dakar Chic Couture', contactPerson: 'Aïssatou Diop', phone: '77 123 45 67', email: 'contact@dakarchic.sn', address: '15 Rue Jules Ferry, Dakar' },
  { id: 'sup2', companyName: 'Teranga Textiles', contactPerson: 'Ousmane Sow', phone: '78 234 56 78', email: 'ventes@teranga-textiles.sn', address: '22 Avenue Lamine Gueye, Dakar' },
  { id: 'sup3', companyName: 'Bazin Royal', contactPerson: 'Mariama Ndiaye', phone: '76 345 67 89', email: 'info@bazinroyal.com', address: 'Cité Keur Gorgui, Dakar' },
  { id: 'sup4', companyName: 'Sénégal Accessoires', contactPerson: 'Cheikh Fall', phone: '70 456 78 90', email: 'cheikh.fall@senaccess.sn', address: 'Sicap Liberté 6, Dakar' },
  { id: 'sup5', companyName: 'Les Ateliers de la Médina', contactPerson: 'Khady Gueye', phone: '77 567 89 01', email: 'ateliers.medina@gmail.com', address: 'Médina, Rue 29, Dakar' },
  { id: 'sup6', companyName: 'African Style Import', contactPerson: 'Ibrahima Cissé', phone: '78 678 90 12', email: 'ibrahima@africanstyle.sn', address: 'Zone Industrielle, Dakar' },
  { id: 'sup7', companyName: 'Chaussures "Le Pas Léger"', contactPerson: 'Alioune Ba', phone: '76 789 01 23', email: 'contact@pasleger.com', address: 'Avenue Bourguiba, Dakar' },
  { id: 'sup8', companyName: 'Bijoux "Perle Noire"', contactPerson: 'Ndeye Thiam', phone: '70 890 12 34', email: 'ndeye.thiam@perlenoire.sn', address: 'Almadies, Dakar' },
  { id: 'sup9', companyName: 'Marodi Wear', contactPerson: 'Mamadou Diallo', phone: '77 901 23 45', email: 'mamadou.d@marodi.sn', address: 'Point E, Dakar' },
  { id: 'sup10', companyName: 'Getzner Boubou', contactPerson: 'Fatou Faye', phone: '78 012 34 56', email: 'fatou.faye@getzner.sn', address: 'Marché Sandaga, Dakar' }
];

export const mockProducts: Product[] = [
  { id: 'prod1', name: 'T-Shirt Coton Bio', sku: 'TS-CB-001', description: 'T-shirt simple et élégant en coton biologique.', category: 'Vêtements', supplierId: 'sup2', purchasePrice: 5000, sellingPrice: 15000, stock: 75, alertThreshold: 20, variants: [ { size: 'S', color: 'Blanc', quantity: 20 }, { size: 'M', color: 'Blanc', quantity: 30 }, { size: 'L', color: 'Blanc', quantity: 25 } ], imageUrl: 'https://picsum.photos/seed/prod1/200/200' },
  { id: 'prod2', name: 'Jean Slim Fit', sku: 'JN-SF-002', description: 'Jean moderne et confortable.', category: 'Vêtements', supplierId: 'sup1', purchasePrice: 15000, sellingPrice: 40000, stock: 4, alertThreshold: 10, variants: [ { size: '30', color: 'Bleu Brut', quantity: 2 }, { size: '32', color: 'Bleu Brut', quantity: 2 }], imageUrl: 'https://picsum.photos/seed/prod2/200/200' },
  { id: 'prod3', name: 'Sac à Main Cuir', sku: 'SC-CU-003', description: 'Sac à main élégant en cuir véritable.', category: 'Accessoires', supplierId: 'sup4', purchasePrice: 25000, sellingPrice: 75000, stock: 15, alertThreshold: 5, variants: [ { color: 'Noir', quantity: 10 }, { color: 'Marron', quantity: 5 }], imageUrl: 'https://picsum.photos/seed/prod3/200/200' },
  { id: 'prod4', name: 'Baskets Urbaines', sku: 'BK-UR-004', description: 'Baskets confortables pour la ville.', category: 'Chaussures', supplierId: 'sup7', purchasePrice: 20000, sellingPrice: 55000, stock: 30, alertThreshold: 10, variants: [ { size: '42', color: 'Blanc', quantity: 15 }, { size: '43', color: 'Blanc', quantity: 15 }], imageUrl: 'https://picsum.photos/seed/prod4/200/200' },
];

export const mockClients: Client[] = [
  { id: 'cli1', firstName: 'Fatou', lastName: 'Diop', phone: '77 555 11 22', email: 'fatou.diop@email.com', address: 'Yoff, Cité Apecsy, Dakar' },
  { id: 'cli2', firstName: 'Mamadou', lastName: 'Sow', phone: '78 444 33 22', email: 'mamadou.sow@email.com', address: 'Grand Yoff, Dakar' },
  { id: 'cli3', firstName: 'Aïssatou', lastName: 'Ndiaye', phone: '76 333 44 55', email: 'aissatou.ndiaye@email.com', address: 'Sacré Coeur 3, Dakar' },
  { id: 'cli4', firstName: 'Ousmane', lastName: 'Fall', phone: '70 222 55 66', email: 'ousmane.fall@email.com', address: 'Parcelles Assainies U22, Dakar' },
  { id: 'cli5', firstName: 'Mariama', lastName: 'Gueye', phone: '77 111 66 77', email: 'mariama.gueye@email.com', address: 'Fann Résidence, Dakar' },
  { id: 'cli6', firstName: 'Cheikh', lastName: 'Cissé', phone: '78 999 88 77', email: 'cheikh.cisse@email.com', address: 'Ouakam, Cité Comico, Dakar' },
  { id: 'cli7', firstName: 'Khady', lastName: 'Diallo', phone: '76 888 77 66', email: 'khady.diallo@email.com', address: 'Mermoz, Dakar' },
  { id: 'cli8', firstName: 'Ibrahima', lastName: 'Ba', phone: '70 777 66 55', email: 'ibrahima.ba@email.com', address: 'HLM Grand Médine, Dakar' },
  { id: 'cli9', firstName: 'Ndeye', lastName: 'Thiam', phone: '77 666 55 44', email: 'ndeye.thiam@email.com', address: 'Liberté 5, Dakar' },
  { id: 'cli10', firstName: 'Alioune', lastName: 'Faye', phone: '78 555 44 33', email: 'alioune.faye@email.com', address: 'Patte d\'Oie, Dakar' }
];

export const mockOrders: Order[] = [
  { id: 'ord1', date: new Date(new Date().setDate(new Date().getDate() - 1)), clientId: 'cli1', items: [{ productId: 'prod1', quantity: 1, price: 15000 }, { productId: 'prod3', quantity: 1, price: 75000 }], total: 90000, paymentStatus: 'Payé', deliveryStatus: 'Livrée', paidAmount: 90000, isArchived: false, modificationHistory: [
    { date: new Date(new Date().setDate(new Date().getDate() - 1)), user: 'Admin', description: 'Commande créée.' },
    { date: new Date(new Date().setDate(new Date().getDate() - 1)), user: 'Admin', description: 'Commande marquée comme payée à la création pour 90000 FCFA.' },
    { date: new Date(new Date().setDate(new Date().getDate() - 1)), user: 'Admin', description: "Statut de livraison mis à jour à 'Livrée'." },
  ] },
  { id: 'ord2', date: new Date(), clientId: 'cli2', items: [{ productId: 'prod2', quantity: 1, price: 40000 }], total: 40000, paymentStatus: 'Payé', deliveryStatus: 'En préparation', paidAmount: 40000, isArchived: false, modificationHistory: [
    { date: new Date(), user: 'Admin', description: 'Commande créée.' },
    { date: new Date(), user: 'Admin', description: 'Commande marquée comme payée à la création pour 40000 FCFA.' },
    { date: new Date(), user: 'Admin', description: "Statut de livraison mis à jour à 'En préparation'." },
  ] },
  { id: 'ord3', date: new Date(new Date().setDate(new Date().getDate() - 5)), clientId: 'cli5', items: [{ productId: 'prod4', quantity: 2, price: 55000 }], total: 110000, paymentStatus: 'Partiellement payé', deliveryStatus: 'En attente', paidAmount: 20000, paymentScheduleId: 'ps1', isArchived: false, modificationHistory: [
    { date: new Date(new Date().setDate(new Date().getDate() - 5)), user: 'Admin', description: 'Commande créée.' },
    { date: new Date(new Date().setDate(new Date().getDate() - 5)), user: 'Admin', description: 'Échéancier de paiement créé avec 2 échéance(s).' },
    { date: new Date(new Date().setDate(new Date().getDate() - 4)), user: 'Admin', description: 'Nouveau paiement de 20000 FCFA ajouté.' },
  ] },
];

export const mockPayments: Payment[] = [
    { id: 'pay1', orderId: 'ord1', date: new Date(new Date().setDate(new Date().getDate() - 1)), amount: 90000, method: 'Carte de crédit' },
    { id: 'pay2', orderId: 'ord2', date: new Date(), amount: 40000, method: 'Mobile Money' },
    { id: 'pay3', orderId: 'ord3', date: new Date(new Date().setDate(new Date().getDate() - 4)), amount: 20000, method: 'Espèces' },
];

export const mockPaymentSchedules: PaymentSchedule[] = [
    {
        id: 'ps1',
        orderId: 'ord3',
        installments: [
            { dueDate: new Date(new Date().setDate(new Date().getDate() + 15)), amount: 45000, status: 'En attente' },
            { dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), amount: 45000, status: 'En attente' },
        ]
    }
];

export const mockPurchaseOrders: PurchaseOrder[] = [
    { id: 'po1', supplierId: 'sup2', date: new Date(new Date().setDate(new Date().getDate() - 10)), items: [{ productId: 'prod1', quantity: 50, quantityReceived: 50, purchasePrice: 5000 }], status: 'Reçue totalement', total: 250000, paidAmount: 250000, paymentStatus: 'Payé' },
    { id: 'po2', supplierId: 'sup4', date: new Date(new Date().setDate(new Date().getDate() - 2)), items: [{ productId: 'prod3', quantity: 20, quantityReceived: 0, purchasePrice: 25000 }], status: 'Envoyée', total: 500000, paidAmount: 0, paymentStatus: 'En attente' },
    { id: 'po3', supplierId: 'sup1', date: new Date(new Date().setDate(new Date().getDate() - 5)), items: [{ productId: 'prod2', quantity: 10, quantityReceived: 5, purchasePrice: 15000 }], status: 'Reçue partiellement', total: 150000, paidAmount: 75000, paymentStatus: 'Partiellement payé' },
];

export const mockSupplierPayments: SupplierPayment[] = [
    { id: 'spay1', purchaseOrderId: 'po1', date: new Date(new Date().setDate(new Date().getDate() - 9)), amount: 250000, method: 'Virement bancaire' },
    { id: 'spay2', purchaseOrderId: 'po3', date: new Date(new Date().setDate(new Date().getDate() - 4)), amount: 75000, method: 'Espèces' },
];