'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ClearHistoryButton from '@/components/admin/ClearHistoryButton'
import Modal from '@/components/ui/Modal'
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  X,
  Loader2,
  CornerDownRight,
  Download,
  Trash2,
  Settings as SettingsIcon,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ImportPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: Upload, 2: Mapping, 3: Validation, 4: Progress/Process, 5: Report
  const [file, setFile] = useState<File | null>(null)
  
  // Preview data from server
  const [sheets, setSheets] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [totalRowsCount, setTotalRowsCount] = useState(0)

  // Drag & drop state
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mapping selections
  const [mapping, setMapping] = useState<Record<string, string>>({
    code: '',
    barcode: '',
    name: '',
    description: '',
    stock: '',
    category: '',
    brand: '',
    purchasePriceHT: '',
    margin: '',
    tva: '',
    sellingPriceTTC: '',
    publicPrice: '',
    discount: '',
    archive: '',
    imageUrl: '',
  })

  // Image handling mode detection (Chantier 7B)
  const [embeddedImagesDetected, setEmbeddedImagesDetected] = useState(false)

  // Duplicate option
  const [options, setOptions] = useState({
    duplicateBehavior: 'update', // 'update' or 'skip'
  })

  // Import stats
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    created: 0,
    updated: 0,
    ignored: 0,
    errors: [] as string[],
  })

  // Real progress tracking (polling the ImportBatch created by the async run)
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null)
  const [processingStatus, setProcessingStatus] = useState<'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | null>(null)
  const [processedRows, setProcessedRows] = useState(0)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Mirrors src/lib/importProcessor.ts IMPORT_ROW_WARNING_THRESHOLD — shown to the
  // admin before launch so a very large file isn't a surprise.
  const ROW_WARNING_THRESHOLD = 20000

  // Batch imports undo state
  const [batches, setBatches] = useState<any[]>([])
  const [selectedBatch, setSelectedBatch] = useState<any>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'trash' | 'permanent'>('trash')
  const [deletingBatch, setDeletingBatch] = useState(false)

  // Modals & Panels for configuration sync
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [trashCount, setTrashCount] = useState(0)
  const [settings, setSettings] = useState({
    currency: 'TND',
    priceFormat: '3',
    lowStockThreshold: '10',
    defaultTva: '19',
    duplicateBehavior: 'update',
    productsPerPage: '20',
  })
  const [importSettings, setImportSettings] = useState({
    duplicateBehavior: 'update',
    normaliseCategories: true,
    defaultStatus: 'inactive',
    preferredFileFormat: 'xlsx',
  })
  const [logs, setLogs] = useState<any[]>([])
  const [logPage, setLogPage] = useState(1)
  const [logTotalPages, setLogTotalPages] = useState(1)

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (res.ok && data.settings) {
        setSettings(data.settings)
        if (data.settings.import) {
          try {
            setImportSettings(JSON.parse(data.settings.import))
          } catch {}
        }
      }
    } catch { /* ignore */ }
  }

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newSettings = {
        ...settings,
        import: JSON.stringify(importSettings),
      }
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
      })
      if (res.ok) {
        toast.success('Paramètres d\'importation enregistrés !')
        setSettings(newSettings)
        setIsSettingsOpen(false)
      } else {
        toast.error('Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  const loadLogs = async (p = 1) => {
    try {
      const res = await fetch(`/api/admin/logs?page=${p}`)
      const data = await res.json()
      if (res.ok) {
        setLogs(data.logs || [])
        setLogPage(p)
        setLogTotalPages(data.totalPages || 1)
      }
    } catch {
      toast.error('Erreur lors du chargement de l\'historique')
    }
  }

  const loadTrashCount = () => {
    fetch('/api/admin/products/trash')
      .then((r) => r.json())
      .then((d) => setTrashCount(d.products?.length || 0))
      .catch(() => {})
  }

  useEffect(() => {
    loadSettings()
    loadTrashCount()
  }, [])

  const loadBatches = async () => {
    try {
      const res = await fetch('/api/admin/import/batches')
      const data = await res.json()
      if (res.ok) {
        setBatches(data.batches || [])
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (step === 1) {
      loadBatches()
    }
  }, [step])

  const schemaFields = [
    { key: 'code', label: 'Code Article (Unique) *', required: true, desc: 'Identifiant unique du produit' },
    { key: 'name', label: 'Désignation / Nom *', required: true, desc: 'Nom public de l\'article' },
    { key: 'category', label: 'Famille / Catégorie', required: false, desc: 'Nom de la catégorie' },
    { key: 'brand', label: 'Marque', required: false, desc: 'Marque du produit' },
    { key: 'stock', label: 'Quantité Stock', required: false, desc: 'Stock initial' },
    { key: 'purchasePriceHT', label: 'Prix Achat HT', required: false, desc: 'Prix de revient fournisseur' },
    { key: 'margin', label: 'Marge (%) / MB%', required: false, desc: 'Taux de marge brute' },
    { key: 'tva', label: 'TVA (%)', required: false, desc: 'Taux de taxe applicable (ex: 19)' },
    { key: 'sellingPriceTTC', label: 'Prix Vente TTC', required: false, desc: 'Prix de vente public TTC' },
    { key: 'publicPrice', label: 'Prix Public HT / Vente Pub HT', required: false, desc: 'Prix de vente public HT conseillé' },
    { key: 'barcode', label: 'Code à barres (EAN)', required: false, desc: 'Code EAN13 ou EAN8' },
    { key: 'description', label: 'Description', required: false, desc: 'Texte de description français' },
    { key: 'discount', label: 'Taux de Remise (%) / D. Remise', required: false, desc: 'Valeur de réduction en pourcentage' },
    { key: 'archive', label: 'Archiver / Statut', required: false, desc: 'Si remplie, produit inactif' },
    { key: 'imageUrl', label: 'URL Image', required: false, desc: 'Lien direct http(s) vers une image du produit' },
  ]

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0])
    }
  }

  const handleFileSelected = async (selectedFile: File) => {
    const name = selectedFile.name.toLowerCase()
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      toast.error('Format non supporté (utilisez .xlsx, .xls ou .csv)')
      return
    }

    setFile(selectedFile)
    setLoading(true)

    // Upload for preview
    try {
      const body = new FormData()
      body.append('file', selectedFile)
      body.append('previewOnly', 'true')

      const res = await fetch('/api/admin/import', { method: 'POST', body })
      const data = await res.json()

      if (res.ok && data.headers) {
        setSheets(data.sheets || [])
        setSelectedSheet(data.sheets?.[0] || '')
        setHeaders(data.headers)
        setPreviewRows(data.previewRows || [])
        setTotalRowsCount(data.totalRows || 0)
        setEmbeddedImagesDetected(!!data.embeddedImagesDetected)

        // Auto map headers based on common names
        const autoMapping = { ...mapping }
        const lowerHeaders = data.headers.map((h: string) => h.toLowerCase().trim())
        
        const autoMapRules: Record<string, string[]> = {
          code: ['code', 'ref', 'reference'],
          barcode: ['code a bar', 'code à bar', 'ean', 'barcode', 'codebarre'],
          name: ['designation', 'désignation', 'nom', 'name', 'article', 'description commerciale'],
          description: ['description', 'detail', 'details', 'info'],
          stock: ['stock', 'quantite', 'qté', 'qte', 'dispo'],
          category: ['famille', 'catégorie', 'categorie', 'category', 'groupe'],
          brand: ['marque', 'brand', 'fabricant'],
          purchasePriceHT: ['prix achat ht', 'achat ht', 'prix achat', 'p.achat', 'paht'],
          margin: ['mb%', 'marge', 'margin', 'markup'],
          tva: ['tva', 'taxe'],
          sellingPriceTTC: ['pventettc', 'prix vente ttc', 'prix vente', 'vente ttc', 'ttc', 'pvttc'],
          publicPrice: ['pvente pub ht', 'prix vente pub ht', 'prix public', 'public ht'],
          discount: ['d. remise', 'remise', 'discount', 'reduction'],
          archive: ['archiver', 'archive', 'actif', 'status', 'statut'],
          imageUrl: ['url image', 'image url', 'lien image', 'photo url', 'image'],
        }

        Object.entries(autoMapRules).forEach(([field, keywords]) => {
          const index = lowerHeaders.findIndex((lh: string) => 
            keywords.some((k) => lh === k || lh.startsWith(k) || lh.endsWith(k))
          )
          if (index !== -1) {
            autoMapping[field] = data.headers[index]
          }
        })

        setMapping(autoMapping)
        setStep(2)
      } else {
        toast.error(data.error || 'Erreur lors du chargement de l\'aperçu')
        setFile(null)
      }
    } catch {
      toast.error('Erreur lors du traitement du fichier')
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  // Load preview data from different sheet if changed
  const handleSheetChange = async (sheetName: string) => {
    setSelectedSheet(sheetName)
    setLoading(true)
    try {
      const body = new FormData()
      body.append('file', file!)
      body.append('previewOnly', 'true')
      body.append('selectedSheet', sheetName)

      const res = await fetch('/api/admin/import', { method: 'POST', body })
      const data = await res.json()

      if (res.ok && data.headers) {
        setHeaders(data.headers)
        setPreviewRows(data.previewRows || [])
        setTotalRowsCount(data.totalRows || 0)
        setEmbeddedImagesDetected(!!data.embeddedImagesDetected)
      }
    } catch {
      toast.error('Erreur de changement de feuille')
    } finally {
      setLoading(false)
    }
  }

  const handleGoToValidation = () => {
    // Check required fields
    if (!mapping.code) {
      toast.warning('Le champ "Code" est obligatoire pour l\'identification des produits.')
      return
    }
    if (!mapping.name) {
      toast.warning('Le champ "Désignation / Nom" est obligatoire pour nommer les produits.')
      return
    }
    setStep(3)
  }

  // Stop any in-flight polling loop (on unmount or when a run finishes)
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [])

  const pollBatchStatus = (batchId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/import/batches/${batchId}`)
        const data = await res.json()
        if (!res.ok) return

        const batch = data.batch
        setProcessingStatus(batch.status)
        setProcessedRows(batch.processedRows || 0)

        if (batch.status === 'COMPLETED' || batch.status === 'FAILED') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current)
          setLoading(false)

          if (batch.status === 'COMPLETED') {
            setStats({
              created: batch.productsCreatedCount || 0,
              updated: batch.productsUpdatedCount || 0,
              ignored: batch.ignoredCount || 0,
              errors: batch.errors || [],
            })
            setStep(5)
          } else {
            toast.error(batch.errorMessage || 'L\'importation a échoué. Consultez le journal des anomalies.')
            setStats({
              created: batch.productsCreatedCount || 0,
              updated: batch.productsUpdatedCount || 0,
              ignored: batch.ignoredCount || 0,
              errors: batch.errors || [],
            })
            setStep(5)
          }
        }
      } catch { /* transient network hiccup — next poll tick will retry */ }
    }, 1200)
  }

  const runImport = async () => {
    setStep(4)
    setLoading(true)
    setProcessingStatus('PENDING')
    setProcessedRows(0)
    try {
      const body = new FormData()
      body.append('file', file!)
      body.append('selectedSheet', selectedSheet)
      body.append('mapping', JSON.stringify(mapping))
      body.append('options', JSON.stringify(options))

      const res = await fetch('/api/admin/import', { method: 'POST', body })
      const data = await res.json()

      if (res.ok && data.batchId) {
        setProcessingBatchId(data.batchId)
        pollBatchStatus(data.batchId)
      } else {
        toast.error(data.error || 'Erreur lors du lancement de l\'import')
        setLoading(false)
        setStep(3)
      }
    } catch {
      toast.error('Erreur de communication avec le serveur')
      setLoading(false)
      setStep(3)
    }
  }

  // Download error logs
  const downloadErrors = () => {
    if (stats.errors.length === 0) return
    const text = stats.errors.join('\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `paraglow-import-errors-${Date.now()}.txt`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const inputStyle = 'w-full px-2 py-1.5 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none text-xs text-[#2a1f0e] font-semibold'

  return (
    <div className="max-w-4xl mx-auto pb-12 font-sans text-[#2a1f0e]">
      
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-[#153f2b]">
            Assistant d'importation
          </h1>
          <p className="text-sm text-[#6b5f4f]/80 mt-1">Importez et normalisez le catalogue de votre parapharmacie.</p>
        </div>
        
        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => router.push('/admin/produits')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 active:scale-98 cursor-pointer border-none"
          >
            ← Retour aux produits
          </button>
          
          <button
            onClick={() => { setIsHistoryOpen(true); loadLogs() }}
            className="inline-flex items-center justify-center p-2 bg-white border border-[#eadfca] text-[#2a1f0e] hover:bg-[#FBF6EC] rounded-lg transition-all cursor-pointer"
            title="Historique"
          >
            <Clock className="w-4 h-4 text-[#6b5f4f]" />
          </button>

          <Link
            href="/admin/produits/corbeille"
            className="relative inline-flex items-center justify-center p-2 bg-white border border-[#eadfca] text-[#2a1f0e] hover:bg-[#FBF6EC] rounded-lg transition-all cursor-pointer"
            title="Corbeille"
          >
            <Trash2 className="w-4 h-4 text-[#6b5f4f]" />
            {trashCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                {trashCount}
              </span>
            )}
          </Link>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center justify-center p-2 bg-white border border-[#eadfca] text-[#2a1f0e] hover:bg-[#FBF6EC] rounded-lg transition-all cursor-pointer"
            title="Paramètres"
          >
            <SettingsIcon className="w-4 h-4 text-[#6b5f4f]" />
          </button>
        </div>
      </div>

      {/* Step Progress indicators */}
      <div className="grid grid-cols-5 gap-2 mb-6 text-center text-xs font-semibold select-none">
        {[
          { num: 1, label: 'Téléchargement' },
          { num: 2, label: 'Mapping' },
          { num: 3, label: 'Validation' },
          { num: 4, label: 'Importation' },
          { num: 5, label: 'Rapport' },
        ].map((s) => (
          <div
            key={s.num}
            className={`py-3.5 border-b-2 transition-all ${
              step === s.num
                ? 'border-[#1b3a1e] text-[#1b3a1e] font-bold'
                : step > s.num
                ? 'border-[#c9a052] text-[#c9a052]'
                : 'border-[#eadfca] text-[#9b8f7a]/60'
            }`}
          >
            <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold mr-1.5 ${
              step === s.num
                ? 'bg-[#1b3a1e] text-white'
                : step > s.num
                ? 'bg-[#c9a052] text-white'
                : 'bg-[#eadfca] text-[#9b8f7a]/60'
            }`}>
              {s.num}
            </span>
            <span className="hidden md:inline">{s.label}</span>
          </div>
        ))}
      </div>

      {/* STEP 1: Upload file */}
      {step === 1 && (
        <div className="bg-white border border-[#eadfca] rounded-2xl p-8 shadow-[0_4px_24px_rgba(21,63,43,0.02)] flex flex-col items-center justify-center">
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-[#c9a052] animate-spin" />
              <p className="text-xs font-semibold text-[#6b5f4f]">Analyse de la structure du fichier...</p>
            </div>
          ) : (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[300px] ${
                dragActive
                  ? 'border-[#1b3a1e] bg-[#FBF6EC]'
                  : 'border-[#d5cfc0] hover:border-[#c9a052]/50 hover:bg-[#FBF6EC]/10'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <UploadCloud className="w-16 h-16 text-[#c9a052] mb-4" />
              <h3 className="font-serif text-lg font-bold text-[#153f2b] mb-1">
                Importez votre catalogue produits
              </h3>
              <p className="text-xs text-[#6b5f4f]/80 max-w-sm mb-4 leading-normal">
                Glissez-déposez votre fichier Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) ou <strong>.csv</strong> ici, ou cliquez pour parcourir votre ordinateur.
              </p>
              <span className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-lg text-xs font-semibold shadow-sm transition-all">
                Sélectionner un fichier
              </span>
            </div>
          )}

          {/* Lot history table */}
          {batches.length > 0 && (
            <div className="w-full mt-10 bg-white border border-[#eadfca] rounded-2xl p-5 shadow-[0_2px_12px_rgba(21,63,43,0.02)] space-y-4 text-left">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#153f2b]">Historique des Importations</h3>
                <p className="text-xs text-[#6b5f4f]/80 mt-1 font-normal">
                  Voici la liste des imports de catalogue effectués. Vous pouvez annuler un import complet pour supprimer tous les produits créés. Les produits qui existaient déjà ne sont pas affectés.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FBF6EC] border-b border-[#eadfca] font-semibold text-[#6b5f4f]">
                      <th className="py-3 px-4">Date & Heure</th>
                      <th className="py-3 px-4">Nom du fichier</th>
                      <th className="py-3 px-4 text-center">Créations</th>
                      <th className="py-3 px-4 text-center">Mises à jour</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede8de]">
                    {batches.map((b) => (
                      <tr key={b.id} className="hover:bg-[#FBF6EC]/10 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#6b5f4f]">
                          {new Date(b.createdAt).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#153f2b]">{b.filename}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{b.productsCreatedCount}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-indigo-500">{b.productsUpdatedCount}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBatch(b)
                              setIsDeleteModalOpen(true)
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-bold transition-all cursor-pointer border-none"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Annuler l'import
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Preview & mapping */}
      {step === 2 && (
        <div className="space-y-6">
          {/* File details */}
          <div className="bg-white border border-[#eadfca] rounded-2xl p-4 shadow-xs flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FBF6EC] border border-[#c9a052]/30 flex items-center justify-center text-[#c9a052]">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#153f2b]">{file?.name}</p>
                <p className="text-[10px] text-[#9b8f7a]">{totalRowsCount} lignes détectées</p>
              </div>
            </div>

            {/* Sheet select if multiple */}
            {sheets.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-semibold text-[#6b5f4f] uppercase whitespace-nowrap">Feuille Excel :</label>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="px-2.5 py-1.5 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] text-xs font-semibold"
                >
                  {sheets.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Mapping Grid */}
          <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-[0_2px_12px_rgba(21,63,43,0.02)] space-y-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#153f2b] border-b border-[#ede8de] pb-2">Correspondance des Colonnes (Mapping)</h2>
              <p className="text-xs text-[#6b5f4f]/80 mt-1">
                Faites correspondre les champs requis du site ParaGlow (colonne de gauche) avec les en-têtes de votre fichier Excel détectées (colonne de droite).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-3">
              {schemaFields.map((field) => (
                <div key={field.key} className="flex flex-col gap-1 border-b border-[#ede8de]/50 pb-2.5">
                  <div className="flex justify-between items-baseline">
                    <span className={`text-xs font-bold ${field.required ? 'text-[#1b3a1e]' : 'text-[#6b5f4f]'}`}>
                      {field.label}
                    </span>
                    <span className="text-[9px] text-[#9b8f7a] font-normal italic">{field.desc}</span>
                  </div>
                  
                  <select
                    value={mapping[field.key]}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                    className={inputStyle}
                  >
                    <option value="">-- Ignorer ce champ --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-[#ede8de] mt-6">
              <button
                type="button"
                onClick={() => { setStep(1); setFile(null) }}
                className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg text-xs font-semibold hover:bg-[#FBF6EC] cursor-pointer"
              >
                ← Retour
              </button>
              <button
                type="button"
                onClick={handleGoToValidation}
                className="px-6 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-lg text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                Continuer <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* First 10 rows Preview */}
          <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-[0_2px_12px_rgba(21,63,43,0.02)] space-y-4">
            <h3 className="font-serif text-base font-bold text-[#153f2b] border-b border-[#ede8de] pb-1">Aperçu des données (10 premières lignes)</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-[#FBF6EC] border-b border-[#eadfca] font-semibold text-[#6b5f4f]">
                    {headers.map((h) => <th key={h} className="py-2 px-3 whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ede8de]">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#FBF6EC]/10">
                      {headers.map((h) => (
                        <td key={h} className="py-2 px-3 text-[#2a1f0e] max-w-[150px] truncate" title={String(row[h])}>
                          {String(row[h])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Validation & Settings before run */}
      {step === 3 && (
        <div className="bg-white border border-[#eadfca] rounded-2xl p-6 shadow-[0_4px_24px_rgba(21,63,43,0.02)] space-y-6">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#153f2b] border-b border-[#ede8de] pb-2">Vérifications avant Import</h2>
            <p className="text-xs text-[#6b5f4f]/80 mt-1">Configurez les comportements d'importation et lancez l'écriture de données.</p>
          </div>

          {/* Summary Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-[#c9a052]/30 rounded-xl bg-[#FBF6EC]/40 space-y-2 text-xs">
              <h3 className="font-serif font-bold text-[#153f2b] flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-[#6b7d53]" /> Résumé de l'opération</h3>
              <p><span className="font-semibold">Fichier source :</span> {file?.name}</p>
              <p><span className="font-semibold">Lignes à traiter :</span> {totalRowsCount} lignes</p>
              <p><span className="font-semibold">Destination :</span> SQLite Database (dev.db)</p>
              <p>
                <span className="font-semibold">Images produits :</span>{' '}
                {mapping.imageUrl
                  ? `téléchargées depuis la colonne "${mapping.imageUrl}"`
                  : embeddedImagesDetected
                  ? 'images natives détectées dans le fichier (extraites et associées par position)'
                  : 'aucune (placeholder par défaut)'}
              </p>
            </div>

            {/* Resolve duplicates option */}
            <div className="p-4 border border-[#eadfca] rounded-xl bg-[#faf8f5] space-y-3 text-xs">
              <h3 className="font-bold text-[#153f2b] flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-[#c9a052]" /> Gestion des codes déjà existants</h3>
              <p className="text-[10px] text-[#6b5f4f]/90 leading-normal">Si un code produit dans le fichier existe déjà dans votre base de données :</p>
              
              <div className="space-y-1.5 font-semibold">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="duplicateBehavior"
                    checked={options.duplicateBehavior === 'update'}
                    onChange={() => setOptions({ duplicateBehavior: 'update' })}
                    className="w-4 h-4 accent-[#1b3a1e] cursor-pointer"
                  />
                  Mettre à jour la fiche produit existante (recommandé)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="duplicateBehavior"
                    checked={options.duplicateBehavior === 'skip'}
                    onChange={() => setOptions({ duplicateBehavior: 'skip' })}
                    className="w-4 h-4 accent-[#1b3a1e] cursor-pointer"
                  />
                  Ignorer et conserver le produit de la base intact
                </label>
              </div>
            </div>
          </div>

          <div className="p-4 border border-rose-200 bg-rose-50/50 rounded-xl flex items-start gap-3 text-xs text-rose-800 leading-relaxed">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Attention</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Cette importation va modifier directement la base de données. Les catégories et marques manquantes seront créées automatiquement à la volée. Assurez-vous d'avoir sauvegardé ou validé les colonnes de mapping.
              </p>
            </div>
          </div>

          {totalRowsCount > ROW_WARNING_THRESHOLD && (
            <div className="p-4 border border-amber-200 bg-amber-50/50 rounded-xl flex items-start gap-3 text-xs text-amber-800 leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Fichier volumineux ({totalRowsCount.toLocaleString('fr-FR')} lignes)</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Ce fichier dépasse {ROW_WARNING_THRESHOLD.toLocaleString('fr-FR')} lignes. Le traitement se fait par lots en arrière-plan et peut prendre plusieurs minutes — restez sur cette page jusqu'à la fin, la progression réelle sera affichée à l'étape suivante.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-[#ede8de]">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg text-xs font-semibold hover:bg-[#FBF6EC] cursor-pointer"
            >
              ← Retour
            </button>
            <button
              type="button"
              onClick={runImport}
              className="px-6 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-lg text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" /> Lancer l'importation
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Processing / Progress bar — real progress, polled from the ImportBatch */}
      {step === 4 && (
        <div className="bg-white border border-[#eadfca] rounded-2xl p-12 shadow-[0_4px_24px_rgba(21,63,43,0.02)] flex flex-col items-center justify-center text-center">
          <Loader2 className="w-12 h-12 text-[#c9a052] animate-spin mb-4" />
          <h3 className="font-serif text-lg font-bold text-[#153f2b] mb-1">
            {processingStatus === 'PENDING' ? 'Démarrage de l\'importation...' : 'Traitement en cours...'}
          </h3>
          <p className="text-xs text-[#6b5f4f]/80 max-w-sm mb-2 leading-relaxed">
            Ne fermez pas cette fenêtre. Le traitement se poursuit par lots côté serveur — vous pouvez suivre l'avancement réel ci-dessous.
          </p>
          {totalRowsCount > 0 && (
            <p className="text-xs font-bold text-[#153f2b] mb-4 font-mono">
              {processedRows} / {totalRowsCount} lignes traitées
            </p>
          )}
          <div className="w-full max-w-xs bg-[#FBF6EC] h-1.5 rounded-full overflow-hidden border border-[#eadfca]/60">
            <div
              className="bg-[#1b3a1e] h-full transition-all duration-300"
              style={{ width: `${totalRowsCount > 0 ? Math.min(100, (processedRows / totalRowsCount) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* STEP 5: Final Report */}
      {step === 5 && (
        <div className="bg-white border border-[#eadfca] rounded-2xl p-6 shadow-[0_4px_24px_rgba(21,63,43,0.02)] space-y-6">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#153f2b] border-b border-[#ede8de] pb-2">Rapport d'importation</h2>
            <p className="text-xs text-[#6b5f4f]/80 mt-1">L'importation de votre catalogue est terminée. Voici le récapitulatif détaillé :</p>
          </div>

          {/* Stats Boxes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border border-emerald-100 rounded-xl bg-emerald-50/20 text-center">
              <span className="text-3xl font-serif font-bold text-emerald-600 block">{stats.created}</span>
              <span className="text-[10px] uppercase font-bold text-[#6b5f4f] mt-1 block">Créations</span>
            </div>
            <div className="p-4 border border-indigo-100 rounded-xl bg-indigo-50/20 text-center">
              <span className="text-3xl font-serif font-bold text-indigo-600 block">{stats.updated}</span>
              <span className="text-[10px] uppercase font-bold text-[#6b5f4f] mt-1 block">Mises à jour</span>
            </div>
            <div className="p-4 border border-[#eadfca] rounded-xl bg-[#faf8f5] text-center">
              <span className="text-3xl font-serif font-bold text-[#2a1f0e] block">{stats.ignored}</span>
              <span className="text-[10px] uppercase font-bold text-[#6b5f4f] mt-1 block">Lignes ignorées</span>
            </div>
            <div className="p-4 border border-rose-100 rounded-xl bg-rose-50/20 text-center">
              <span className="text-3xl font-serif font-bold text-rose-600 block">{stats.errors.length}</span>
              <span className="text-[10px] uppercase font-bold text-[#6b5f4f] mt-1 block">Erreurs</span>
            </div>
          </div>

          {/* Errors list if any */}
          {stats.errors.length > 0 && (
            <div className="p-4 border border-rose-200 bg-rose-50/30 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-xs text-rose-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" /> Journal des anomalies ({stats.errors.length} ligne(s) avec erreurs)
                </h3>
                <button
                  onClick={downloadErrors}
                  className="px-2.5 py-1 bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 text-[10px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Télécharger le log
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 font-mono text-[10px] text-rose-700 leading-normal pr-1">
                {stats.errors.map((err, idx) => (
                  <div key={idx} className="flex gap-1.5 items-start">
                    <CornerDownRight className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-[#ede8de]">
            <button
              onClick={() => {
                setFile(null)
                setStep(1)
              }}
              className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg text-xs font-semibold hover:bg-[#FBF6EC] cursor-pointer"
            >
              Importer un autre fichier
            </button>
            <button
              onClick={() => router.push('/admin/produits')}
              className="px-6 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              Aller au catalogue
            </button>
          </div>
        </div>
      )}

      {/* 11. Delete Batch Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen && selectedBatch !== null}
        onClose={() => { setIsDeleteModalOpen(false); setSelectedBatch(null) }}
        title="Annuler l'importation complète"
        icon={<AlertTriangle className="text-rose-600 w-5 h-5" />}
        size="md"
      >
        <div className="space-y-4 text-xs text-left text-[#2a1f0e]">
          <p className="leading-relaxed">
            Vous êtes sur le point d'annuler l'importation du fichier <strong className="text-[#153f2b]">"{selectedBatch?.filename}"</strong> effectuée le {selectedBatch && new Date(selectedBatch.createdAt).toLocaleString('fr-FR')}.
          </p>
          
          <div className="p-3 bg-[#FBF6EC]/50 border border-[#c9a052]/20 rounded-xl space-y-1 bg-amber-50/20">
            <p>⚠️ <strong>{selectedBatch?.productsCreatedCount} produits créés</strong> par cet import seront supprimés.</p>
            <p>💡 <strong>{selectedBatch?.productsUpdatedCount} produits mis à jour</strong> ne seront <strong>PAS</strong> touchés (ils existaient déjà avant l'import).</p>
          </div>

          <div className="space-y-3 pt-2">
            <label className="block font-bold text-[#6b7d53] uppercase text-[9px] tracking-wider font-sans">Option de suppression</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeleteMode('trash')}
                className={`p-3 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all cursor-pointer font-sans ${
                  deleteMode === 'trash'
                    ? 'border-[#1b3a1e] bg-[#1b3a1e]/5 text-[#1b3a1e]'
                    : 'border-[#eadfca] hover:bg-[#FBF6EC]/25'
                }`}
              >
                <Trash2 className="w-4.5 h-4.5 text-amber-600" />
                <span>Mettre à la corbeille</span>
                <span className="text-[9px] font-normal text-[#6b5f4f] mt-0.5">Permet de les restaurer</span>
              </button>

              <button
                type="button"
                onClick={() => setDeleteMode('permanent')}
                className={`p-3 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all cursor-pointer font-sans ${
                  deleteMode === 'permanent'
                    ? 'border-rose-600 bg-rose-50/30 text-rose-700'
                    : 'border-[#eadfca] hover:bg-[#FBF6EC]/25'
                }`}
              >
                <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />
                <span>Suppression définitive</span>
                <span className="text-[9px] font-normal text-rose-500 mt-0.5">Action irréversible !</span>
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-[#eadfca]/40 mt-6 justify-end">
            <button
              type="button"
              onClick={() => { setIsDeleteModalOpen(false); setSelectedBatch(null) }}
              className="px-4 py-2.5 border border-[#eadfca] text-[#2a1f0e] rounded-lg font-semibold hover:bg-[#FBF6EC] cursor-pointer bg-white"
              disabled={deletingBatch}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!selectedBatch) return
                setDeletingBatch(true)
                try {
                  const res = await fetch(`/api/admin/import/batches/${selectedBatch.id}?mode=${deleteMode}`, {
                    method: 'DELETE',
                  })
                  const data = await res.json()
                  if (res.ok) {
                    toast.success(`Import annulé avec succès (${data.count} produits traités)`)
                    setIsDeleteModalOpen(false)
                    setSelectedBatch(null)
                    loadBatches()
                  } else {
                    toast.error(data.error || 'Erreur lors de la suppression')
                  }
                } catch {
                  toast.error('Erreur lors de la suppression')
                } finally {
                  setDeletingBatch(false)
                }
              }}
              disabled={deletingBatch}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none"
            >
              {deletingBatch ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Annulation...
                </>
              ) : (
                'Confirmer'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[99999] px-4 font-sans text-xs">
          <div className="bg-white border border-[#eadfca] rounded-2xl p-6 shadow-2xl max-w-md w-full relative">
            <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-[#FBF6EC] rounded-lg transition-colors cursor-pointer text-[#6b5f4f]">
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="font-serif text-xl font-bold text-[#153f2b] mb-4 flex items-center gap-2">
              <SettingsIcon className="text-[#c9a052] w-5 h-5" /> Paramètres d'Importation
            </h2>

            <form onSubmit={saveSettings} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5">Comportement Doublons Code</label>
                <select
                  value={importSettings.duplicateBehavior}
                  onChange={(e) => setImportSettings({ ...importSettings, duplicateBehavior: e.target.value })}
                  className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
                >
                  <option value="update">Mettre à jour la fiche existante (Recommandé)</option>
                  <option value="skip">Ignorer la ligne importée</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 border border-[#eadfca]/60 bg-[#FBF6EC]/20 rounded-xl">
                <div>
                  <span className="block font-bold text-[#153f2b]">Normalisation des catégories</span>
                  <span className="text-[10px] text-[#6b5f4f]/80">Nettoie les accents, espaces et majuscules</span>
                </div>
                <input
                  type="checkbox"
                  checked={importSettings.normaliseCategories}
                  onChange={(e) => setImportSettings({ ...importSettings, normaliseCategories: e.target.checked })}
                  className="w-4.5 h-4.5 accent-[#153f2b] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5">Statut par défaut des nouveaux produits</label>
                <select
                  value={importSettings.defaultStatus}
                  onChange={(e) => setImportSettings({ ...importSettings, defaultStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
                >
                  <option value="inactive">Masqué (Par défaut)</option>
                  <option value="active">Actif (Visible directement sur le site)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5">Format de fichier préféré</label>
                <select
                  value={importSettings.preferredFileFormat}
                  onChange={(e) => setImportSettings({ ...importSettings, preferredFileFormat: e.target.value })}
                  className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
                >
                  <option value="xlsx">Fichier Excel (.xlsx)</option>
                  <option value="csv">Fichier CSV (.csv)</option>
                  <option value="xls">Fichier Excel ancien (.xls)</option>
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
                  className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer border-none"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-end z-[99999] font-sans">
          <div className="bg-white border-l border-[#eadfca] h-full max-w-xl w-full p-6 shadow-2xl flex flex-col justify-between relative animate-[slideLeft_0.3s_ease-out] text-xs">
            <button onClick={() => setIsHistoryOpen(false)} className="absolute top-6 right-6 p-1 hover:bg-[#FBF6EC] rounded-lg transition-colors cursor-pointer text-[#6b5f4f]">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex-1 flex flex-col min-h-0">
              <h2 className="font-serif text-2xl font-bold text-[#153f2b] mb-2 flex items-center gap-2 text-left">
                <Clock className="text-[#c9a052] w-6 h-6" strokeWidth={1.8} /> Historique des Modifications
              </h2>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <p className="text-xs text-[#6b5f4f]/80 text-left">Visualisez l'historique complet des actions d'import, création, modifications et suppressions.</p>
                <ClearHistoryButton endpoint="/api/admin/logs" onCleared={() => loadLogs(1)} />
              </div>

              {/* Scrollable logs list */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
                {logs.length === 0 ? (
                  <div className="py-20 text-center text-xs text-[#9b8f7a] italic">Aucun log enregistré dans l'historique.</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="p-4 border border-[#eadfca] rounded-xl bg-[#faf8f5] space-y-2 hover:border-[#c9a052]/30 transition-colors text-left">
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
        </div>
      )}

      {/* Styled pulse animation for progress */}
      <style jsx>{`
        @keyframes progressPulse {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

    </div>
  )
}
