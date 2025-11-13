import React, { useState, useMemo, useEffect } from 'react';
import { useAminaShop } from '../../context/AminaShopContext';
import { Product, ProductVariant, PurchaseOrderItem } from '../../types';
import { Card, Button, Input, Modal, Select, useSortableData, SortableHeader } from '../ui/Shared';
import { PlusIcon, AlertIcon, TrashIcon, PencilIcon, ChevronDownIcon, ReplenishmentIcon, SparklesIcon } from '../icons';
import { PurchaseOrderForm } from '../forms/PurchaseOrderForm';
import { GoogleGenAI } from "@google/genai";

const ProductForm: React.FC<{ product?: Product; onClose: () => void }> = ({ product, onClose }) => {
  const { state, actions } = useAminaShop();
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: product?.name || '',
    sku: product?.sku || '',
    description: product?.description || '',
    category: product?.category || '',
    supplierId: product?.supplierId || '',
    purchasePrice: product?.purchasePrice || 0,
    sellingPrice: product?.sellingPrice || 0,
    stock: product?.stock || 0,
    alertThreshold: product?.alertThreshold || 10,
    variants: product?.variants || [],
    imageUrl: product?.imageUrl || '',
  });
  
  const [hasSizeVariant, setHasSizeVariant] = useState(
    product ? product.variants.some(v => v.size && v.size.trim() !== '') : false
  );
  const [hasColorVariant, setHasColorVariant] = useState(
    product ? product.variants.some(v => v.color && v.color.trim() !== '') : false
  );

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [descKeywords, setDescKeywords] = useState('');

  useEffect(() => {
    if (hasSizeVariant || hasColorVariant) {
      const totalStock = formData.variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
      setFormData(prev => ({ ...prev, stock: totalStock }));
    }
  }, [formData.variants, hasSizeVariant, hasColorVariant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name.includes('Price') || name.includes('stock') || name.includes('Threshold') ? parseFloat(value) : value }));
  };

  const handleGenerateDescription = async () => {
    if (!formData.name || !formData.category) {
        alert("Veuillez d'abord renseigner le nom et la catégorie du produit.");
        return;
    }
    setIsGeneratingDesc(true);
    try {
        if (!process.env.API_KEY) throw new Error("API key is not configured.");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Rédige une description de produit marketing courte et attrayante (2-3 phrases) pour un article de mode nommé "${formData.name}" dans la catégorie "${formData.category}". ${descKeywords ? `Mets en avant les aspects suivants : ${descKeywords}.` : ''} Le ton doit être chic et moderne, adapté à une boutique de mode au Sénégal.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text;
        if (text) {
            setFormData(prev => ({ ...prev, description: text }));
        } else {
            throw new Error("La réponse de l'IA est vide.");
        }
    } catch (error) {
        console.error("Erreur de génération de description:", error);
        alert("La génération de la description a échoué. Veuillez vérifier la console pour plus de détails.");
    } finally {
        setIsGeneratingDesc(false);
    }
  };


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    const fileInput = document.getElementById('imageUpload') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
  };

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: string) => {
    const newVariants = formData.variants.map((variant, i) => {
        if (i === index) {
            const newValue = field === 'quantity' ? parseInt(value, 10) || 0 : value;
            return { ...variant, [field]: newValue };
        }
        return variant;
    });
    setFormData(prev => ({ ...prev, variants: newVariants }));
  };

  const addVariant = () => {
      setFormData(prev => ({
          ...prev,
          variants: [...prev.variants, { size: '', color: '', quantity: 0 }]
      }));
  };

  const removeVariant = (index: number) => {
      setFormData(prev => ({
          ...prev,
          variants: prev.variants.filter((_, i) => i !== index)
      }));
  };

  const handleVariantTypeChange = (type: 'size' | 'color', isChecked: boolean) => {
    const newHasSize = type === 'size' ? isChecked : hasSizeVariant;
    const newHasColor = type === 'color' ? isChecked : hasColorVariant;

    setHasSizeVariant(newHasSize);
    setHasColorVariant(newHasColor);

    if (!newHasSize && !newHasColor) {
        // Both toggled off
        setFormData(prev => ({ ...prev, variants: [] }));
    } else if (formData.variants.length === 0 && (newHasSize || newHasColor)) {
        // First time enabling variants for this product
        setFormData(prev => ({ ...prev, variants: [{ size: '', color: '', quantity: 0 }] }));
    } else {
        // Variants exist, just trim the properties
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map(variant => {
                const newVariant: ProductVariant = { quantity: variant.quantity };
                if (newHasSize) newVariant.size = variant.size;
                if (newHasColor) newVariant.color = variant.color;
                return newVariant;
            })
        }));
    }
  };

  const handleAddNewCategory = () => {
    setIsCategoryModalOpen(true);
  };
  
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName && newCategoryName.trim() !== '') {
        const trimmedCategory = newCategoryName.trim();
        actions.addCategory(trimmedCategory);
        setFormData(prev => ({ ...prev, category: trimmedCategory }));
        setNewCategoryName('');
        setIsCategoryModalOpen(false);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (product) {
      actions.updateProduct({ ...formData, id: product.id });
    } else {
      actions.addProduct(formData);
    }
    onClose();
  };

  const sizeColSpan = hasSizeVariant && hasColorVariant ? 'col-span-4' : 'col-span-6';
  const colorColSpan = hasSizeVariant && hasColorVariant ? 'col-span-4' : 'col-span-6';
  const quantityColSpan = hasSizeVariant && hasColorVariant ? 'col-span-3' : 'col-span-5';
  const removeColSpan = 'col-span-1';

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nom du produit" name="name" value={formData.name} onChange={handleChange} required />
              <Input label="Référence (SKU)" name="sku" value={formData.sku} onChange={handleChange} required />
              
               <div className="md:col-span-2 space-y-2">
                    <div className="flex justify-between items-center">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                        <Button type="button" variant="secondary" size="sm" onClick={handleGenerateDescription} disabled={isGeneratingDesc}>
                            <SparklesIcon className={`w-4 h-4 mr-1 ${isGeneratingDesc ? 'animate-spin' : ''}`} />
                            {isGeneratingDesc ? 'Génération...' : 'Générer avec l\'IA'}
                        </Button>
                    </div>
                     <Input label="" name="desc_keywords" value={descKeywords} onChange={(e) => setDescKeywords(e.target.value)} placeholder="Mots-clés (ex: élégant, soirée, coton)..." />
                    <textarea 
                        id="description" 
                        name="description" 
                        value={formData.description} 
                        onChange={handleChange} 
                        rows={3}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                    />
               </div>

              <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">Catégorie</label>
                  <div className="mt-1 flex items-center gap-2">
                      <select
                          id="category"
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          required
                          className="block w-full flex-grow pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                      >
                          <option value="">Sélectionner une catégorie</option>
                          {state.categories.sort().map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <Button
                          type="button"
                          variant="secondary"
                          onClick={handleAddNewCategory}
                          className="!p-2"
                          aria-label="Ajouter une nouvelle catégorie"
                      >
                          <PlusIcon className="w-5 h-5"/>
                      </Button>
                  </div>
              </div>
              <Select label="Fournisseur" name="supplierId" value={formData.supplierId} onChange={handleChange} required>
                  <option value="">Sélectionner un fournisseur</option>
                  {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}
              </Select>
              <Input label="Prix d'achat (FCFA)" name="purchasePrice" type="number" value={formData.purchasePrice} onChange={handleChange} required />
              <Input label="Prix de vente (FCFA)" name="sellingPrice" type="number" value={formData.sellingPrice} onChange={handleChange} required />
              
              <div className="md:col-span-2 flex items-center gap-4 border-t pt-4">
                  <div className="flex items-center">
                      <input type="checkbox" id="hasSizeVariant" checked={hasSizeVariant} onChange={(e) => handleVariantTypeChange('size', e.target.checked)} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"/>
                      <label htmlFor="hasSizeVariant" className="ml-2 block text-sm text-gray-900">Ce produit a plusieurs tailles</label>
                  </div>
                  <div className="flex items-center">
                      <input type="checkbox" id="hasColorVariant" checked={hasColorVariant} onChange={(e) => handleVariantTypeChange('color', e.target.checked)} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"/>
                      <label htmlFor="hasColorVariant" className="ml-2 block text-sm text-gray-900">Ce produit a plusieurs couleurs</label>
                  </div>
              </div>

              <div>
                <Input 
                  label="Quantité en stock" 
                  name="stock" 
                  type="number" 
                  value={formData.stock} 
                  onChange={handleChange} 
                  required 
                  disabled={hasSizeVariant || hasColorVariant}
                  readOnly={hasSizeVariant || hasColorVariant}
                />
                {(hasSizeVariant || hasColorVariant) && <p className="text-xs text-gray-500 mt-1">Le stock total est calculé à partir des variants.</p>}
              </div>
              <Input label="Seuil d'alerte" name="alertThreshold" type="number" value={formData.alertThreshold} onChange={handleChange} required />
              
              {(hasSizeVariant || hasColorVariant) && (
                <div className="md:col-span-2 border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Variants</h3>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {formData.variants.map((variant, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-md bg-gray-50">
                          {hasSizeVariant && (
                            <div className={sizeColSpan}>
                                <Input label="Taille" name={`size-${index}`} value={variant.size || ''} onChange={(e) => handleVariantChange(index, 'size', e.target.value)} placeholder="ex: M, 42" />
                            </div>
                          )}
                          {hasColorVariant && (
                            <div className={colorColSpan}>
                                <Input label="Couleur" name={`color-${index}`} value={variant.color || ''} onChange={(e) => handleVariantChange(index, 'color', e.target.value)} placeholder="ex: Bleu" />
                            </div>
                          )}
                          <div className={quantityColSpan}>
                            <Input label="Quantité" name={`quantity-${index}`} type="number" value={variant.quantity} onChange={(e) => handleVariantChange(index, 'quantity', e.target.value)} required min="0" />
                          </div>
                          <div className={`${removeColSpan} flex justify-end pb-2`}>
                            <button type="button" onClick={() => removeVariant(index)} className="p-2 text-red-500 hover:text-red-700" aria-label="Supprimer le variant">
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                    ))}
                    </div>
                    <Button type="button" variant="secondary" size="sm" onClick={addVariant} className="mt-2">
                    <PlusIcon className="w-4 h-4 mr-1" /> Ajouter un Variant
                    </Button>
                </div>
              )}

              <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Image du produit</label>
                  <div className="mt-1 flex items-center gap-4">
                      <span className="inline-block h-24 w-24 overflow-hidden rounded-md bg-gray-100">
                          {formData.imageUrl ? (
                              <img src={formData.imageUrl} alt="Aperçu du produit" className="h-full w-full object-cover" />
                          ) : (
                              <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M24 20.993V24H0v-2.993A1 1 0 001 19.503V7.497A1 1 0 000 6.503V3.503A1 1 0 001 2.503V1.003c0-.552.448-1 1-1h18c.552 0 1 .448 1 1v1.5c0 .552-.448 1-1 1V6.5a1 1 0 00-1-1v12a1 1 0 001 1v2.993c.552 0 1 .448 1 1zM3 4.5h18v2H3V4.5zm18 15H3v2h18v-2z" />
                              </svg>
                          )}
                      </span>
                      <div className="flex flex-col gap-2">
                          <input
                              type="file"
                              id="imageUpload"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="hidden"
                          />
                          <Button type="button" variant="secondary" onClick={() => document.getElementById('imageUpload')?.click()}>
                              Changer
                          </Button>
                          {formData.imageUrl && (
                              <Button type="button" variant="secondary" size="sm" className="!text-red-600 !border-red-200 hover:!bg-red-50" onClick={handleRemoveImage}>
                                  Retirer
                              </Button>
                          )}
                      </div>
                  </div>
              </div>
          </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit">{product ? 'Mettre à jour' : 'Ajouter Produit'}</Button>
        </div>
      </form>
      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Ajouter une nouvelle catégorie">
        <form onSubmit={handleCreateCategory} className="space-y-4">
            <Input 
                label="Nom de la catégorie" 
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)} 
                placeholder="ex: Chaussures d'été" 
                autoFocus
                required
            />
            <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => { setIsCategoryModalOpen(false); setNewCategoryName(''); }}>Annuler</Button>
                <Button type="submit">Créer</Button>
            </div>
        </form>
      </Modal>
    </>
  );
};

const ReplenishmentSuggestionsModal: React.FC<{ onClose: () => void; onLaunchPO: (data: { supplierId: string, items: Omit<PurchaseOrderItem, 'quantityReceived'>[] }) => void; }> = ({ onClose, onLaunchPO }) => {
    const { state } = useAminaShop();
    const { products, suppliers } = state;
    
    const lowStockProducts = useMemo(() => products.filter(p => p.stock <= p.alertThreshold && p.supplierId), [products]);

    const lowStockBySupplier = useMemo(() => {
        return lowStockProducts.reduce((acc, product) => {
            if (!acc[product.supplierId]) {
                acc[product.supplierId] = [];
            }
            acc[product.supplierId].push(product);
            return acc;
        }, {} as Record<string, Product[]>);
    }, [lowStockProducts]);

    const supplierIds = Object.keys(lowStockBySupplier);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(supplierIds[0] || null);
    const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});

    useEffect(() => {
        const initialQuantities: Record<string, number> = {};
        lowStockProducts.forEach(p => {
            const suggestedQty = Math.max(1, (p.alertThreshold * 2) - p.stock);
            initialQuantities[p.id] = suggestedQty;
        });
        setOrderQuantities(initialQuantities);
    }, [lowStockProducts]);

    const handleQuantityChange = (productId: string, quantity: number) => {
        setOrderQuantities(prev => ({ ...prev, [productId]: quantity < 0 ? 0 : quantity }));
    };

    const handleCreatePO = () => {
        if (!selectedSupplierId) return;

        const itemsForPO = lowStockBySupplier[selectedSupplierId]
            .filter(p => (orderQuantities[p.id] || 0) > 0)
            .map(p => ({
                productId: p.id,
                quantity: orderQuantities[p.id],
                purchasePrice: p.purchasePrice,
                // Variants are not handled in this simplified flow for now,
                // assuming replenishment is for the main product SKU.
                size: undefined, 
                color: undefined
            }));

        if (itemsForPO.length === 0) {
            alert("Veuillez sélectionner une quantité pour au moins un produit.");
            return;
        }

        onLaunchPO({
            supplierId: selectedSupplierId,
            items: itemsForPO
        });
    };

    const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.companyName || 'Fournisseur Inconnu';
    
    if (supplierIds.length === 0) {
        return (
            <div>
                <p className="text-center text-gray-600 py-8">Aucun produit en stock bas pour le moment. Tout est en ordre !</p>
                <div className="flex justify-end mt-4">
                    <Button variant="secondary" onClick={onClose}>Fermer</Button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                    {supplierIds.map(id => (
                        <button
                            key={id}
                            onClick={() => setSelectedSupplierId(id)}
                            className={`${selectedSupplierId === id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm`}
                        >
                            {getSupplierName(id)} ({lowStockBySupplier[id].length})
                        </button>
                    ))}
                </nav>
            </div>

            {selectedSupplierId && (
                <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                    {lowStockBySupplier[selectedSupplierId].map(product => (
                        <div key={product.id} className="grid grid-cols-12 gap-4 items-center p-2 bg-gray-50 rounded-md">
                            <div className="col-span-5">
                                <p className="font-medium">{product.name}</p>
                                <p className="text-xs text-gray-500">Actuel: {product.stock} / Seuil: {product.alertThreshold}</p>
                            </div>
                            <div className="col-span-4">
                               <p className="text-sm">{product.purchasePrice.toLocaleString()} FCFA / unité</p>
                            </div>
                            <div className="col-span-3">
                                <Input
                                    label="Qté"
                                    type="number"
                                    min="0"
                                    value={orderQuantities[product.id] || 0}
                                    onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value, 10))}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="flex justify-between items-center pt-4 border-t">
                 <Button variant="secondary" onClick={onClose}>Annuler</Button>
                 <Button onClick={handleCreatePO} disabled={!selectedSupplierId}>Créer Bon de Commande</Button>
            </div>
        </div>
    );
};

export const InventoryPage: React.FC = () => {
  const { state, actions } = useAminaShop();
  const { products, suppliers } = state;
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'lowStock' | 'outOfStock'>('all');
  const [showOutOfStock, setShowOutOfStock] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // State for replenishment flow
  const [isReplenishModalOpen, setIsReplenishModalOpen] = useState(false);
  const [isPOFormOpen, setIsPOFormOpen] = useState(false);
  const [poPreFillData, setPoPreFillData] = useState<{
    supplierId: string;
    items: Omit<PurchaseOrderItem, 'quantityReceived'>[];
  } | null>(null);


  const handleToggleRow = (productId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };
  
  const lowStockProducts = useMemo(() => products.filter(p => p.stock <= p.alertThreshold), [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
        const searchMatch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!searchMatch) return false;
        if (!showOutOfStock && p.stock === 0) return false;

        if (stockFilter !== 'all') {
            switch (stockFilter) {
                case 'inStock': return p.stock > p.alertThreshold;
                case 'lowStock': return p.stock > 0 && p.stock <= p.alertThreshold;
                case 'outOfStock': return p.stock === 0;
                default: return true;
            }
        }
        return true;
    });
  }, [products, searchTerm, stockFilter, showOutOfStock]);

  const { items: sortedProducts, requestSort, sortConfig } = useSortableData(filteredProducts);

  const handleAddProduct = () => { setSelectedProduct(undefined); setIsModalOpen(true); };
  const handleEditProduct = (product: Product) => { setSelectedProduct(product); setIsModalOpen(true); };
  const handleDeleteProduct = (product: Product) => { setProductToDelete(product); setIsConfirmModalOpen(true); };

  const confirmDeleteProduct = () => {
    if (productToDelete) {
      actions.deleteProduct(productToDelete.id);
      setIsConfirmModalOpen(false);
      setProductToDelete(null);
    }
  };

  const handleLaunchPO = (data: { supplierId: string, items: Omit<PurchaseOrderItem, 'quantityReceived'>[] }) => {
    setPoPreFillData(data);
    setIsReplenishModalOpen(false);
    setIsPOFormOpen(true);
  };
  
  const getSupplierName = (supplierId: string) => suppliers.find(s => s.id === supplierId)?.companyName || 'N/A';

  return (
    <div className="space-y-6">
      {lowStockProducts.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center">
                      <div className="p-3 bg-blue-200 text-blue-700 rounded-full mr-4">
                          <ReplenishmentIcon />
                      </div>
                      <div>
                          <h3 className="text-lg font-semibold text-blue-800">Besoin de réapprovisionnement ?</h3>
                          <p className="text-blue-700">{lowStockProducts.length} produit(s) sont en stock bas ou en rupture.</p>
                      </div>
                  </div>
                  <Button onClick={() => setIsReplenishModalOpen(true)} className="w-full sm:w-auto">
                      Lancer le réapprovisionnement
                  </Button>
              </div>
          </Card>
      )}

      <Card>
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6">
          <h2 className="text-2xl font-serif font-black text-gray-800 shrink-0">Gestion des Marchandises</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:flex lg:items-center gap-2 w-full">
              <Select label="" id="stock-filter" value={stockFilter} onChange={(e) => setStockFilter(e.target.value as any)}>
                <option value="all">Tous les stocks</option>
                <option value="inStock">En stock</option>
                <option value="lowStock">Bas stock</option>
                <option value="outOfStock">Rupture de stock</option>
              </Select>
              <Input label="" id="search" placeholder="Rechercher nom, SKU, descr..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <div className="flex items-center p-2 rounded-md bg-gray-50 justify-center">
                <input
                  id="show-out-of-stock"
                  type="checkbox"
                  checked={showOutOfStock}
                  onChange={(e) => setShowOutOfStock(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="show-out-of-stock" className="ml-2 block text-sm text-gray-900 whitespace-nowrap">
                  Afficher ruptures
                </label>
              </div>
              <Button onClick={handleAddProduct} className="w-full md:w-auto whitespace-nowrap"><PlusIcon/>Ajouter un Produit</Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 w-12"></th>
                <SortableHeader sortKey="name" title="Produit" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="sku" title="SKU" sortConfig={sortConfig} requestSort={requestSort} className="hidden sm:table-cell" />
                <SortableHeader sortKey="category" title="Catégorie" sortConfig={sortConfig} requestSort={requestSort} className="hidden md:table-cell" />
                <SortableHeader sortKey="supplierId" title="Fournisseur" sortConfig={sortConfig} requestSort={requestSort} className="hidden lg:table-cell" />
                <SortableHeader sortKey="sellingPrice" title="Prix Vente" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="stock" title="Stock Total" sortConfig={sortConfig} requestSort={requestSort} />
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedProducts.map(product => {
                const sortedVariants = (product.variants && product.variants.length > 0)
                    ? [...product.variants].sort((a, b) => {
                        const sizeCompare = (a.size || '').localeCompare(b.size || '', undefined, { numeric: true });
                        if (sizeCompare !== 0) return sizeCompare;
                        return (a.color || '').localeCompare(b.color || '', undefined, { numeric: true });
                    })
                    : [];

                return (
                <React.Fragment key={product.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-2 py-4 whitespace-nowrap text-center">
                      {product.variants && product.variants.length > 0 && (
                        <button onClick={() => handleToggleRow(product.id)} className="p-1 rounded-full hover:bg-gray-200" aria-label="Afficher les variants">
                          <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${expandedRows.has(product.id) ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                          <img 
                              src={product.imageUrl || 'https://via.placeholder.com/40'} 
                              alt={product.name}
                              className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                          />
                           <span className="ml-4 text-sm font-medium text-gray-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{product.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{product.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">{getSupplierName(product.supplierId)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sellingPrice.toLocaleString()} FCFA</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-col items-start">
                            <div className="flex items-center">
                                <span className="font-semibold text-base text-gray-800">{product.stock}</span>
                                {product.stock <= product.alertThreshold && product.stock > 0 && <AlertIcon className="ml-2 w-5 h-5 text-yellow-500" />}
                                {product.stock === 0 && <AlertIcon className="ml-2 w-5 h-5 text-red-500" />}
                            </div>
                            {product.variants && product.variants.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2 max-w-[200px]">
                                    {sortedVariants.slice(0, 3).map((variant, index) => {
                                        const variantName = [variant.size, variant.color].filter(Boolean).join('/');
                                        if (!variantName) return null;
                                        const stockLevel = variant.quantity;
                                        let pillClass = 'bg-gray-200 text-gray-800';
                                        if (stockLevel <= 3 && stockLevel > 0) pillClass = 'bg-yellow-200 text-yellow-800';
                                        if (stockLevel === 0) pillClass = 'bg-red-200 text-red-800';
                                        
                                        return (
                                            <span key={index} title={`${variantName}: ${stockLevel} en stock`} className={`px-2 py-0.5 text-xs font-medium rounded-full ${pillClass}`}>
                                                {variantName}: {stockLevel}
                                            </span>
                                        );
                                    })}
                                    {product.variants.length > 3 && (
                                        <span title={`${product.variants.length - 3} autre(s) variant(s)`} className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                            ...
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                      <button onClick={() => handleEditProduct(product)} className="text-primary-600 hover:text-primary-900 inline-flex items-center">
                        <PencilIcon className="w-4 h-4 mr-1"/> <span className="hidden sm:inline">Éditer</span>
                      </button>
                      <button onClick={() => handleDeleteProduct(product)} className="text-red-600 hover:text-red-900 inline-flex items-center">
                        <TrashIcon className="w-4 h-4 mr-1"/> <span className="hidden sm:inline">Supprimer</span>
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(product.id) && (
                    <tr className="bg-primary-50">
                      <td colSpan={8} className="p-0">
                          <div className="p-4 mx-4 sm:mx-12 my-2 bg-white rounded-lg shadow-inner">
                              <h4 className="text-sm font-semibold text-gray-800 mb-3">Détail des Stocks par Variant</h4>
                              {product.variants.length > 0 ? (
                                  <div className="overflow-x-auto">
                                      <table className="min-w-full text-sm">
                                          <thead className="bg-gray-100">
                                              <tr>
                                                  <th className="px-4 py-2 text-left font-medium text-gray-600">Taille</th>
                                                  <th className="px-4 py-2 text-left font-medium text-gray-600">Couleur</th>
                                                  <th className="px-4 py-2 text-right font-medium text-gray-600">Quantité</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-200">
                                              {sortedVariants.map((variant, index) => (
                                                  <tr key={index} className="hover:bg-gray-50">
                                                      <td className="px-4 py-2">{variant.size || '-'}</td>
                                                      <td className="px-4 py-2">{variant.color || '-'}</td>
                                                      <td className="px-4 py-2 text-right font-semibold">{variant.quantity}</td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                              ) : (
                                  <p className="text-center text-gray-500 py-4">Ce produit n'a pas de variants définis.</p>
                              )}
                          </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )})}
               {sortedProducts.length === 0 && (
                  <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                          Aucun produit ne correspond à vos filtres.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedProduct ? 'Éditer le Produit' : 'Ajouter un Produit'}>
        <ProductForm product={selectedProduct} onClose={() => setIsModalOpen(false)} />
      </Modal>

      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirmer la suppression">
          {productToDelete && (
              <div>
                  <p className="text-gray-700 mb-4">
                      Êtes-vous sûr de vouloir supprimer le produit "<strong>{productToDelete.name}</strong>" ?
                      <br/>
                      Cette action est irréversible.
                  </p>
                  <div className="flex justify-end gap-2 mt-4">
                      <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>Annuler</Button>
                      <Button variant="danger" onClick={confirmDeleteProduct}>Supprimer</Button>
                  </div>
              </div>
          )}
      </Modal>

      <Modal isOpen={isReplenishModalOpen} onClose={() => setIsReplenishModalOpen(false)} title="Suggéstions de Réapprovisionnement">
        <ReplenishmentSuggestionsModal 
          onClose={() => setIsReplenishModalOpen(false)}
          onLaunchPO={handleLaunchPO}
        />
      </Modal>

      <Modal isOpen={isPOFormOpen} onClose={() => { setIsPOFormOpen(false); setPoPreFillData(null); }} title="Nouveau Bon de Commande">
          {poPreFillData && (
              <PurchaseOrderForm
                  onClose={() => { setIsPOFormOpen(false); setPoPreFillData(null); }}
                  initialSupplierId={poPreFillData.supplierId}
                  initialItems={poPreFillData.items}
              />
          )}
      </Modal>
    </div>
  );
};