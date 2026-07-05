'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Mail,
  MailOpen,
  Phone,
  Tag,
  Clock,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'

interface ContactMessage {
  id: string
  nom: string
  email: string
  telephone?: string | null
  sujet?: string | null
  message: string
  isRead: boolean
  createdAt: string
}

type StatusFilter = 'all' | 'unread' | 'read'

export default function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)

  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams({ page: String(page), limit: '20', status })
      const res = await fetch(`/api/admin/messages?${q.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setMessages(data.messages || [])
        setTotalPages(data.totalPages || 1)
        setTotalCount(data.total || 0)
        setUnreadCount(data.unreadCount || 0)
      }
    } catch {
      toast.error('Erreur lors du chargement des messages')
    } finally {
      setLoading(false)
    }
  }, [page, status])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  const toggleRead = async (message: ContactMessage, isRead: boolean) => {
    try {
      const res = await fetch(`/api/admin/messages/${message.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead }),
      })
      if (res.ok) {
        setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, isRead } : m)))
        setUnreadCount((c) => Math.max(0, c + (isRead ? -1 : 1)))
        setSelectedMessage((prev) => (prev && prev.id === message.id ? { ...prev, isRead } : prev))
      } else {
        toast.error('Erreur lors de la mise à jour')
      }
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const openMessage = (message: ContactMessage) => {
    setSelectedMessage(message)
    setIsDetailOpen(true)
    if (!message.isRead) toggleRead(message, true)
  }

  const getMailtoLink = (message: ContactMessage) => {
    const subject = encodeURIComponent(`Re: ${message.sujet || 'Votre message sur ParaGlow'}`)
    const body = encodeURIComponent(`Bonjour ${message.nom},\n\n`)
    return `mailto:${message.email}?subject=${subject}&body=${body}`
  }

  const getWhatsAppLink = (message: ContactMessage) => {
    if (!message.telephone) return null
    const digits = message.telephone.replace(/[^0-9]/g, '')
    const formattedPhone = digits.startsWith('216') ? digits : `216${digits}`
    const text = encodeURIComponent(`Bonjour ${message.nom}, nous vous contactons suite à votre message sur ParaGlow.`)
    return `https://wa.me/${formattedPhone}?text=${text}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="w-full min-h-screen text-[#2a1f0e] font-sans pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-[#eadfca]/60 pb-5">
        <div className="text-left">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-bold text-[#153f2b]">Messages</h1>
            <span className="px-2.5 py-0.5 bg-[#153f2b]/10 text-[#153f2b] rounded-full text-xs font-bold font-mono">
              {totalCount}
            </span>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs font-bold font-mono">
                {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-[#6b5f4f]/80 mt-1">Messages soumis via le formulaire de contact du site public.</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-[#eadfca]/60 pb-1.5 mb-6">
        {[
          { key: 'all' as const, label: 'Tous' },
          { key: 'unread' as const, label: 'Non lus' },
          { key: 'read' as const, label: 'Lus' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatus(tab.key); setPage(1) }}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              status === tab.key ? 'bg-[#153f2b] text-white' : 'text-[#6b5f4f] hover:bg-[#FBF6EC]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Messages list */}
      <div className="bg-white border border-[#eadfca] rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-4 border-[#153f2b] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#9b8f7a] mt-3">Chargement des messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-20 text-center font-sans text-xs">
            <Mail className="w-12 h-12 text-[#c9a052]/30 mx-auto mb-3" strokeWidth={1.5} />
            <p className="font-bold text-[#153f2b]">Aucun message trouvé</p>
            <p className="text-[#6b5f4f]/80 mt-1">Les messages du formulaire de contact apparaîtront ici.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#eadfca]/40">
            {messages.map((m) => (
              <button
                key={m.id}
                onClick={() => openMessage(m)}
                className={`w-full text-left p-4 flex items-start gap-3 hover:bg-[#FBF6EC]/25 transition-colors cursor-pointer border-none ${
                  !m.isRead ? 'bg-[#FBF6EC]/40' : 'bg-white'
                }`}
              >
                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  !m.isRead ? 'bg-rose-100 text-rose-600' : 'bg-[#FBF6EC] text-[#9b8f7a]'
                }`}>
                  {m.isRead ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm ${!m.isRead ? 'font-bold text-[#153f2b]' : 'font-semibold text-[#2a1f0e]'}`}>
                      {m.nom}
                    </span>
                    <span className="text-[10px] text-[#9b8f7a] font-mono whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDate(m.createdAt)}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#6b5f4f] font-mono">{m.email}</div>
                  {m.sujet && (
                    <div className="text-[11px] text-[#c9a052] font-semibold mt-0.5 flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {m.sujet}
                    </div>
                  )}
                  <p className="text-xs text-[#6b5f4f]/80 mt-1 line-clamp-1">{m.message}</p>
                </div>
                {!m.isRead && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#eadfca] p-4 text-xs text-[#6b5f4f]">
            <span>Page {page} sur {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 border border-[#eadfca] rounded-lg bg-white hover:bg-[#FBF6EC] disabled:opacity-50 cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Précédent
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 border border-[#eadfca] rounded-lg bg-white hover:bg-[#FBF6EC] disabled:opacity-50 cursor-pointer flex items-center gap-1"
              >
                Suivant <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedMessage?.nom || 'Message'}
        icon={<Mail className="w-5 h-5" />}
        size="md"
      >
        {selectedMessage && (
          <div className="space-y-4 text-xs text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-[#9b8f7a] block">Email</span>
                <span className="font-bold text-[#153f2b] font-mono">{selectedMessage.email}</span>
              </div>
              {selectedMessage.telephone && (
                <div>
                  <span className="text-[10px] text-[#9b8f7a] block">Téléphone</span>
                  <span className="font-bold text-[#153f2b] font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#c9a052]" /> {selectedMessage.telephone}
                  </span>
                </div>
              )}
            </div>

            {selectedMessage.sujet && (
              <div>
                <span className="text-[10px] text-[#9b8f7a] block">Sujet</span>
                <span className="font-semibold text-[#153f2b]">{selectedMessage.sujet}</span>
              </div>
            )}

            <div>
              <span className="text-[10px] text-[#9b8f7a] block mb-1">Message</span>
              <p className="p-3 bg-[#faf8f5] border border-[#eadfca] rounded-xl text-[#2a1f0e] leading-relaxed whitespace-pre-wrap">
                {selectedMessage.message}
              </p>
            </div>

            <div className="text-[10px] text-[#9b8f7a] flex items-center gap-1">
              <Clock className="w-3 h-3" /> Reçu le {formatDate(selectedMessage.createdAt)}
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-[#eadfca]">
              <a
                href={getMailtoLink(selectedMessage)}
                className="flex-1 min-w-[140px] py-2.5 bg-[#153f2b] hover:bg-[#c9a052] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> Répondre par email
              </a>

              {getWhatsAppLink(selectedMessage) && (
                <a
                  href={getWhatsAppLink(selectedMessage)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-[140px] py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              )}

              <button
                onClick={() => toggleRead(selectedMessage, !selectedMessage.isRead)}
                className="flex-1 min-w-[140px] py-2.5 border border-[#eadfca] text-[#2a1f0e] hover:bg-[#FBF6EC] text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {selectedMessage.isRead ? <Mail className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5" />}
                {selectedMessage.isRead ? 'Marquer non lu' : 'Marquer lu'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
