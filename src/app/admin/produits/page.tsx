'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ActionMenuPortal from '@/components/admin/ActionMenuPortal'
import ClearHistoryButton from '@/components/admin/ClearHistoryButton'
import {
  Search,
  Plus,
  Trash2,
  Clock,
  Settings,
  MoreVertical,
  Edit,
  Eye,
  EyeOff,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertTriangle,
  FolderInput,
  Package
} from 'lucide-react'
import { toast } from 'sonner'
import ProductImage from '@/components/ui/ProductImage'
import Modal from '@/components/ui/Modal'
import { exportToExcel } from '@/lib/excelExport'
import { computeDisplayPrice } from '@/lib/productPricing'

// Portalled Dropdown component for Actions
function ActionMenu({
  triggerRef,
  onClose,
  onView,
  onEdit,
  onDelete,
  isActive,
  onToggleActive
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  isActive: boolean
  onToggleActive: () => void
}) {
  return (
    <ActionMenuPortal triggerRef={triggerRef} onClose={onClose} className="bg-white border border-[#eadfca] rounded-xl shadow-lg py-1.5 min-w-[150px] text-xs font-sans text-[#2a1f0e]">
      <button
        onClick={() => { onView(); onClose() }}
        className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors flex items-center gap-2"
      >
        <Eye className="w-3.5 h-3.5 text-[#c9a052]" /> Voir détails
      </button>
      <button
        onClick={() => { onEdit(); onClose() }}
        className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors flex items-center gap-2"
      >
        <Edit className="w-3.5 h-3.5 text-[#c9a052]" /> Modifier
      </button>
      <button
        onClick={() => { onToggleActive(); onClose() }}
        className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors flex items-center gap-2"
      >
        {isActive ? (
          <>
            <EyeOff className="w-3.5 h-3.5 text-[#c9a052]" /> Rendre inactif
          </>
        ) : (
          <>
            <Check className="w-3.5 h-3.5 text-[#153f2b]" /> Rendre actif
          </>
        )}
      </button>
      <div className="border-t border-[#eadfca] my-1" />
      <button
        onClick={() => { onDelete(); onClose() }}
        className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-600 transition-colors flex items-center gap-2"
      >
        <Trash2 className="w-3.5 h-3.5" /> Corbeille
      </button>
    </ActionMenuPortal>
  )
}

export default function ProduitsPage() {
  const router = useRouter()

  // State Lists
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Trash Count
  const [trashCount, setTrashCount] = useState(0)

  // Filters & State
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [stock, setStock] = useState('')
  const [status, setStatus] = useState('')
  const [image, setImage] = useState('')
  const [discount, setDiscount] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [loading, setLoading] = useState(true)

  // Modals & Panels
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [productToDeleteName, setProductToDeleteName] = useState<string>('')
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false)

  
  // Specific menu triggers
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null)

  // Bulk assign category
  const [isBulkCategoryOpen, setIsBulkCategoryOpen] = useState(false)
  const [bulkCategoryId, setBulkCategoryId] = useState('')

  // Settings local state
  const [settings, setSettings] = useState({
    currency: 'TND',
    priceFormat: '3',
    lowStockThreshold: '10',
    defaultTva: '19',
    duplicateBehavior: 'update',
    productsPerPage: '20',
  })

  // Logs local state
  const [logs, setLogs] = useState<any[]>([])
  const [logPage, setLogPage] = useState(1)
  const [logTotalPages, setLogTotalPages] = useState(1)

  useEffect(() => {
    fetch('/api/admin/categories?filterEmpty=true').then((r) => r.json()).then((d) => setCategories(d.categories || []))
    fetch('/api/admin/brands?filterEmpty=true').then((r) => r.json()).then((d) => setBrands(d.brands || []))
    fetch('/api/admin/products/trash').then((r) => r.json()).then((d) => setTrashCount(d.products?.length || 0))
    loadSettings()
  }, [])

  // Reload products on filter changes
  useEffect(() => {
    loadProducts()
  }, [search, category, brand, stock, status, image, discount, sort, page])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: settings.productsPerPage || '20',
        search,
        category,
        brand,
        stock,
        status,
        image,
        discount,
        sort,
      })
      const res = await fetch(`/api/admin/products?${q.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setProducts(data.products || [])
        setTotalPages(data.totalPages || 1)
        setTotalProducts(data.total || 0)
      }
    } catch {
      toast.error('Erreur lors du chargement des produits')
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (res.ok && data.settings) {
        setSettings(data.settings)
      }
    } catch { /* ignore */ }
  }

  const getPaginationRange = () => {
    const range = []
    const siblingCount = 1
    const totalNumbers = siblingCount * 2 + 5

    if (totalPages <= totalNumbers - 2) {
      for (let i = 1; i <= totalPages; i++) {
        range.push(i)
      }
      return range
    }

    const leftSiblingIndex = Math.max(page - siblingCount, 1)
    const rightSiblingIndex = Math.min(page + siblingCount, totalPages)

    const shouldShowLeftDots = leftSiblingIndex > 2
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount
      const leftRange = []
      for (let i = 1; i <= leftItemCount; i++) {
        leftRange.push(i)
      }
      return [...leftRange, '...', totalPages]
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount
      const rightRange = []
      for (let i = totalPages - rightItemCount + 1; i <= totalPages; i++) {
        rightRange.push(i)
      }
      return [1, '...', ...rightRange]
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = []
      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        middleRange.push(i)
      }
      return [1, '...', ...middleRange, '...', totalPages]
    }
    
    return []
  }

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      if (res.ok) {
        toast.success('Paramètres enregistrés !')
        setIsSettingsOpen(false)
        loadProducts()
      } else {
        toast.error('Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  const loadLogs = async (p = 1) => {
    try {
      const res = await fetch(`/api/admin/logs?page=${p}&limit=20`)
      const data = await res.json()
      if (res.ok) {
        setLogs(data.logs || [])
        setLogPage(data.page || 1)
        setLogTotalPages(data.totalPages || 1)
      }
    } catch { /* ignore */ }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      if (res.ok) {
        toast.success(currentStatus ? 'Produit rendu inactif' : 'Produit rendu actif')
        setProducts((prods) =>
          prods.map((p) => (p.id === id ? { ...p, isActive: !currentStatus } : p))
        )
      }
    } catch {
      toast.error('Erreur lors de la modification')
    }
  }

  const handleSoftDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Produit envoyé dans la corbeille')
        setProducts((prods) => prods.filter((p) => p.id !== id))
        setTrashCount((c) => c + 1)
        setSelectedIds((ids) => ids.filter((item) => item !== id))
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  // Bulk actions triggers
  const handleBulkAction = async (action: 'trash' | 'activate' | 'deactivate' | 'category', catId?: string) => {
    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action, categoryId: catId }),
      })
      if (res.ok) {
        toast.success('Opération groupée effectuée !')
        setSelectedIds([])
        setIsBulkCategoryOpen(false)
        loadProducts()
        // Reload trash count
        fetch('/api/admin/products/trash').then((r) => r.json()).then((d) => setTrashCount(d.products?.length || 0))
      } else {
        toast.error('Erreur lors de l\'action groupée')
      }
    } catch {
      toast.error('Erreur lors de l\'action groupée')
    }
  }

  // Export Catalogue
  const exportCatalogue = async (format: 'xlsx' | 'csv' | 'pdf') => {
    try {
      // Fetch ALL filtered records (ignore pagination limit)
      const q = new URLSearchParams({
        page: '1',
        limit: '99999',
        search,
        category,
        brand,
        stock,
        status,
        image,
        discount,
        sort,
      })
      const res = await fetch(`/api/admin/products?${q.toString()}`)
      const data = await res.json()
      if (!res.ok || !data.products) {
        toast.error('Erreur lors de la récupération des données d\'export')
        return
      }

      const exportRows = data.products.map((p: any) => ({
        Code: p.code,
        Barcode: p.barcode || '',
        Nom: p.name,
        Catégorie: p.category?.name || '',
        Marque: p.brand?.name || '',
        Stock: p.stock,
        'Prix Achat HT': p.purchasePriceHT,
        'Marge %': p.margin,
        'TVA %': p.tva,
        'Prix Vente TTC': p.sellingPriceTTC,
        'Remise Type': p.remiseType,
        'Remise Valeur': p.remiseValeur || '',
        'Remise Visible': p.remiseVisible ? 'OUI' : 'NON',
        Statut: p.isActive ? 'ACTIF' : 'INACTIF',
      }))

      if (format === 'xlsx') {
        await exportToExcel({
          filename: `paraglow-catalogue-${Date.now()}`,
          sheets: [
            {
              name: 'Catalogue',
              columns: [
                { header: 'Code', key: 'Code' },
                { header: 'Barcode', key: 'Barcode' },
                { header: 'Désignation', key: 'Nom' },
                { header: 'Catégorie', key: 'Catégorie' },
                { header: 'Marque', key: 'Marque' },
                { header: 'Stock', key: 'Stock' },
                { header: 'Prix Achat HT', key: 'Prix Achat HT', numFmt: '#,##0.000" TND"' },
                { header: 'Marge %', key: 'Marge %', numFmt: '0.00"%"' },
                { header: 'TVA %', key: 'TVA %', numFmt: '0"%"' },
                { header: 'Prix Vente TTC', key: 'Prix Vente TTC', numFmt: '#,##0.000" TND"' },
                { header: 'Type Remise', key: 'Remise Type' },
                { header: 'Valeur Remise', key: 'Remise Valeur' },
                { header: 'Visible Site', key: 'Remise Visible' },
                { header: 'Statut', key: 'Statut' },
              ],
              rows: exportRows,
            },
          ],
        })
        toast.success('Fichier Excel téléchargé !')
      } else if (format === 'csv') {
        const headers = Object.keys(exportRows[0])
        const csvContent = [
          headers.join(','),
          ...exportRows.map((row: any) =>
            headers.map((h) => `"${String(row[h]).replace(/"/g, '""')}"`).join(',')
          ),
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `paraglow-catalogue-${Date.now()}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Fichier CSV téléchargé !')
      } else if (format === 'pdf') {
        // PDF Printable popup window
        const win = window.open('', '_blank')
        if (win) {
          const html = `
            <html>
              <head>
                <title>Catalogue Produits ParaGlow</title>
                <style>
                  body { font-family: Inter, sans-serif; padding: 30px; background: #fff; color: #153f2b; }
                  h1 { font-family: Georgia, serif; text-align: center; margin-bottom: 20px; }
                  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
                  th, td { border: 1px solid #ede8de; padding: 10px; text-align: left; }
                  th { background: #FBF6EC; font-weight: bold; }
                  .price { text-align: right; }
                  .badge { padding: 3px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; }
                  .badge-active { background: #e6f4ea; color: #137333; }
                  .badge-inactive { background: #fce8e6; color: #c5221f; }
                  .print-btn { display: block; margin: 0 auto 20px; padding: 8px 16px; background: #153f2b; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
                  @media print { .print-btn { display: none; } }
                </style>
              </head>
              <body>
                <button class="print-btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
                <h1>ParaGlow — Catalogue Produits</h1>
                <p style="text-align: center; font-size: 12px; color: #6b5f4f;">Généré le ${new Date().toLocaleDateString('fr-FR')} (${exportRows.length} produits)</p>
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Désignation</th>
                      <th>Catégorie</th>
                      <th>Marque</th>
                      <th>Stock</th>
                      <th>Prix TTC</th>
                      <th>Remise</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${exportRows
                      .map(
                        (row: any) => `
                      <tr>
                        <td><strong>${row.Code}</strong></td>
                        <td>${row.Nom}</td>
                        <td>${row.Catégorie}</td>
                        <td>${row.Marque}</td>
                        <td>${row.Stock}</td>
                        <td class="price">${row['Prix Vente TTC'].toFixed(3)} TND</td>
                        <td>${row['Remise Valeur'] ? `${row['Remise Valeur']}${row['Remise Type'] === 'POURCENTAGE' ? '%' : ' TND'}` : 'Aucune'}</td>
                        <td><span class="badge ${
                          row.Statut === 'ACTIF' ? 'badge-active' : 'badge-inactive'
                        }">${row.Statut}</span></td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </body>
            </html>
          `
          win.document.write(html)
          win.document.close()
        }
      }
      setIsExportOpen(false)
    } catch {
      toast.error('Erreur lors de l\'exportation')
    }
  }

  // Checkbox selection utils
  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(products.map((p) => p.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const formatPrice = (price: number) => {
    return price.toFixed(parseInt(settings.priceFormat || '3')).replace('.', ',') + ' ' + settings.currency
  }

  return (
    <div className="space-y-6 font-sans text-[#2a1f0e] max-w-full overflow-hidden">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-[#153f2b] flex items-center gap-2">
            Produits
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#1b3a1e]/10 text-[#1b3a1e]">
              {totalProducts} au total
            </span>
          </h1>
          <p className="text-sm text-[#6b5f4f]/80 mt-1">Gérez vos articles, imports, remises et synchronisation.</p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/produits/nouveau"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 active:scale-98"
          >
            <Plus className="w-4 h-4" /> Nouveau produit
          </Link>
          <Link
            href="/admin/import"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#eadfca] text-[#2a1f0e] hover:bg-[#FBF6EC] text-sm font-medium rounded-lg transition-all"
          >
            <FolderInput className="w-4 h-4 text-[#c9a052]" /> Importer
          </Link>
          
          {/* Export dropdown trigger */}
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#eadfca] text-[#2a1f0e] hover:bg-[#FBF6EC] text-sm font-medium rounded-lg transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#c9a052]" /> Exporter
            </button>
            {isExportOpen && (
              <div className="absolute right-0 mt-2 z-50 bg-white border border-[#eadfca] rounded-xl shadow-lg py-1.5 min-w-[140px] text-xs font-sans">
                <button onClick={() => exportCatalogue('xlsx')} className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors">Excel (.xlsx)</button>
                <button onClick={() => exportCatalogue('csv')} className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors">CSV (.csv)</button>
                <button onClick={() => exportCatalogue('pdf')} className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors">PDF / Imprimer</button>
              </div>
            )}
          </div>

          <button
            onClick={() => { setIsHistoryOpen(true); loadLogs() }}
            className="inline-flex items-center justify-center p-2 bg-white border border-[#eadfca] text-[#2a1f0e] hover:bg-[#FBF6EC] rounded-lg transition-all cursor-pointer"
            title="Historique"
          >
            <Clock className="w-4 h-4 text-[#6b5f4f]" />
          </button>

          <Link
            href="/admin/produits/corbeille"
            className="inline-flex items-center justify-center p-2 bg-white border border-[#eadfca] text-[#2a1f0e] hover:bg-rose-50 rounded-lg transition-all relative cursor-pointer"
            title="Corbeille"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            {trashCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {trashCount}
              </span>
            )}
          </Link>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center justify-center p-2 bg-white border border-[#eadfca] text-[#2a1f0e] hover:bg-[#FBF6EC] rounded-lg transition-all cursor-pointer"
            title="Paramètres"
          >
            <Settings className="w-4 h-4 text-[#6b5f4f]" />
          </button>
        </div>
      </div>

      {/* 2. Filters & Tools */}
      <div className="bg-white border border-[#eadfca] rounded-2xl p-4 shadow-[0_2px_12px_rgba(21,63,43,0.02)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9b8f7a]" />
            <input
              type="text"
              placeholder="Rechercher par nom, code, code-barres ou marque..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-4 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-sm text-[#2a1f0e]"
            />
          </div>

          {/* Sorter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#6b5f4f] uppercase whitespace-nowrap">Trier par :</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none text-xs font-medium"
            >
              <option value="newest">Plus récents</option>
              <option value="nameAsc">Nom A → Z</option>
              <option value="nameDesc">Nom Z → A</option>
              <option value="priceAsc">Prix croissant</option>
              <option value="priceDesc">Prix décroissant</option>
              <option value="stockAsc">Stock bas → haut</option>
              <option value="stockDesc">Stock haut → bas</option>
            </select>
          </div>
        </div>

        {/* Advanced filters */}
        <div className="flex flex-wrap gap-2.5 pt-3 border-t border-[#eadfca]/60">
          <div className="w-full sm:w-[140px]">
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1) }}
              className="w-full px-2.5 py-1.5 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] text-xs focus:outline-none"
            >
              <option value="">Famille (Toutes)</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-[140px]">
            <select
              value={brand}
              onChange={(e) => { setBrand(e.target.value); setPage(1) }}
              className="w-full px-2.5 py-1.5 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] text-xs focus:outline-none"
            >
              <option value="">Marque (Toutes)</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-[140px]">
            <select
              value={stock}
              onChange={(e) => { setStock(e.target.value); setPage(1) }}
              className="w-full px-2.5 py-1.5 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] text-xs focus:outline-none"
            >
              <option value="">Stock (Tous)</option>
              <option value="in">En stock (&gt; {settings.lowStockThreshold})</option>
              <option value="low">Stock faible (1 - {settings.lowStockThreshold})</option>
              <option value="out">Rupture de stock (0)</option>
            </select>
          </div>
          <div className="w-full sm:w-[140px]">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              className="w-full px-2.5 py-1.5 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] text-xs focus:outline-none"
            >
              <option value="">Statut (Tous)</option>
              <option value="active">Visible sur le site (Actif)</option>
              <option value="inactive">Masqué (Inactif)</option>
            </select>
          </div>
          <div className="w-full sm:w-[140px]">
            <select
              value={image}
              onChange={(e) => { setImage(e.target.value); setPage(1) }}
              className="w-full px-2.5 py-1.5 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] text-xs focus:outline-none"
            >
              <option value="">Image (Tous)</option>
              <option value="with">Avec photo</option>
              <option value="without">Sans photo</option>
            </select>
          </div>
          <div className="w-full sm:w-[140px]">
            <select
              value={discount}
              onChange={(e) => { setDiscount(e.target.value); setPage(1) }}
              className="w-full px-2.5 py-1.5 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] text-xs focus:outline-none"
            >
              <option value="">Remise (Toutes)</option>
              <option value="with">Avec promotion</option>
              <option value="without">Sans promotion</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Products Table */}
      <div className="bg-white border border-[#eadfca] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(21,63,43,0.02)]">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#c9a052] border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-[#6b5f4f]">Chargement des articles...</span>
          </div>
        ) : products.length === 0 ? (
          /* Empty state */
          <div className="py-20 px-6 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-[#FBF6EC] border-2 border-dashed border-[#c9a052]/40 flex items-center justify-center text-[#c9a052] mb-6">
              <Package size={36} className="opacity-70" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#153f2b] mb-1">Aucun produit disponible</h3>
            <p className="text-sm text-[#6b5f4f]/80 max-w-sm mb-6">
              Votre catalogue produits est vide. Importez vos articles avec Excel/CSV ou ajoutez un produit manuellement.
            </p>
            <div className="flex gap-2">
              <Link href="/admin/produits/nouveau" className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white text-xs font-semibold rounded-lg shadow-sm transition-all">
                Ajouter manuellement
              </Link>
              <Link href="/admin/import" className="px-4 py-2 bg-[#FBF6EC] border border-[#eadfca] text-[#1b3a1e] text-xs font-semibold rounded-lg transition-all hover:bg-[#eadfca]/20">
                Lancer l'import
              </Link>
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-[#FBF6EC] border-b border-[#eadfca] text-xs font-semibold uppercase tracking-wider text-[#6b5f4f]">
                  <th className="py-4 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === products.length && products.length > 0}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-3 w-16">Photo</th>
                  <th className="py-4 px-4">Désignation / Code</th>
                  <th className="py-4 px-4">Famille</th>
                  <th className="py-4 px-4">Marque</th>
                  <th className="py-4 px-4 text-center">Stock</th>
                  <th className="py-4 px-4 text-right">Prix TTC</th>
                  <th className="py-4 px-4 text-center">Remise</th>
                  <th className="py-4 px-4 text-center">Statut</th>
                  <th className="py-4 px-4 w-10 text-center sticky right-0 bg-[#FBF6EC] border-l border-[#eadfca]/60 shadow-[-4px_0_8px_rgba(21,63,43,0.03)] z-10">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ede8de] text-xs">
                {products.map((prod) => {
                  const hasImage = prod.imageUrl || (JSON.parse(prod.images || '[]').length > 0)
                  const coverImage = prod.imageUrl || JSON.parse(prod.images || '[]')[0] || '/images/paraglow-favicon-512.png'

                  // Threshold badge
                  const isLow = prod.stock > 0 && prod.stock <= parseInt(settings.lowStockThreshold || '10')
                  const isOut = prod.stock === 0
                  const stockBadgeClass = isOut
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : isLow
                    ? 'bg-orange-50 text-orange-700 border border-orange-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'

                  const displayPrice = computeDisplayPrice(prod)
                  const hasRemise = displayPrice.hasDiscount

                  return (
                    <tr key={prod.id} className="hover:bg-[#FBF6EC]/20 transition-colors group">
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(prod.id)}
                          onChange={() => toggleSelect(prod.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="relative w-11 h-11 border border-[#eadfca] rounded-lg overflow-hidden bg-white flex items-center justify-center shadow-3xs group">
                          <ProductImage
                            src={prod.images}
                            alt={prod.name}
                            fill
                            className="object-contain p-0.5 group-hover:scale-105 transition-transform"
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="font-semibold text-sm text-[#153f2b] line-clamp-1">{prod.name}</div>
                        <div className="text-[10px] text-[#9b8f7a] font-mono mt-0.5">{prod.code}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {prod.category ? (
                          <span
                            className="inline-flex px-2 py-0.5 bg-[#FBF6EC] border border-[#eadfca] text-[#2a1f0e] rounded-md text-[10px] font-medium max-w-[110px] truncate"
                            title={prod.category.name}
                          >
                            {prod.category.name}
                          </span>
                        ) : (
                          <span className="text-[#9b8f7a] italic">Aucune</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#6b5f4f] font-medium max-w-[100px] truncate" title={prod.brand?.name || ''}>
                        {prod.brand?.name || <span className="text-[#9b8f7a] italic">Aucune</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${stockBadgeClass}`}>
                          {prod.stock}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#153f2b] font-mono">
                        {hasRemise ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[#c9a052]">
                              {formatPrice(displayPrice.finalPrice)}
                            </span>
                            <span className="text-[9px] line-through text-[#9b8f7a] font-normal">
                              {formatPrice(displayPrice.basePrice)}
                            </span>
                          </div>
                        ) : (
                          formatPrice(prod.sellingPriceTTC)
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {hasRemise ? (
                          <div className="inline-flex items-center gap-1 justify-center">
                            <span className="inline-flex px-2 py-0.5 bg-[#FBF6EC] border border-[#c9a052]/30 text-[#c9a052] rounded-md font-bold text-[10px]">
                              {displayPrice.badgeLabel || 'PROMO'}
                            </span>
                            {prod.remiseVisible ? (
                              <span title="Remise visible public">
                                <Eye className="w-3.5 h-3.5 text-[#6b7d53]" />
                              </span>
                            ) : (
                              <span title="Remise masquée public (s'applique sans mention)">
                                <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#9b8f7a] italic">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(prod.id, prod.isActive)}
                          style={{
                            width: '36px', height: '18px', borderRadius: '9px', border: 'none',
                            background: prod.isActive ? '#1b3a1e' : '#d5cfc0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                          }}
                          className="inline-block align-middle"
                        >
                          <span style={{
                            position: 'absolute', top: '2px', left: prod.isActive ? '20px' : '2px',
                            width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
                            transition: 'left 0.2s', display: 'block',
                          }} />
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center sticky right-0 bg-white group-hover:bg-[#FBF6EC]/20 border-l border-[#ede8de] shadow-[-4px_0_8px_rgba(21,63,43,0.03)] z-10 relative">
                        <button
                          ref={activeMenuId === prod.id ? activeTriggerRef : null}
                          onClick={(e) => {
                            setActiveMenuId(activeMenuId === prod.id ? null : prod.id)
                            activeTriggerRef.current = e.currentTarget
                          }}
                          className="p-1 hover:bg-[#FBF6EC] rounded-lg transition-colors cursor-pointer text-[#6b5f4f]"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Portal dropdown */}
                        {activeMenuId === prod.id && (
                          <ActionMenu
                            triggerRef={activeTriggerRef}
                            isActive={prod.isActive}
                            onClose={() => setActiveMenuId(null)}
                            onView={() => {
                              setSelectedProduct(prod)
                              setIsDetailOpen(true)
                            }}
                            onEdit={() => router.push(`/admin/produits/${prod.id}`)}
                            onToggleActive={() => handleToggleActive(prod.id, prod.isActive)}
                            onDelete={() => {
                              setProductToDelete(prod.id)
                              setProductToDeleteName(prod.name)
                            }}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-4">
            {products.map((prod) => {
              const isLow = prod.stock > 0 && prod.stock <= parseInt(settings.lowStockThreshold || '10')
              const isOut = prod.stock === 0
              const stockBadgeClass = isOut
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : isLow
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              const displayPrice = computeDisplayPrice(prod)
              const hasRemise = displayPrice.hasDiscount

              return (
                <div key={prod.id} className="p-4 bg-white border border-[#eadfca] rounded-2xl space-y-3 relative shadow-3xs text-left">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(prod.id)}
                      onChange={() => toggleSelect(prod.id)}
                      className="cursor-pointer w-4 h-4 accent-[#153f2b] mt-1"
                    />
                    <div className="relative w-12 h-12 border border-[#eadfca] rounded-lg overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
                      <ProductImage src={prod.images} alt={prod.name} fill className="object-contain p-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-[#153f2b] line-clamp-2 leading-tight">{prod.name}</h4>
                      <div className="text-[10px] text-[#9b8f7a] font-mono mt-0.5">{prod.code}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {prod.category && (
                          <span className="px-2 py-0.5 bg-[#FBF6EC] border border-[#eadfca] text-[#2a1f0e] rounded text-[9px] font-medium">
                            {prod.category.name}
                          </span>
                        )}
                        {prod.brand && (
                          <span className="px-2 py-0.5 bg-[#FBF6EC] border border-[#eadfca] text-[#6b5f4f] rounded text-[9px] font-medium">
                            {prod.brand.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#eadfca]/40 text-xs">
                    <div>
                      <span className="text-[9px] text-[#9b8f7a] block">Stock</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${stockBadgeClass}`}>
                        {prod.stock}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-[#9b8f7a] block">Prix</span>
                      {hasRemise ? (
                        <div className="flex flex-col items-center leading-tight">
                          <span className="text-[#c9a052] font-bold font-mono">
                            {formatPrice(displayPrice.finalPrice)}
                          </span>
                          <span className="text-[9px] line-through text-[#9b8f7a] font-mono">
                            {formatPrice(displayPrice.basePrice)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-[#153f2b] font-mono">{formatPrice(prod.sellingPriceTTC)}</span>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] text-[#9b8f7a] block mb-0.5">Statut</span>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(prod.id, prod.isActive)}
                        style={{
                          width: '36px', height: '18px', borderRadius: '9px', border: 'none',
                          background: prod.isActive ? '#1b3a1e' : '#d5cfc0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute', top: '2px', left: prod.isActive ? '20px' : '2px',
                            width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
                            transition: 'left 0.2s',
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#eadfca]/40">
                    <button
                      onClick={() => {
                        setSelectedProduct(prod)
                        setIsDetailOpen(true)
                      }}
                      className="p-1 hover:bg-[#FBF6EC] rounded text-[#153f2b] cursor-pointer border-none bg-transparent"
                      title="Voir détails"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => router.push(`/admin/produits/${prod.id}`)}
                      className="p-1 hover:bg-[#FBF6EC] rounded text-[#c9a052] cursor-pointer border-none bg-transparent"
                      title="Modifier"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSoftDelete(prod.id)}
                      className="p-1 hover:bg-rose-50 rounded text-rose-600 cursor-pointer border-none bg-transparent"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

        {/* 4. Pagination Panel */}
        {!loading && totalProducts > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[#eadfca] text-xs font-sans text-[#6b5f4f]">
            <div>
              Affichage de <span className="font-semibold">{Math.min(totalProducts, (page - 1) * parseInt(settings.productsPerPage) + 1)}</span> à{' '}
              <span className="font-semibold">{Math.min(totalProducts, page * parseInt(settings.productsPerPage))}</span> sur{' '}
              <span className="font-semibold">{totalProducts}</span> produits
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 border border-[#eadfca] rounded-lg bg-white hover:bg-[#FBF6EC] disabled:opacity-50 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {getPaginationRange().map((p, i) => {
                if (p === '...') {
                  return (
                    <span key={`dots-${i}`} className="px-2 text-[#9b8f7a]/60 font-semibold select-none">
                      ...
                    </span>
                  )
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(Number(p))}
                    className={`w-8 h-8 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                      page === p
                        ? 'bg-[#1b3a1e] border-[#1b3a1e] text-white'
                        : 'bg-white border-[#eadfca] text-[#2a1f0e] hover:bg-[#FBF6EC]'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 border border-[#eadfca] rounded-lg bg-white hover:bg-[#FBF6EC] disabled:opacity-50 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Sticky Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1b3a1e] text-white border border-[#c9a052]/30 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-[slideUp_0.3s_ease-out] text-xs md:text-sm font-sans max-w-[90%] md:max-w-2xl">
          <span className="font-semibold">
            {selectedIds.length} produit(s) sélectionné(s)
          </span>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleBulkAction('activate')}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all font-semibold flex items-center gap-1 cursor-pointer"
            >
              Activer
            </button>
            <button
              onClick={() => handleBulkAction('deactivate')}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all font-semibold flex items-center gap-1 cursor-pointer"
            >
              Désactiver
            </button>
            <button
              onClick={() => setIsBulkCategoryOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all font-semibold flex items-center gap-1 cursor-pointer"
            >
              Catégorie
            </button>
            <button
              onClick={() => setIsBulkDeleteConfirmOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 transition-all font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1 hover:bg-white/10 rounded-full cursor-pointer ml-2"
              title="Annuler la sélection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 6. Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Paramètres du Catalogue"
        icon={<Settings className="w-5 h-5" />}
        size="md"
      >
        <form onSubmit={saveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5">Devise</label>
              <input
                type="text"
                required
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5">Format Décimales</label>
              <select
                value={settings.priceFormat}
                onChange={(e) => setSettings({ ...settings, priceFormat: e.target.value })}
                className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
              >
                <option value="0">0 décimale (ex: 25 TND)</option>
                <option value="2">2 décimales (ex: 25,50 TND)</option>
                <option value="3">3 décimales (ex: 25,500 TND)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5">Seuil de Stock Critique</label>
            <input
              type="number"
              required
              min="0"
              value={settings.lowStockThreshold}
              onChange={(e) => setSettings({ ...settings, lowStockThreshold: e.target.value })}
              className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5">Taux de TVA par Défaut (%)</label>
            <input
              type="number"
              required
              min="0"
              max="100"
              step="0.1"
              value={settings.defaultTva}
              onChange={(e) => setSettings({ ...settings, defaultTva: e.target.value })}
              className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5">Produits par Page (Admin)</label>
            <select
              value={settings.productsPerPage}
              onChange={(e) => setSettings({ ...settings, productsPerPage: e.target.value })}
              className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
            >
              <option value="10">10 articles</option>
              <option value="20">20 articles</option>
              <option value="50">50 articles</option>
              <option value="100">100 articles</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#eadfca] mt-6">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg text-xs font-semibold hover:bg-[#FBF6EC] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* 7. History Modal */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Historique des Modifications"
        icon={<Clock className="w-5 h-5" />}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs text-[#6b5f4f]/80">Visualisez l'historique complet des actions d'import, création, modifications et suppressions.</p>
            <ClearHistoryButton endpoint="/api/admin/logs" onCleared={() => loadLogs(1)} />
          </div>

          {/* Scrollable logs list */}
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <div className="py-20 text-center text-xs text-[#9b8f7a] italic">Aucun log enregistré dans l'historique.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-4 border border-[#eadfca] rounded-xl bg-[#faf8f5] space-y-2 hover:border-[#c9a052]/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      log.action === 'CREATION' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      log.action === 'SUPPRESSION' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      log.action === 'IMPORT' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-[10px] text-[#9b8f7a] font-mono">
                      {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-[#153f2b]">{log.details}</p>

                  {log.changes && (
                    <div className="text-[10px] bg-white border border-[#ede8de] rounded-lg p-2 font-mono text-[#6b5f4f] space-y-1">
                      {Object.entries(JSON.parse(log.changes)).map(([field, delta]: any) => {
                        if (delta.before !== undefined && delta.after !== undefined) {
                          return (
                            <div key={field}>
                              <span className="font-semibold text-[#c9a052]">{field}</span> :{' '}
                              <span className="line-through text-rose-500">{String(delta.before)}</span> →{' '}
                              <span className="text-emerald-600">{String(delta.after)}</span>
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination logs */}
          {logTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#eadfca] pt-4 mt-4 text-xs font-sans text-[#6b5f4f]">
              <span>Page {logPage} sur {logTotalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={logPage === 1}
                  onClick={() => { loadLogs(logPage - 1) }}
                  className="px-3 py-1 border border-[#eadfca] rounded bg-white hover:bg-[#FBF6EC] disabled:opacity-50 cursor-pointer"
                >
                  Précédent
                </button>
                <button
                  disabled={logPage === logTotalPages}
                  onClick={() => { loadLogs(logPage + 1) }}
                  className="px-3 py-1 border border-[#eadfca] rounded bg-white hover:bg-[#FBF6EC] disabled:opacity-50 cursor-pointer"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 8. Details Modal */}
      <Modal
        isOpen={isDetailOpen && !!selectedProduct}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedProduct(null)
          setIsConfirmingDelete(false)
        }}
        title="Fiche Produit"
        size="xl"
      >
        {selectedProduct && (
          <div className="space-y-6">
            <p className="text-xs text-[#9b8f7a] -mt-4">Référence Unique : {selectedProduct.code}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Image Gallery */}
              <div className="space-y-4">
                <div className="aspect-square rounded-2xl bg-[#FBF6EC]/40 border border-[#eadfca] p-6 flex items-center justify-center relative overflow-hidden">
                  <ProductImage
                    src={selectedProduct.images}
                    alt={selectedProduct.name}
                    className="max-h-[300px] object-contain"
                  />
                </div>
                {(() => {
                  try {
                    if (selectedProduct.images) {
                      const trimmed = selectedProduct.images.trim()
                      if (trimmed.startsWith('[')) {
                        const imgs = JSON.parse(trimmed)
                        if (Array.isArray(imgs) && imgs.length > 1) {
                          return (
                            <div className="flex gap-2 flex-wrap">
                              {imgs.map((url: string, idx: number) => (
                                <div key={idx} className="w-14 h-14 rounded-xl border border-[#eadfca] p-1 bg-white overflow-hidden flex items-center justify-center">
                                  <img src={url} alt="" className="object-contain w-full h-full p-0.5" />
                                </div>
                              ))}
                            </div>
                          )
                        }
                      }
                    }
                  } catch { /* ignore */ }
                  return null
                })()}
              </div>

              {/* Right Column: Detailed info */}
              <div className="space-y-5 text-xs text-left">
                {/* Header info */}
                <div className="pb-3 border-b border-[#eadfca]/60">
                  <h3 className="font-serif text-2xl font-bold text-[#153f2b] leading-tight">{selectedProduct.name}</h3>
                  {selectedProduct.brand && (
                    <p className="text-xs font-bold text-[#c9a052] uppercase mt-1.5 tracking-wider">
                      Marque : {selectedProduct.brand.name}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedProduct.category && (
                      <span className="px-2 py-0.5 bg-[#FBF6EC] border border-[#eadfca] text-[#2a1f0e] rounded-md text-[10px] font-bold">
                        {selectedProduct.category.name}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      selectedProduct.isActive 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {selectedProduct.isActive ? 'Actif' : 'Masqué'}
                    </span>
                  </div>
                </div>

                {/* References */}
                <div className="pb-4 border-b border-[#eadfca]/60 space-y-2">
                  <h4 className="text-[10px] font-bold text-[#6b7d53] uppercase tracking-wider">Références</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[#9b8f7a] text-[9px] uppercase font-bold tracking-wider">Code interne</span>
                      <p className="font-semibold text-sm text-[#153f2b] mt-0.5">{selectedProduct.code}</p>
                    </div>
                    <div>
                      <span className="text-[#9b8f7a] text-[9px] uppercase font-bold tracking-wider">Code-barres (EAN)</span>
                      <p className="font-mono font-semibold text-sm text-[#153f2b] mt-0.5">{selectedProduct.barcode || 'Non renseigné'}</p>
                    </div>
                  </div>
                </div>

                {/* Stock info */}
                <div className="pb-4 border-b border-[#eadfca]/60 space-y-2">
                  <h4 className="text-[10px] font-bold text-[#6b7d53] uppercase tracking-wider">Stock & Inventaire</h4>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[#9b8f7a] text-[9px] uppercase font-bold tracking-wider block mb-1">Disponible</span>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                        selectedProduct.stock === 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : selectedProduct.stock <= selectedProduct.stockMin
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {selectedProduct.stock} unités
                      </span>
                    </div>
                    <div>
                      <span className="text-[#9b8f7a] text-[9px] uppercase font-bold tracking-wider block mb-1">Seuil d'alerte</span>
                      <p className="font-bold text-[#2a1f0e] pl-1">{selectedProduct.stockMin} unités</p>
                    </div>
                  </div>
                </div>

                {/* Pricing info card */}
                <div className="bg-[#FBF6EC] border border-[#eadfca]/80 rounded-2xl p-4 space-y-2">
                  <h4 className="text-[10px] font-bold text-[#6b7d53] uppercase tracking-wider border-b border-[#eadfca]/50 pb-1 mb-2">Structure tarifaire</h4>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-[#6b5f4f]">
                    <div>
                      <span className="block text-[9px] text-[#9b8f7a] uppercase font-bold">Prix Achat HT</span>
                      <span className="font-semibold font-mono text-[#2a1f0e]">{selectedProduct.purchasePriceHT?.toFixed(3)} TND</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-[#9b8f7a] uppercase font-bold">Marge brute</span>
                      <span className="font-semibold text-[#2a1f0e]">{selectedProduct.margin?.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-[#9b8f7a] uppercase font-bold">TVA</span>
                      <span className="font-semibold font-mono text-[#2a1f0e]">{selectedProduct.tva?.toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-[#eadfca] pt-3 mt-2 flex justify-between items-baseline">
                    <span className="font-bold text-sm text-[#153f2b]">Prix public TTC :</span>
                    <span className="font-mono text-xl font-bold text-[#c9a052]">
                      {selectedProduct.sellingPriceTTC?.toFixed(3)} TND
                    </span>
                  </div>

                  {selectedProduct.remiseType !== 'AUCUNE' && selectedProduct.remiseValeur && (
                    <div className="border-t border-dashed border-[#c9a052]/30 pt-2 mt-2 space-y-1.5">
                      <div className="flex justify-between items-baseline text-xs text-[#c9a052] font-bold">
                        <span>Prix après remise :</span>
                        <span className="font-mono text-base">
                          {computeDisplayPrice(selectedProduct).finalPrice.toFixed(3)}{' '}
                          TND
                        </span>
                      </div>
                      <p className="text-[10px] text-[#9b8f7a] leading-normal italic">
                        Promotion active : {computeDisplayPrice(selectedProduct).badgeLabel || 'PROMO'}
                        <br />
                        Visibilité site public : {selectedProduct.remiseVisible ? 'Affiché en prix barré' : 'Masqué (s\'applique en prix net réduit)'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedProduct.description && (
                  <div className="pt-2">
                    <span className="text-[#9b8f7a] uppercase font-bold text-[9px] block mb-1">Description</span>
                    <p className="text-[#2a1f0e] leading-relaxed whitespace-pre-line text-[11px] max-h-32 overflow-y-auto pr-1">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer action bar */}
            <div className="flex justify-between items-center pt-6 border-t border-[#ede8de] mt-8">
              <a
                href={`/fr/catalogue/${selectedProduct.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 border border-[#eadfca] hover:bg-[#FBF6EC] text-[#1b3a1e] rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" /> Voir sur le site
              </a>

              {isConfirmingDelete ? (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                  <span className="text-rose-700 text-xs font-semibold">Confirmer la mise en corbeille ?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        handleSoftDelete(selectedProduct.id)
                        setIsDetailOpen(false)
                        setIsConfirmingDelete(false)
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer border-none"
                    >
                      Oui, corbeille
                    </button>
                    <button
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-3 py-1.5 bg-white border border-[#eadfca] text-[#2a1f0e] hover:bg-[#FBF6EC] rounded-lg text-xs font-semibold transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsDetailOpen(false)
                      router.push(`/admin/produits/${selectedProduct.id}`)
                    }}
                    className="px-4 py-2.5 bg-[#FBF6EC] border border-[#eadfca] text-[#1b3a1e] rounded-xl text-xs font-semibold hover:bg-[#eadfca]/20 cursor-pointer"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="px-4 py-2.5 border border-rose-300 bg-white hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Mettre en corbeille
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 9. Bulk Change Category Modal */}
      <Modal
        isOpen={isBulkCategoryOpen}
        onClose={() => setIsBulkCategoryOpen(false)}
        title="Changer la catégorie"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#6b5f4f]/80">Attribuez une nouvelle catégorie aux {selectedIds.length} produit(s) sélectionné(s) :</p>

          <select
            value={bulkCategoryId}
            onChange={(e) => setBulkCategoryId(e.target.value)}
            className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
          >
            <option value="">Sélectionnez une catégorie...</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsBulkCategoryOpen(false)}
              className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg text-xs font-semibold hover:bg-[#FBF6EC] cursor-pointer"
            >
              Annuler
            </button>
            <button
              onClick={() => handleBulkAction('category', bulkCategoryId)}
              disabled={!bulkCategoryId}
              className="px-4 py-2 bg-[#1b3a1e] disabled:bg-[#1b3a1e]/40 hover:bg-[#c9a052] text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
            >
              Valider
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmation soft-delete unitaire */}
      <Modal
        isOpen={productToDelete !== null}
        onClose={() => { setProductToDelete(null); setProductToDeleteName('') }}
        title="Mettre en corbeille"
        icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
        size="sm"
      >
        <div className="space-y-4 text-xs text-left">
          <p className="text-[#6b5f4f] leading-relaxed">
            Êtes-vous sûr de vouloir mettre le produit <strong className="text-[#153f2b]">"{productToDeleteName}"</strong> dans la corbeille ? Il ne sera plus visible sur le site public mais pourra être restauré.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#eadfca]/40">
            <button
              onClick={() => { setProductToDelete(null); setProductToDeleteName('') }}
              className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg font-semibold hover:bg-[#FBF6EC] cursor-pointer"
            >
              Annuler
            </button>
            <button
              onClick={async () => {
                if (productToDelete) {
                  await handleSoftDelete(productToDelete)
                  setProductToDelete(null)
                  setProductToDeleteName('')
                }
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold cursor-pointer border-none"
            >
              Confirmer
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmation soft-delete bulk */}
      <Modal
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setIsBulkDeleteConfirmOpen(false)}
        title="Mettre en corbeille la sélection"
        icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
        size="sm"
      >
        <div className="space-y-4 text-xs text-left">
          <p className="text-[#6b5f4f] leading-relaxed">
            Êtes-vous sûr de vouloir mettre ces <strong className="text-[#153f2b]">{selectedIds.length}</strong> produit(s) dans la corbeille ? Ils ne seront plus visibles sur le site public mais pourront être restaurés.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#eadfca]/40">
            <button
              onClick={() => setIsBulkDeleteConfirmOpen(false)}
              className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg font-semibold hover:bg-[#FBF6EC] cursor-pointer"
            >
              Annuler
            </button>
            <button
              onClick={async () => {
                await handleBulkAction('trash')
                setIsBulkDeleteConfirmOpen(false)
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold cursor-pointer border-none"
            >
              Confirmer
            </button>
          </div>
        </div>
      </Modal>

      {/* Styled animation keyframes */}
      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translate(-52%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

    </div>
  )
}
