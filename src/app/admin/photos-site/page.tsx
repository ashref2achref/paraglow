'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { SLOTS_BY_PAGE, type MediaSlot } from '@/config/mediaSlots'
import { Upload, Trash2, X, Check, AlertTriangle, Clock, Settings } from 'lucide-react'
import ClearHistoryButton from '@/components/admin/ClearHistoryButton'
import Modal from '@/components/ui/Modal'

interface SiteMedia {
  id: string
  slotKey: string
  type: string
  url: string
  alt: string | null
  width: number | null
  height: number | null
}

interface MediaLog {
  id: string
  slotKey: string
  action: string
  details: string
  createdAt: string
}

interface MediaSettings {
  imageQuality: number
  maxImageSizeMB: number
  maxVideoSizeMB: number
  allowedImageTypes: string
  allowedVideoTypes: string
}

const DEFAULT_SETTINGS: MediaSettings = {
  imageQuality: 85,
  maxImageSizeMB: 15,
  maxVideoSizeMB: 100,
  allowedImageTypes: 'image/jpeg,image/png,image/webp',
  allowedVideoTypes: 'video/mp4,video/webm',
}

type TabKey = 'home' | 'about' | 'contact'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'home', label: 'Accueil' },
  { key: 'about', label: 'À propos' },
  { key: 'contact', label: 'Contact' },
]

export default function PhotosSitePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('home')
  const [media, setMedia] = useState<SiteMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const [trashCount, setTrashCount] = useState(0)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyLogs, setHistoryLogs] = useState<MediaLog[]>([])

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<MediaSettings>(DEFAULT_SETTINGS)
  const [savingSettings, setSavingSettings] = useState(false)

  // Tracks the latest upload attempt per slot so a stale (superseded) upload
  // never overwrites the state of a newer upload started for the same slot.
  const uploadTokensRef = useRef<Record<string, number>>({})

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadMedia = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/media')
      if (res.ok) {
        const data = await res.json()
        setMedia(data.media || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const loadTrashCount = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/media/trash')
      if (res.ok) {
        const data = await res.json()
        setTrashCount(data.media?.length || 0)
      }
    } catch { /* ignore */ }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (res.ok && data.settings?.photosSite) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(data.settings.photosSite) })
      }
    } catch { /* ignore */ }
  }, [])

  const loadHistoryLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/logs/media?page=1&limit=50')
      const data = await res.json()
      if (res.ok) setHistoryLogs(data.logs || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadMedia()
    loadTrashCount()
    loadSettings()
  }, [loadMedia, loadTrashCount, loadSettings])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const getRes = await fetch('/api/admin/settings')
      const getData = await getRes.json()
      const current = getData.settings || {}

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { ...current, photosSite: JSON.stringify(settings) } }),
      })

      if (res.ok) {
        showToast('Paramètres enregistrés', 'success')
        setIsSettingsOpen(false)
      } else {
        showToast('Erreur lors de la sauvegarde', 'error')
      }
    } catch {
      showToast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleUpload = async (slot: MediaSlot, file: File, alt: string) => {
    const isVideo = file.type.startsWith('video/')
    const maxSize = (isVideo ? settings.maxVideoSizeMB : settings.maxImageSizeMB) * 1024 * 1024

    if (file.size > maxSize) {
      const maxMb = isVideo ? settings.maxVideoSizeMB : settings.maxImageSizeMB
      showToast(`Fichier trop volumineux. Maximum : ${maxMb} Mo`, 'error')
      return
    }

    const token = Date.now() + Math.random()
    uploadTokensRef.current[slot.key] = token

    setUploadProgress((p) => ({ ...p, [slot.key]: 10 }))

    const formData = new FormData()
    formData.append('file', file)
    formData.append('slotKey', slot.key)
    if (alt) formData.append('alt', alt)

    const interval = setInterval(() => {
      if (uploadTokensRef.current[slot.key] !== token) {
        clearInterval(interval)
        return
      }
      setUploadProgress((p) => ({ ...p, [slot.key]: Math.min((p[slot.key] || 0) + 15, 85) }))
    }, 200)

    try {
      const res = await fetch('/api/admin/media', { method: 'POST', body: formData })

      // A newer upload for this same slot has started since — ignore this stale result.
      if (uploadTokensRef.current[slot.key] !== token) return

      clearInterval(interval)
      setUploadProgress((p) => ({ ...p, [slot.key]: 100 }))

      if (res.ok) {
        showToast(`${slot.label} mis à jour avec succès`, 'success')
        await loadMedia()
        await loadTrashCount()
      } else {
        const data = await res.json()
        showToast(data.error || 'Erreur lors de l\'upload', 'error')
      }
    } catch {
      if (uploadTokensRef.current[slot.key] !== token) return
      clearInterval(interval)
      showToast('Erreur réseau', 'error')
    }

    setTimeout(() => {
      if (uploadTokensRef.current[slot.key] !== token) return
      setUploadProgress((p) => {
        const next = { ...p }
        delete next[slot.key]
        return next
      })
    }, 500)
  }

  const handleDelete = async (slotKey: string) => {
    try {
      const res = await fetch('/api/admin/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotKey }),
      })
      if (res.ok) {
        showToast('Média mis à la corbeille', 'success')
        await loadMedia()
        await loadTrashCount()
      } else {
        showToast('Erreur lors de la suppression', 'error')
      }
    } catch {
      showToast('Erreur réseau', 'error')
    }
    setDeleteConfirm(null)
  }

  const getMedia = (slotKey: string) => media.find((m) => m.slotKey === slotKey)
  const slots = SLOTS_BY_PAGE[activeTab]

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 100,
          padding: '12px 20px', borderRadius: '10px',
          background: toast.type === 'success' ? '#153f2b' : '#dc2626',
          color: '#fff', fontSize: '13px', fontWeight: 500,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: '8px',
          animation: 'fadeIn 0.3s ease',
        }}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmer la suppression"
        icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
        size="sm"
      >
        <div className="space-y-4 text-xs text-left">
          <p className="text-[#6b5f4f] leading-relaxed">
            Le média sera déplacé dans la corbeille et le site affichera un emplacement vide.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#eadfca]/40">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg font-semibold hover:bg-[#FBF6EC] cursor-pointer bg-white"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (deleteConfirm) {
                  handleDelete(deleteConfirm)
                }
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold cursor-pointer border-none"
            >
              Supprimer
            </button>
          </div>
        </div>
      </Modal>

      {/* Historique Modal */}
      {isHistoryOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '560px', width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#153f2b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} /> Historique des médias
              </h3>
              <button onClick={() => setIsHistoryOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b5f4f' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#6b5f4f', marginBottom: '16px' }}>Suivi des ajouts, remplacements, suppressions et restaurations d'images/vidéos.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <ClearHistoryButton endpoint="/api/admin/logs/media" onCleared={loadHistoryLogs} />
            </div>

            {historyLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9b8f7a', fontSize: '13px', fontStyle: 'italic' }}>
                Aucun log enregistré dans l'historique des médias.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {historyLogs.map((log) => (
                  <div key={log.id} style={{ padding: '12px 14px', border: '1px solid #ede8de', borderRadius: '10px', background: '#faf8f5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                        background: log.action === 'PURGE' || log.action === 'DELETE' ? '#fef2f2' : log.action === 'RESTORE' ? '#eff6ff' : '#ecfdf5',
                        color: log.action === 'PURGE' || log.action === 'DELETE' ? '#dc2626' : log.action === 'RESTORE' ? '#1d4ed8' : '#059669',
                      }}>
                        {log.action}
                      </span>
                      <span style={{ fontSize: '10px', color: '#9b8f7a', fontFamily: 'monospace' }}>
                        {new Date(log.createdAt).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#153f2b' }}>{log.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Paramètres Modal */}
      {isSettingsOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <form onSubmit={handleSaveSettings} style={{ background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '420px', width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#153f2b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} /> Paramètres des médias
              </h3>
              <button type="button" onClick={() => setIsSettingsOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b5f4f' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#6b7d53', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Qualité WebP ({settings.imageQuality}%)
                </label>
                <input
                  type="range" min={1} max={100}
                  value={settings.imageQuality}
                  onChange={(e) => setSettings((s) => ({ ...s, imageQuality: Number(e.target.value) }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#6b7d53', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Taille max images (Mo)
                  </label>
                  <input
                    type="number" min={1}
                    value={settings.maxImageSizeMB}
                    onChange={(e) => setSettings((s) => ({ ...s, maxImageSizeMB: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #eadfca', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#6b7d53', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Taille max vidéos (Mo)
                  </label>
                  <input
                    type="number" min={1}
                    value={settings.maxVideoSizeMB}
                    onChange={(e) => setSettings((s) => ({ ...s, maxVideoSizeMB: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #eadfca', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#6b7d53', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Types d'images acceptés
                </label>
                <input
                  type="text"
                  value={settings.allowedImageTypes}
                  onChange={(e) => setSettings((s) => ({ ...s, allowedImageTypes: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #eadfca', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#6b7d53', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Types de vidéos acceptés
                </label>
                <input
                  type="text"
                  value={settings.allowedVideoTypes}
                  onChange={(e) => setSettings((s) => ({ ...s, allowedVideoTypes: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #eadfca', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '22px' }}>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', border: '1px solid #d5cfc0', background: '#fff', color: '#2a1f0e', cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={savingSettings}
                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', border: 'none', background: '#153f2b', color: '#fff', cursor: 'pointer' }}
              >
                {savingSettings ? '...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div>
          <h1 style={{
            fontSize: '24px', fontWeight: 700, color: '#2a1f0e',
            fontFamily: 'var(--font-cormorant, serif)', marginBottom: '6px',
          }}>
            Photos du site
          </h1>
          <p style={{ color: '#6b7d53', fontSize: '14px' }}>
            Gérez les images et vidéos affichées sur le site public.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setIsHistoryOpen(true); loadHistoryLogs() }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
              border: '1px solid #eadfca', background: '#fff', color: '#2a1f0e', cursor: 'pointer',
            }}
          >
            <Clock size={14} color="#c9a052" /> Historique
          </button>

          <Link
            href="/admin/photos-site/corbeille"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
              border: '1px solid #eadfca', background: '#fff', color: '#2a1f0e', cursor: 'pointer',
            }}
          >
            <Trash2 size={14} color="#dc2626" /> Corbeille
            {trashCount > 0 && (
              <span style={{
                minWidth: '18px', height: '18px', padding: '0 5px', borderRadius: '999px',
                background: '#dc2626', color: '#fff', fontSize: '10px', fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {trashCount}
              </span>
            )}
          </Link>

          <button
            onClick={() => setIsSettingsOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px', borderRadius: '10px',
              border: '1px solid #eadfca', background: '#fff', color: '#6b5f4f', cursor: 'pointer',
            }}
            title="Paramètres"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#fff', borderRadius: '10px', padding: '4px', border: '1px solid #ede8de' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: '8px', fontSize: '13px',
              fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: activeTab === tab.key ? '#153f2b' : 'transparent',
              color: activeTab === tab.key ? '#FBF6EC' : '#6b5f4f',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Slots Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9b8f7a' }}>Chargement...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {slots.map((slot) => {
            const m = getMedia(slot.key)
            const progress = uploadProgress[slot.key]
            const isUploading = progress !== undefined
            return (
              <SlotCard
                key={slot.key}
                slot={slot}
                media={m}
                isUploading={isUploading}
                progress={progress || 0}
                onUpload={(file, alt) => handleUpload(slot, file, alt)}
                onDelete={() => setDeleteConfirm(slot.key)}
              />
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

// ── Slot Card Component ──
interface SlotCardProps {
  slot: MediaSlot
  media?: SiteMedia
  isUploading: boolean
  progress: number
  onUpload: (file: File, alt: string) => void
  onDelete: () => void
}

function SlotCard({ slot, media, isUploading, progress, onUpload, onDelete }: SlotCardProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [altDraft, setAltDraft] = useState(media?.alt || '')

  useEffect(() => { setAltDraft(media?.alt || '') }, [media?.alt])

  const handleFile = (file: File) => {
    onUpload(file, altDraft)
  }

  return (
    <div style={{
      background: '#fff', borderRadius: '14px', border: '1px solid #ede8de',
      overflow: 'hidden', boxShadow: '0 2px 8px rgba(42,31,14,0.05)',
    }}>
      {/* Preview Area */}
      <div
        style={{
          position: 'relative', width: '100%', aspectRatio: '16/10',
          background: '#FBF6EC', display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid #ede8de',
          outline: dragOver ? '2px dashed #c9a052' : 'none',
          outlineOffset: '-4px',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        {isUploading ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '160px', height: '6px', borderRadius: '3px', background: '#ede8de', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${progress}%`, background: '#c9a052',
                borderRadius: '3px', transition: 'width 0.3s',
              }} />
            </div>
            <p style={{ fontSize: '11px', color: '#6b5f4f', marginTop: '8px' }}>Upload en cours...</p>
          </div>
        ) : media ? (
          media.type === 'VIDEO' ? (
            <video
              src={media.url}
              muted
              loop
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.url}
              alt={media.alt || slot.label}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Upload size={28} color="#c9a052" strokeWidth={1.5} style={{ opacity: 0.6 }} />
            <p style={{ fontSize: '12px', color: '#9b8f7a', marginTop: '8px' }}>
              Glissez un fichier ou cliquez pour parcourir
            </p>
          </div>
        )}

        {/* Click to upload overlay (when no media or replacing) */}
        {!isUploading && (
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              position: 'absolute', inset: 0, cursor: 'pointer',
              background: 'transparent', border: 'none',
              opacity: 0,
            }}
            title="Cliquer pour uploader"
          />
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#2a1f0e', marginBottom: '4px' }}>
          {slot.label}
        </h3>
        <p style={{ fontSize: '11px', color: '#9b8f7a', marginBottom: '10px' }}>
          Recommandé : {slot.recommended} {slot.acceptVideo && '• Vidéo acceptée'}
        </p>

        <input
          type="text"
          value={altDraft}
          onChange={(e) => setAltDraft(e.target.value)}
          placeholder="Texte alternatif (accessibilité / SEO)"
          style={{
            width: '100%', padding: '6px 10px', borderRadius: '7px', fontSize: '11px',
            border: '1px solid #eadfca', marginBottom: '8px', color: '#2a1f0e',
          }}
        />

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              flex: 1, padding: '7px 12px', borderRadius: '7px', fontSize: '12px',
              fontWeight: 600, border: '1px solid #c9a052', cursor: 'pointer',
              background: '#FBF6EC', color: '#c9a052',
            }}
          >
            {media ? 'Remplacer' : 'Uploader'}
          </button>
          {media && (
            <button
              onClick={onDelete}
              style={{
                padding: '7px 10px', borderRadius: '7px', fontSize: '12px',
                border: '1px solid #fca5a5', cursor: 'pointer',
                background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
