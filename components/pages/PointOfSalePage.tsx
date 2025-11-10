import React, { useState, useMemo, useEffect } from 'react';
import { useAminaShop } from '../../context/AminaShopContext';
import { OrderItem, Client, Product, ProductVariant, PaymentStatus } from '../../types';
import { Card, Button, Input, Select, Modal } from '../ui/Shared';
import { TrashIcon, Squares2x2Icon, Bars3Icon } from '../icons';


const VariantSelectionModal: React.FC<{ 
    product: Product; 
    onClose: () => void; 
    onAddToCart: (product: Product, variant: { size?: string, color?: string }, quantity: number) => void; 
}> = ({ product, onClose, onAddToCart }) => {
    
    const hasSizes = useMemo(() => product.variants.some(v => v.size), [product]);
    const hasColors = useMemo(() => product.variants.some(v => v.color), [product]);

    const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
    const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
    const [quantity, setQuantity] = useState(1);

    const availableSizes = useMemo(() => hasSizes ? [...new Set(product.variants.map(v => v.size).filter(Boolean))] as string[] : [], [product, hasSizes]);
    
    const availableColors = useMemo(() => {
        if (!hasColors) return [];
        let variants = product.variants;
        if (hasSizes && selectedSize) {
            variants = variants.filter(v => v.size === selectedSize);
        }
        return [...new Set(variants.map(v => v.color).filter(Boolean))] as string[];
    }, [product, hasColors, hasSizes, selectedSize]);

    useEffect(() => {
        if (availableSizes.length > 0 && !selectedSize) {
            setSelectedSize(availableSizes[0]);
        }
    }, [availableSizes, selectedSize]);

    useEffect(() => {
        if (availableColors.length > 0) {
            setSelectedColor(prev => {
                const isPreviousSelectionValid = prev && availableColors.includes(prev);
                return isPreviousSelectionValid ? prev : availableColors[0];
            });
        } else {
             setSelectedColor(undefined);
        }
    }, [availableColors]);
    
    const selectedVariant = useMemo(() => {
        return product.variants.find(v => {
            const sizeMatch = hasSizes ? v.size === selectedSize : true;
            const colorMatch = hasColors ? v.color === selectedColor : true;
            return sizeMatch && colorMatch;
        });
    }, [product, hasSizes, hasColors, selectedSize, selectedColor]);

    const availableStock = selectedVariant?.quantity || 0;

    const handleAddToCartClick = () => {
        if (!selectedVariant || quantity <= 0 || quantity > availableStock) return;
        onAddToCart(product, { size: selectedSize, color: selectedColor }, quantity);
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Sélectionner pour ${product.name}`}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {hasSizes && (
                        <div className="border-2 border-gray-300 p-3 rounded-lg">
                            <Select label="Taille" value={selectedSize || ''} onChange={e => setSelectedSize(e.target.value)} labelClassName="!text-base !font-semibold !text-gray-900">
                                 {availableSizes.map(size => <option key={size} value={size}>{size}</option>)}
                            </Select>
                        </div>
                    )}
                    {hasColors && (
                        <div className="border-2 border-gray-300 p-3 rounded-lg">
                            <Select label="Couleur" value={selectedColor || ''} onChange={e => setSelectedColor(e.target.value)} disabled={availableColors.length === 0} labelClassName="!text-base !font-semibold !text-gray-900">
                                {availableColors.map(color => <option key={color} value={color}>{color}</option>)}
                            </Select>
                        </div>
                    )}
                </div>
                <div className="border-2 border-gray-300 p-3 rounded-lg">
                    <Input 
                        label="Quantité" 
                        type="number" 
                        value={quantity} 
                        onChange={e => setQuantity(parseInt(e.target.value) || 1)} 
                        min="1" 
                        max={availableStock}
                        labelClassName="!text-base !font-semibold !text-gray-900"
                        className={availableStock > 0 && availableStock < 5 ? 'bg-yellow-50 border-yellow-300 focus:ring-yellow-400 focus:border-yellow-400' : ''}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                        Stock disponible pour cette sélection : 
                        <span className={`font-bold ${availableStock <= 0 ? 'text-red-600' : (availableStock < 5 ? 'text-yellow-600' : '')}`}>
                            {availableStock}
                        </span>
                        {availableStock > 0 && availableStock < 5 && <span className="text-yellow-600 font-semibold"> (Stock faible!)</span>}
                    </p>
                </div>
                 <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                    <Button onClick={handleAddToCartClick} disabled={!selectedVariant || availableStock <= 0 || quantity > availableStock}>Ajouter au Panier</Button>
                </div>
            </div>
        </Modal>
    );
};

export const PointOfSalePage: React.FC = () => {
    const { state, actions } = useAminaShop();
    const { products, clients } = state;
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [isCheckoutModalOpen, setCheckoutModalOpen] = useState(false);
    
    const [isVariantModalOpen, setVariantModalOpen] = useState(false);
    const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);

    const [view, setView] = useState<'grid' | 'list'>('list');

    // Checkout Modal State
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('En attente');
    const [discount, setDiscount] = useState(0);
    const [notes, setNotes] = useState('');

    const filteredProducts = useMemo(() =>
        products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        [products, searchTerm]
    );

    const handleProductClick = (product: Product) => {
        if (product.stock <= 0) return;
        if (product.variants && product.variants.length > 0) {
            setSelectedProductForVariant(product);
            setVariantModalOpen(true);
        } else {
            addToCart(product, undefined, 1);
        }
    };
    
    const addToCart = (product: Product, variant: { size?: string, color?: string } | undefined, quantityToAdd: number) => {
        const existingItem = cart.find(
            item => item.productId === product.id && item.size === variant?.size && item.color === variant?.color
        );

        if (existingItem) {
            const newQuantity = existingItem.quantity + quantityToAdd;
            setCart(cart.map(item => 
                (item.productId === product.id && item.size === variant?.size && item.color === variant?.color)
                ? { ...item, quantity: newQuantity } 
                : item
            ));
        } else {
            setCart(prev => [...prev, {
                productId: product.id,
                quantity: quantityToAdd,
                price: product.sellingPrice,
                size: variant?.size,
                color: variant?.color
            }]);
        }
    };

    const removeFromCart = (productId: string, size?: string, color?: string) => {
        setCart(cart.filter(item => !(item.productId === productId && item.size === size && item.color === color)));
    };

    const updateQuantity = (productId: string, size: string | undefined, color: string | undefined, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(productId, size, color);
            return;
        }

        setCart(cart.map(item => (item.productId === productId && item.size === size && item.color === color) ? { ...item, quantity } : item));
    };

    const cartTotal = useMemo(() =>
        cart.reduce((total, item) => total + item.price * item.quantity, 0),
        [cart]
    );

    const handleOpenCheckoutModal = () => {
        if (cart.length === 0 || !selectedClient) {
            alert('Veuillez ajouter des produits et sélectionner un client.');
            return;
        }
        setCheckoutModalOpen(true);
    };
    
    const handleConfirmSale = () => {
        actions.createOrder({
            clientId: selectedClient,
            items: cart,
            paymentStatus,
            discount,
            notes,
        });

        // Reset state
        setCart([]);
        setCheckoutModalOpen(false);
        setPaymentStatus('En attente');
        setDiscount(0);
        setNotes('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };
    
    const finalTotal = cartTotal - discount;

    const paymentStatusClass = useMemo(() => {
        switch (paymentStatus) {
            case 'Payé':
                return 'bg-green-100 text-green-800 border-green-300 focus:ring-green-500 focus:border-green-500 font-semibold';
            case 'En attente':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300 focus:ring-yellow-500 focus:border-yellow-500 font-semibold animate-pulse';
            default:
                return '';
        }
    }, [paymentStatus]);

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Product Selection */}
                <div className="lg:col-span-2">
                    <Card>
                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                            <div className="flex-grow">
                                <Input
                                    label="Rechercher un produit"
                                    id="product-search"
                                    placeholder="Nom ou référence..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex items-end">
                                <div className="p-1 bg-gray-200 rounded-lg flex self-stretch sm:self-auto">
                                    <button onClick={() => setView('grid')} className={`p-1.5 rounded-md ${view === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`} aria-label="Vue grille"><Squares2x2Icon className="w-5 h-5"/></button>
                                    <button onClick={() => setView('list')} className={`p-1.5 rounded-md ${view === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`} aria-label="Vue liste"><Bars3Icon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="max-h-[60vh] overflow-y-auto p-2 -m-2">
                            {view === 'grid' ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {filteredProducts.map(product => {
                                        const totalStock = product.stock;
                                        const isOutOfStock = totalStock <= 0;
                                        const isLowStock = totalStock > 0 && totalStock <= product.alertThreshold;
                                        return (
                                        <div 
                                            key={product.id} 
                                            className={`border rounded-lg p-3 flex flex-col text-center transition-all duration-200 
                                                ${isOutOfStock ? 'opacity-50 bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg hover:border-primary-300'}
                                                ${isLowStock ? 'border-yellow-400' : ''}
                                            `}
                                            onClick={() => handleProductClick(product)}
                                        >
                                            <div className="relative w-full h-32 bg-gray-200 rounded-md mb-3 flex items-center justify-center overflow-hidden">
                                                {isLowStock && <span className="absolute top-1 left-1 px-1.5 py-0.5 text-xs font-semibold bg-yellow-400 text-yellow-900 rounded-md">Stock bas</span>}
                                                <img src={product.imageUrl || 'https://via.placeholder.com/150x150'} alt={product.name} className="object-cover h-full w-full"/>
                                            </div>
                                            <div className="flex-grow flex flex-col justify-between">
                                                <p className="text-sm font-semibold text-gray-800 flex-grow">{product.name}</p>
                                                <div className="mt-2">
                                                    <div className="flex items-baseline justify-center gap-2">
                                                        <p className="text-sm text-gray-500">Stock:</p>
                                                        <p className={`text-lg font-bold ${isOutOfStock ? 'text-red-600' : (isLowStock ? 'text-yellow-600' : 'text-gray-800')}`}>{totalStock}</p>
                                                    </div>
                                                    {product.variants && product.variants.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1 justify-center max-h-14 overflow-y-auto text-[10px] leading-tight">
                                                            {product.variants.map((variant, index) => {
                                                                if (variant.quantity <= 0) return null;
                                                                const variantName = [variant.size, variant.color].filter(Boolean).join('/');
                                                                return (
                                                                    <span key={index} className="px-1.5 py-0.5 font-medium rounded-full bg-gray-200 text-gray-700">
                                                                        {variantName}: {variant.quantity}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    <p className="text-base font-bold text-primary-700 mt-2">{product.sellingPrice.toLocaleString()} FCFA</p>
                                                </div>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {filteredProducts.map(product => {
                                        const totalStock = product.stock;
                                        const isOutOfStock = totalStock <= 0;
                                        const isLowStock = totalStock > 0 && totalStock <= product.alertThreshold;
                                        return (
                                            <div 
                                                key={product.id} 
                                                className={`flex items-center gap-4 p-3 rounded-lg
                                                    ${isOutOfStock ? 'opacity-50 bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}
                                                    ${isLowStock ? 'border border-yellow-400' : ''}
                                                `}
                                                onClick={() => handleProductClick(product)}
                                            >
                                                <img src={product.imageUrl || 'https://via.placeholder.com/64x64'} alt={product.name} className="w-16 h-16 object-cover rounded-md flex-shrink-0"/>
                                                <div className="flex-grow">
                                                    <p className="font-semibold text-gray-800">{product.name}</p>
                                                    <p className="text-sm text-gray-500">{product.sku}</p>
                                                </div>
                                                <div className="shrink-0 w-32 text-left">
                                                    <p className="font-bold text-lg text-primary-700">{product.sellingPrice.toLocaleString()} FCFA</p>
                                                </div>
                                                <div className="shrink-0 w-40 text-right">
                                                    <p className={`text-lg font-bold ${isOutOfStock ? 'text-red-600' : (isLowStock ? 'text-yellow-600' : 'text-gray-800')}`}>{totalStock}</p>
                                                    {product.variants && product.variants.length > 0 && (
                                                        <div className="flex flex-col items-end gap-1 mt-1">
                                                            {product.variants.map((variant, index) => {
                                                                if (variant.quantity <= 0) return null;
                                                                const variantName = [variant.size, variant.color].filter(Boolean).join('/');
                                                                return (
                                                                    <span key={index} className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-800">
                                                                        {variantName}: {variant.quantity}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                             {filteredProducts.length === 0 && <p className="text-center text-gray-500 py-10">Aucun produit ne correspond à la recherche.</p>}
                        </div>
                    </Card>
                </div>

                {/* Cart and Checkout */}
                <div className="lg:col-span-1">
                    <Card title="Panier">
                        <div className="space-y-4">
                            <Select 
                                label="Client" 
                                value={selectedClient} 
                                onChange={e => setSelectedClient(e.target.value)}
                                required
                                className={!selectedClient ? 'border-primary-400 ring-2 ring-primary-200' : ''}
                            >
                                <option value="" disabled>Sélectionner un client</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                            </Select>
                            <hr/>
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                {cart.length === 0 && <p className="text-gray-500 text-center">Le panier est vide.</p>}
                                {cart.map(item => {
                                    const product = products.find(p => p.id === item.productId);
                                    if (!product) return null;
                                    return (
                                        <div key={`${item.productId}-${item.size}-${item.color}`} className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{product.name}</p>
                                                {(item.size || item.color) && (
                                                    <p className="text-xs text-gray-500">
                                                        {item.size}{item.size && item.color ? ', ' : ''}{item.color}
                                                    </p>
                                                )}
                                                <p className="text-sm text-gray-500">{item.price.toLocaleString()} FCFA</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input label="" id={`qty-${product.id}`} type="number" value={item.quantity} onChange={(e) => updateQuantity(product.id, item.size, item.color, parseInt(e.target.value))} className="w-16 text-center" />
                                                <button onClick={() => removeFromCart(item.productId, item.size, item.color)} className="text-red-500 hover:text-red-700"><TrashIcon/></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <hr/>
                            <div className="text-xl font-bold flex justify-between">
                                <span>Total:</span>
                                <span>{cartTotal.toLocaleString()} FCFA</span>
                            </div>
                            <Button className="w-full" onClick={handleOpenCheckoutModal} disabled={cart.length === 0 || !selectedClient}>
                                Valider la Commande
                            </Button>
                            {showSuccess && <div className="mt-2 text-center p-2 bg-green-100 text-green-700 rounded-md">Vente enregistrée avec succès !</div>}
                        </div>
                    </Card>
                </div>
            </div>

            {isVariantModalOpen && selectedProductForVariant && (
                <VariantSelectionModal 
                    product={selectedProductForVariant}
                    onClose={() => setVariantModalOpen(false)}
                    onAddToCart={addToCart}
                />
            )}

            <Modal isOpen={isCheckoutModalOpen} onClose={() => setCheckoutModalOpen(false)} title="Confirmation de la Vente">
                <div className="space-y-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-xl mb-2">Récapitulatif</h3>
                        <ul className="list-disc list-inside text-lg space-y-1">
                            {cart.map(item => {
                                const product = products.find(p => p.id === item.productId);
                                const variantString = (item.size || item.color) ? ` (${item.size || ''}${item.size && item.color ? ', ' : ''}${item.color || ''})` : '';
                                return <li key={`${item.productId}-${item.size}-${item.color}`}>{product?.name}{variantString} x {item.quantity}</li>
                            })}
                        </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <Select 
                            label="Statut du Paiement" 
                            labelClassName="!text-lg"
                            value={paymentStatus} 
                            onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}
                            className={`${paymentStatusClass} !text-lg !py-3`}
                        >
                            <option value="En attente">En attente</option>
                            <option value="Payé">Payé</option>
                        </Select>
                        <Input label="Remise (FCFA)" labelClassName="!text-lg" type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="!text-lg !py-3" />
                    </div>
                     <Input label="Remarques (optionnel)" labelClassName="!text-base" name="notes" value={notes} onChange={e => setNotes(e.target.value)} className="!text-base" />
                    
                     <div className="border-t pt-4 space-y-2 text-right">
                        <p className="text-lg"><strong>Sous-total:</strong> {cartTotal.toLocaleString()} FCFA</p>
                        {discount > 0 && <p className="text-red-600 text-lg"><strong>Remise:</strong> -{discount.toLocaleString()} FCFA</p>}
                        <p className="text-4xl font-bold">Total à Payer: {finalTotal.toLocaleString()} FCFA</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" onClick={() => setCheckoutModalOpen(false)}>Annuler</Button>
                        <Button onClick={handleConfirmSale}>Confirmer la Vente</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};