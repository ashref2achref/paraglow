'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Image as ImageIcon,
  Tag,
  Percent,
  TrendingUp,
  Package,
  Layers,
  UploadCloud,
  X,
  Eye,
  Star,
  Sparkles,
  DollarSign,
  Activity
} from 'lucide-react'
import { toast } from 'sonner'
import { computeDisplayPrice } from '@/lib/productPricing'

interface Category { id: string; name: string }
interface Brand { id: string; name: string }

export default function ProductForm({ product, id }: { product?: any; id?: string }) {
  const router = useRouter()
  const isEdit = !!id

  // Dropdown lists
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [wasSubmitAttempted, setWasSubmitAttempted] = useState(false)

  // Quick Create Modals
  const [isCatModalOpen, setIsCatModalOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false)
  const [newBrandName, setNewBrandName] = useState('')

  // Drag & drop state
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form State
  const [form, setForm] = useState({
    code: product?.code || '',
    barcode: product?.barcode || '',
    name: product?.name || '',
    nameAr: product?.nameAr || '',
    nameEn: product?.nameEn || '',
    slug: product?.slug || '',
    categoryId: product?.categoryId || '',
    brandId: product?.brandId || '',
    description: product?.description || '',
    descriptionAr: product?.descriptionAr || '',
    descriptionEn: product?.descriptionEn || '',
    purchasePriceHT: product?.purchasePriceHT || 0,
    margin: product?.margin || 0,
    tva: product?.tva || 19,
    sellingPriceTTC: product?.sellingPriceTTC || 0,
    sellingPriceHT: product?.sellingPriceHT || 0,
    publicPrice: product?.publicPrice || '',
    stock: product?.stock || 0,
    stockMin: product?.stockMin || 5,
    loyaltyPoints: product?.loyaltyPoints || 0,
    imageUrl: product?.imageUrl || '',
    images: [] as string[],
    remiseType: product?.remiseType || 'AUCUNE',
    remiseValeur: product?.remiseValeur || '',
    remiseVisible: product?.remiseVisible || false,
    isActive: product?.isActive !== false,
    isNew: product?.isNew || false,
    isOnSale: product?.isOnSale || false,
    isFeatured: product?.isFeatured || false,
    isBestSeller: product?.isBestSeller || false,
  })

  // Load dropdown lists and settings
  useEffect(() => {
    fetchLists()
    if (product) {
      if (product.images) {
        try {
          const trimmed = product.images.trim()
          if (trimmed.startsWith('[')) {
            const parsed = JSON.parse(trimmed)
            setForm((f) => ({ ...f, images: Array.isArray(parsed) ? parsed : [] }))
          }
        } catch { /* ignore */ }
      }
    } else {
      // Set default TVA from settings
      fetch('/api/admin/settings')
        .then((r) => r.json())
        .then((data) => {
          if (data.settings?.defaultTva) {
            setForm((f) => ({ ...f, tva: parseFloat(data.settings.defaultTva) || 19 }))
          }
        })
        .catch(() => {})
    }
  }, [product])

  const fetchLists = async () => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
    fetch('/api/admin/brands')
      .then((r) => r.json())
      .then((d) => setBrands(d.brands || []))
  }

  // Handle value setting + auto calculations
  function set(field: string, value: any) {
    setForm((f) => {
      const updated = { ...f, [field]: value }

      // Auto-calculate prices if purchase price, margin, or tva changes
      if (field === 'purchasePriceHT' || field === 'margin' || field === 'tva') {
        const ht = parseFloat(String(updated.purchasePriceHT)) || 0
        const margin = parseFloat(String(updated.margin)) || 0
        const tva = parseFloat(String(updated.tva)) || 19
        
        const sellingHT = ht * (1 + margin / 100)
        const sellingTTC = sellingHT * (1 + tva / 100)
        
        updated.sellingPriceHT = Math.round(sellingHT * 1000) / 1000
        updated.sellingPriceTTC = Math.round(sellingTTC * 1000) / 1000
      }

      // Auto-calculate margin and sellingPriceHT if sellingPriceTTC changes
      if (field === 'sellingPriceTTC') {
        const ttc = parseFloat(String(value)) || 0
        const tva = parseFloat(String(updated.tva)) || 19
        const ht = parseFloat(String(updated.purchasePriceHT)) || 0
        
        const sellingHT = ttc / (1 + tva / 100)
        updated.sellingPriceHT = Math.round(sellingHT * 1000) / 1000
        
        if (ht > 0) {
          updated.margin = Math.round(((sellingHT / ht) - 1) * 100 * 10) / 10
        }
      }

      // Auto-slug from name
      if (field === 'name' && !isEdit) {
        const baseSlug = (value as string)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/(^-|-$)+/g, '')
        updated.slug = baseSlug
      }

      return updated
    })
  }

  // Create category quick modal
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    try {
      const generatedSlug = newCatName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim(), slug: generatedSlug }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Catégorie "${newCatName}" créée !`)
        setCategories((prev) => [...prev, data.category])
        set('categoryId', data.category.id)
        setNewCatName('')
        setIsCatModalOpen(false)
      } else {
        toast.error(data.error || 'Erreur lors de la création')
      }
    } catch {
      toast.error('Erreur lors de la création')
    }
  }

  // Create brand quick modal
  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBrandName.trim()) return
    try {
      const generatedSlug = newBrandName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')

      const res = await fetch('/api/admin/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBrandName.trim(), slug: generatedSlug }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Marque "${newBrandName}" créée !`)
        setBrands((prev) => [...prev, data.brand])
        set('brandId', data.brand.id)
        setNewBrandName('')
        setIsBrandModalOpen(false)
      } else {
        toast.error(data.error || 'Erreur lors de la création')
      }
    } catch {
      toast.error('Erreur lors de la création')
    }
  }

  // Image upload handling
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0])
    }
  }

  const uploadFile = async (file: File) => {
    const loader = toast.loading('Conversion et envoi de l\'image...')
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body })
      const data = await res.json()
      if (res.ok && data.url) {
        toast.success('Image enregistrée !', { id: loader })
        setForm((f) => {
          const newImages = [...f.images, data.url]
          return {
            ...f,
            images: newImages,
            imageUrl: f.imageUrl || data.url, // Default cover image if empty
          }
        })
      } else {
        toast.error(data.error || 'Erreur d\'upload', { id: loader })
      }
    } catch {
      toast.error('Erreur d\'upload de l\'image', { id: loader })
    }
  }

  const removeImage = (url: string) => {
    setForm((f) => {
      const newImages = f.images.filter((img) => img !== url)
      let nextCover = f.imageUrl
      if (f.imageUrl === url) {
        nextCover = newImages[0] || ''
      }
      return {
        ...f,
        images: newImages,
        imageUrl: nextCover,
      }
    })
  }

  const setAsCoverImage = (url: string) => {
    set('imageUrl', url)
    toast.info('Image principale modifiée.')
  }

  // Handle Form Submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setWasSubmitAttempted(true)
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const url = isEdit ? `/api/admin/products/${id}` : '/api/admin/products'
      const method = isEdit ? 'PUT' : 'POST'
      
      const payload = {
        ...form,
        remiseValeur: form.remiseType === 'AUCUNE' ? null : parseFloat(String(form.remiseValeur)) || 0,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      
      setSuccess(isEdit ? 'Produit mis à jour avec succès !' : 'Produit créé avec succès !')
      toast.success(isEdit ? 'Produit mis à jour !' : 'Produit créé !')
      router.refresh()
      setTimeout(() => router.push('/admin/produits'), 1200)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement')
      toast.error(err.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  // Remise calculations display
  const priceTTC = parseFloat(String(form.sellingPriceTTC)) || 0
  const displayPricePreview = computeDisplayPrice({
    sellingPriceTTC: priceTTC,
    remiseType: form.remiseType,
    remiseValeur: parseFloat(String(form.remiseValeur)) || null,
    remiseVisible: Boolean(form.remiseVisible),
  })
  const finalPriceCalculated = displayPricePreview.finalPrice

  const inputStyle = 'w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e] placeholder-[#9b8f7a]/50'
  const labelStyle = 'block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5 tracking-wider'

  return (
    <div className="max-w-4xl mx-auto pb-12 font-sans text-[#2a1f0e]">
      
      {/* Header bar */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif text-[#153f2b]">
            {isEdit ? 'Modifier le produit' : 'Ajouter un produit'}
          </h1>
          <p className="text-sm text-[#6b5f4f]/80 mt-1">Remplissez les détails, gérez les prix et activez les remises.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/admin/produits')}
          className="px-4 py-2 bg-white border border-[#d5cfc0] text-[#2a1f0e] rounded-lg text-xs font-semibold hover:bg-[#FBF6EC] cursor-pointer"
        >
          ← Annuler
        </button>
      </div>

      {/* Message alerts */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-6 text-xs font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-6 text-xs font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Identification */}
        <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-[0_2px_12px_rgba(21,63,43,0.02)] space-y-4">
          <h2 className="font-serif text-base font-bold text-[#153f2b] border-b border-[#ede8de] pb-2 mb-4 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-[#c9a052]" /> Informations Générales
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Désignation / Nom du produit <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
                className={`${inputStyle} ${wasSubmitAttempted && !form.name ? 'border-rose-400 focus:border-rose-500 bg-rose-50/10' : ''}`}
                placeholder="Ex: Gel Nettoyant Hydratant"
              />
            </div>
            <div>
              <label className={labelStyle}>Slug (Lien URL)</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                className={inputStyle}
                placeholder="Auto-généré à partir du nom"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Désignation (Arabe)</label>
              <input
                type="text"
                value={form.nameAr}
                onChange={(e) => set('nameAr', e.target.value)}
                className={`${inputStyle} text-right`}
                dir="rtl"
                placeholder="اسم المنتج بالعربية..."
              />
            </div>
            <div>
              <label className={labelStyle}>Désignation (Anglais)</label>
              <input
                type="text"
                value={form.nameEn}
                onChange={(e) => set('nameEn', e.target.value)}
                className={inputStyle}
                placeholder="Product name in English..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Référence Code Produit <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => set('code', e.target.value)}
                required
                className={`${inputStyle} ${wasSubmitAttempted && !form.code ? 'border-rose-400 focus:border-rose-500 bg-rose-50/10' : ''}`}
                placeholder="Ex: PG-0239-A"
              />
            </div>
            <div>
              <label className={labelStyle}>Code à barres (EAN)</label>
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => set('barcode', e.target.value)}
                className={inputStyle}
                placeholder="Ex: 6192800000000"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Classification (With quick creation) */}
        <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-[0_2px_12px_rgba(21,63,43,0.02)] space-y-4">
          <h2 className="font-serif text-base font-bold text-[#153f2b] border-b border-[#ede8de] pb-2 mb-4 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#c9a052]" /> Classification
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category selection */}
            <div>
              <label className={labelStyle}>Famille / Catégorie</label>
              <div className="flex gap-2">
                <select
                  value={form.categoryId}
                  onChange={(e) => set('categoryId', e.target.value)}
                  className={`${inputStyle} flex-1`}
                >
                  <option value="">Aucune</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(true)}
                  className="px-3 bg-[#FBF6EC] border border-[#d5cfc0] rounded-lg hover:bg-[#eadfca]/20 text-[#1b3a1e] font-bold text-xs cursor-pointer flex items-center justify-center"
                  title="Créer une catégorie"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Brand selection */}
            <div>
              <label className={labelStyle}>Marque</label>
              <div className="flex gap-2">
                <select
                  value={form.brandId}
                  onChange={(e) => set('brandId', e.target.value)}
                  className={`${inputStyle} flex-1`}
                >
                  <option value="">Aucune</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(true)}
                  className="px-3 bg-[#FBF6EC] border border-[#d5cfc0] rounded-lg hover:bg-[#eadfca]/20 text-[#1b3a1e] font-bold text-xs cursor-pointer flex items-center justify-center"
                  title="Créer une marque"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Pricing & Profits */}
        <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-[0_2px_12px_rgba(21,63,43,0.02)] space-y-4">
          <h2 className="font-serif text-base font-bold text-[#153f2b] border-b border-[#ede8de] pb-2 mb-4 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-[#c9a052]" /> Tarification & Fiscalité
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className={labelStyle}>Prix d'achat HT</label>
              <input
                type="number"
                step="0.001"
                value={form.purchasePriceHT}
                onChange={(e) => set('purchasePriceHT', e.target.value)}
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Marge Bénéficiaire (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.margin}
                onChange={(e) => set('margin', e.target.value)}
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>TVA (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.tva}
                onChange={(e) => set('tva', e.target.value)}
                className={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className={labelStyle}>Prix de vente TTC <span className="text-rose-500">*</span></label>
              <input
                type="number"
                step="0.001"
                value={form.sellingPriceTTC}
                onChange={(e) => set('sellingPriceTTC', e.target.value)}
                required
                className={`${inputStyle} ${wasSubmitAttempted && (!form.sellingPriceTTC || Number(form.sellingPriceTTC) <= 0) ? 'border-rose-400 focus:border-rose-500 bg-rose-50/10' : ''}`}
              />
            </div>
            <div>
              <label className={labelStyle}>Prix de vente HT</label>
              <input
                type="number"
                step="0.001"
                value={form.sellingPriceHT}
                onChange={(e) => set('sellingPriceHT', e.target.value)}
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Prix Public HT (Optionnel)</label>
              <input
                type="number"
                step="0.001"
                value={form.publicPrice}
                onChange={(e) => set('publicPrice', e.target.value)}
                className={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Discount System */}
        <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-[0_2px_12px_rgba(21,63,43,0.02)] space-y-4">
          <h2 className="font-serif text-base font-bold text-[#153f2b] border-b border-[#ede8de] pb-2 mb-4 flex items-center gap-1.5">
            <Percent className="w-4 h-4 text-[#c9a052]" /> Système de Remise / Promotion
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelStyle}>Type de remise</label>
              <select
                value={form.remiseType}
                onChange={(e) => set('remiseType', e.target.value)}
                className={inputStyle}
              >
                <option value="AUCUNE">Aucune remise</option>
                <option value="POURCENTAGE">Pourcentage (ex: -20%)</option>
                <option value="PRIX_FIXE">Nouveau prix réduit fixe</option>
              </select>
            </div>

            <div>
              <label className={labelStyle}>Valeur de la remise</label>
              <input
                type="number"
                step="0.001"
                disabled={form.remiseType === 'AUCUNE'}
                value={form.remiseValeur}
                onChange={(e) => set('remiseValeur', e.target.value)}
                className={`${inputStyle} disabled:opacity-50`}
                placeholder={
                  form.remiseType === 'POURCENTAGE' ? 'Ex: 20 (% de réduction)' : 
                  form.remiseType === 'PRIX_FIXE' ? 'Ex: 44.500 (Nouveau prix TTC)' : '-'
                }
              />
            </div>

            <div className="flex items-center md:pt-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#2a1f0e] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.remiseVisible}
                  disabled={form.remiseType === 'AUCUNE'}
                  onChange={(e) => set('remiseVisible', e.target.checked)}
                  className="w-4 h-4 accent-[#1b3a1e] cursor-pointer disabled:opacity-50"
                />
                Afficher le prix barré sur le site public
              </label>
            </div>
          </div>

          {form.remiseType !== 'AUCUNE' && (
            <div className="bg-[#FBF6EC] border border-[#c9a052]/30 rounded-xl p-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#6b5f4f] font-medium">Prix d'origine (TTC) :</span>
                <span className="font-mono text-[#2a1f0e]">{priceTTC.toFixed(3)} TND</span>
              </div>
              <div className="flex justify-between border-t border-[#eadfca] pt-1.5 font-bold text-sm">
                <span className="text-[#153f2b]">Prix final appliqué (TTC) :</span>
                <span className="text-[#c9a052] font-mono">
                  {finalPriceCalculated.toFixed(3)} TND
                </span>
              </div>
              <p className="text-[10px] text-[#9b8f7a] italic mt-1 leading-normal">
                {form.remiseVisible 
                  ? 'Sur le site public, le client verra le prix d\'origine barré en gris, un badge de promotion et le prix final en doré.' 
                  : 'Sur le site public, seul le prix final en doré sera affiché, sans mention de promotion.'}
              </p>
            </div>
          )}
        </div>

        {/* Section 5: Inventory & Loyalty */}
        <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-[0_2px_12px_rgba(21,63,43,0.02)] space-y-4">
          <h2 className="font-serif text-base font-bold text-[#153f2b] border-b border-[#ede8de] pb-2 mb-4 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#c9a052]" /> Stock & Fidélité
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelStyle}>Quantité en stock</label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => set('stock', parseInt(e.target.value) || 0)}
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Seuil stock d'alerte</label>
              <input
                type="number"
                value={form.stockMin}
                onChange={(e) => set('stockMin', parseInt(e.target.value) || 0)}
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Points de fidélité accordés</label>
              <input
                type="number"
                value={form.loyaltyPoints}
                onChange={(e) => set('loyaltyPoints', parseInt(e.target.value) || 0)}
                className={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Section 6: Localized descriptions */}
        <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-[0_2px_12px_rgba(21,63,43,0.02)] space-y-4">
          <h2 className="font-serif text-base font-bold text-[#153f2b] border-b border-[#ede8de] pb-2 mb-4 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#c9a052]" /> Descriptions Traduits (i18n)
          </h2>

          <div className="space-y-4">
            <div>
              <label className={labelStyle}>Description (Français) <span className="text-rose-500">*</span></label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                required
                className={`${inputStyle} resize-none font-normal ${wasSubmitAttempted && !form.description ? 'border-rose-400 focus:border-rose-500 bg-rose-50/10' : ''}`}
                placeholder="Rédigez la description en français..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>Description (Arabe - RTL)</label>
                <textarea
                  rows={3}
                  value={form.descriptionAr}
                  onChange={(e) => set('descriptionAr', e.target.value)}
                  className={`${inputStyle} resize-none font-normal text-right`}
                  dir="rtl"
                  placeholder="الوصف باللغة العربية..."
                />
              </div>
              <div>
                <label className={labelStyle}>Description (Anglais)</label>
                <textarea
                  rows={3}
                  value={form.descriptionEn}
                  onChange={(e) => set('descriptionEn', e.target.value)}
                  className={`${inputStyle} resize-none font-normal`}
                  placeholder="Description in English..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 7: Drag & Drop Images Upload */}
        <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-[0_2px_12px_rgba(21,63,43,0.02)] space-y-4">
          <h2 className="font-serif text-base font-bold text-[#153f2b] border-b border-[#ede8de] pb-2 mb-4 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-[#c9a052]" /> Galerie Photo
          </h2>

          {/* Drag area */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
              dragActive 
                ? 'border-[#1b3a1e] bg-[#FBF6EC]' 
                : 'border-[#d5cfc0] hover:border-[#c9a052]/50 hover:bg-[#FBF6EC]/10'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <UploadCloud className="w-10 h-10 text-[#c9a052] mb-3 opacity-80" />
            <p className="text-xs font-semibold text-[#153f2b] mb-1">
              Glissez-déposez une image ici ou cliquez pour parcourir
            </p>
            <p className="text-[10px] text-[#9b8f7a]">
              Formats supportés : JPG, PNG, WebP. Optimisation automatique vers WebP.
            </p>
          </div>

          {/* Uploaded thumbnails */}
          {form.images.length > 0 && (
            <div className="pt-2">
              <label className={labelStyle}>Sélectionnez l'image principale (couverture) :</label>
              <div className="flex flex-wrap gap-3">
                {form.images.map((url, index) => {
                  const isCover = form.imageUrl === url
                  return (
                    <div
                      key={index}
                      className={`relative w-24 h-24 border rounded-xl overflow-hidden bg-white p-1 flex items-center justify-center shadow-3xs group ${
                        isCover ? 'border-2 border-[#1b3a1e] ring-2 ring-[#1b3a1e]/10' : 'border-[#eadfca]'
                      }`}
                    >
                      <img src={url} alt="" className="object-contain w-full h-full" />
                      
                      {/* Delete icon */}
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="absolute top-1 right-1 bg-rose-600/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-rose-600 cursor-pointer"
                        title="Supprimer l'image"
                      >
                        <X className="w-3 h-3" />
                      </button>

                      {/* Cover Selection Overlay */}
                      {!isCover && (
                        <button
                          type="button"
                          onClick={() => setAsCoverImage(url)}
                          className="absolute inset-x-0 bottom-0 bg-[#1b3a1e]/90 text-white py-1 text-[9px] font-bold text-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          Définir comme principale
                        </button>
                      )}
                      
                      {isCover && (
                        <div className="absolute inset-x-0 bottom-0 bg-[#1b3a1e] text-white py-0.5 text-[9px] font-bold text-center">
                          Principale
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Section 8: Activation & Promotion Flags */}
        <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-[0_2px_12px_rgba(21,63,43,0.02)] space-y-4">
          <h2 className="font-serif text-base font-bold text-[#153f2b] border-b border-[#ede8de] pb-2 mb-4 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#c9a052]" /> Options de publication
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
            {/* Actif */}
            <div className="flex items-center justify-between p-3 border border-[#ede8de] rounded-xl hover:bg-[#FBF6EC]/20 transition-colors">
              <span className="flex items-center gap-2"><Eye className="w-4 h-4 text-[#6b5f4f]" /> Actif (visible sur le site)</span>
              <button
                type="button"
                onClick={() => set('isActive', !form.isActive)}
                style={{
                  width: '40px', height: '20px', borderRadius: '10px', border: 'none',
                  background: form.isActive ? '#1b3a1e' : '#d5cfc0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: '2px', left: form.isActive ? '22px' : '2px',
                  width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', display: 'block',
                }} />
              </button>
            </div>

            {/* En vedette */}
            <div className="flex items-center justify-between p-3 border border-[#ede8de] rounded-xl hover:bg-[#FBF6EC]/20 transition-colors">
              <span className="flex items-center gap-2"><Star className="w-4 h-4 text-[#6b5f4f]" /> Coup de cœur (Featured)</span>
              <button
                type="button"
                onClick={() => set('isFeatured', !form.isFeatured)}
                style={{
                  width: '40px', height: '20px', borderRadius: '10px', border: 'none',
                  background: form.isFeatured ? '#1b3a1e' : '#d5cfc0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: '2px', left: form.isFeatured ? '22px' : '2px',
                  width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', display: 'block',
                }} />
              </button>
            </div>

            {/* Best Seller */}
            <div className="flex items-center justify-between p-3 border border-[#ede8de] rounded-xl hover:bg-[#FBF6EC]/20 transition-colors">
              <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#6b5f4f]" /> Meilleure vente (Best Seller)</span>
              <button
                type="button"
                onClick={() => set('isBestSeller', !form.isBestSeller)}
                style={{
                  width: '40px', height: '20px', borderRadius: '10px', border: 'none',
                  background: form.isBestSeller ? '#1b3a1e' : '#d5cfc0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: '2px', left: form.isBestSeller ? '22px' : '2px',
                  width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', display: 'block',
                }} />
              </button>
            </div>

            {/* Nouveau */}
            <div className="flex items-center justify-between p-3 border border-[#ede8de] rounded-xl hover:bg-[#FBF6EC]/20 transition-colors">
              <span className="flex items-center gap-2"><Tag className="w-4 h-4 text-[#6b5f4f]" /> Nouveau produit (New)</span>
              <button
                type="button"
                onClick={() => set('isNew', !form.isNew)}
                style={{
                  width: '40px', height: '20px', borderRadius: '10px', border: 'none',
                  background: form.isNew ? '#1b3a1e' : '#d5cfc0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: '2px', left: form.isNew ? '22px' : '2px',
                  width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', display: 'block',
                }} />
              </button>
            </div>
          </div>
        </div>

        {/* Submit Actions - Sticky bottom action bar */}
        <div className="sticky bottom-0 z-50 bg-[#FBF6EC] border-t border-[#eadfca]/60 py-4 px-6 -mx-6 -mb-6 mt-8 flex justify-end gap-3 shadow-[0_-4px_12px_rgba(21,63,43,0.04)]">
          <button
            type="button"
            onClick={() => router.push('/admin/produits')}
            className="px-6 py-2.5 bg-white border border-[#eadfca] text-[#2a1f0e] rounded-xl text-xs font-semibold hover:bg-[#FBF6EC] cursor-pointer transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-2.5 bg-[#1b3a1e] disabled:bg-[#1b3a1e]/40 hover:bg-[#c9a052] text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-200 active:scale-98 cursor-pointer border-none"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer le produit'}
          </button>
        </div>
      </form>

      {/* 9. Category Quick Create Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[999999] px-4">
          <div className="bg-white border border-[#eadfca] rounded-2xl p-6 shadow-2xl max-w-sm w-full relative">
            <button onClick={() => setIsCatModalOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-[#FBF6EC] rounded-lg transition-colors cursor-pointer text-[#6b5f4f]">
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="font-serif text-lg font-bold text-[#153f2b] mb-4">Créer une catégorie</h3>
            
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className={labelStyle}>Nom de la catégorie *</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                  className={inputStyle}
                  placeholder="Ex: Soin du Corps"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg text-xs font-semibold hover:bg-[#FBF6EC] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Brand Quick Create Modal */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[999999] px-4">
          <div className="bg-white border border-[#eadfca] rounded-2xl p-6 shadow-2xl max-w-sm w-full relative">
            <button onClick={() => setIsBrandModalOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-[#FBF6EC] rounded-lg transition-colors cursor-pointer text-[#6b5f4f]">
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="font-serif text-lg font-bold text-[#153f2b] mb-4">Créer une marque</h3>
            
            <form onSubmit={handleCreateBrand} className="space-y-4">
              <div>
                <label className={labelStyle}>Nom de la marque *</label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  required
                  className={inputStyle}
                  placeholder="Ex: Bioderma"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(false)}
                  className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg text-xs font-semibold hover:bg-[#FBF6EC] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
