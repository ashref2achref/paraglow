'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  User,
  Mail,
  Phone,
  Tag,
  Pencil,
  Send,
  Lock
} from 'lucide-react'

interface ContactFormProps {
  locale: string
  translations: {
    title: string
    subtitle: string
    namePlaceholder: string
    emailPlaceholder: string
    phonePlaceholder: string
    subjectPlaceholder: string
    messagePlaceholder: string
    submitBtn: string
    submitting: string
    securityLabel: string
    errors: {
      nameRequired: string
      emailRequired: string
      emailInvalid: string
      messageRequired: string
    }
    successToast: string
    errorToast?: string
  }
}

export default function ContactForm({ locale, translations }: ContactFormProps) {
  const isRTL = locale === 'ar'

  // Form states
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = translations.errors.nameRequired
    if (!formData.email.trim()) {
      newErrors.email = translations.errors.emailRequired
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = translations.errors.emailInvalid
    }
    if (!formData.message.trim()) newErrors.message = translations.errors.messageRequired

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast.success(translations.successToast)
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || translations.errorToast || 'Error sending message')
      }
    } catch {
      toast.error(translations.errorToast || 'Error sending message')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-8 lg:p-10 rounded-2xl border border-[#c9a052]/15 shadow-xs flex flex-col">
      <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#153f2b] leading-tight mb-2">
        {translations.title}
      </h2>
      <p className="text-xs sm:text-sm text-[#153f2b]/70 font-sans mb-8">
        {translations.subtitle}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Name & Email inputs in 2 columns on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <div className="relative w-full">
              <User className={cn("absolute top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#153f2b]/40 pointer-events-none", isRTL ? "right-4" : "left-4")} strokeWidth={1.5} />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={translations.namePlaceholder}
                className={cn(
                  "w-full py-3 rounded-xl border border-[#c9a052]/20 bg-white font-sans text-sm text-[#153f2b] placeholder-[#153f2b]/40 focus:outline-none focus:ring-1 focus:ring-[#c9a052] transition-all",
                  isRTL ? "pr-11 pl-4" : "pl-11 pr-4"
                )}
              />
            </div>
            {errors.name && (
              <span className="text-[11px] font-semibold text-amber-700/80 px-2 font-sans">
                {errors.name}
              </span>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <div className="relative w-full">
              <Mail className={cn("absolute top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#153f2b]/40 pointer-events-none", isRTL ? "right-4" : "left-4")} strokeWidth={1.5} />
              <input
                type="text"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder={translations.emailPlaceholder}
                className={cn(
                  "w-full py-3 rounded-xl border border-[#c9a052]/20 bg-white font-sans text-sm text-[#153f2b] placeholder-[#153f2b]/40 focus:outline-none focus:ring-1 focus:ring-[#c9a052] transition-all",
                  isRTL ? "pr-11 pl-4" : "pl-11 pr-4"
                )}
              />
            </div>
            {errors.email && (
              <span className="text-[11px] font-semibold text-amber-700/80 px-2 font-sans">
                {errors.email}
              </span>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="relative w-full">
          <Phone className={cn("absolute top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#153f2b]/40 pointer-events-none", isRTL ? "right-4" : "left-4")} strokeWidth={1.5} />
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder={translations.phonePlaceholder}
            className={cn(
              "w-full py-3 rounded-xl border border-[#c9a052]/20 bg-white font-sans text-sm text-[#153f2b] placeholder-[#153f2b]/40 focus:outline-none focus:ring-1 focus:ring-[#c9a052] transition-all",
              isRTL ? "pr-11 pl-4" : "pl-11 pr-4"
            )}
          />
        </div>

        {/* Subject */}
        <div className="relative w-full">
          <Tag className={cn("absolute top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#153f2b]/40 pointer-events-none", isRTL ? "right-4" : "left-4")} strokeWidth={1.5} />
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            placeholder={translations.subjectPlaceholder}
            className={cn(
              "w-full py-3 rounded-xl border border-[#c9a052]/20 bg-white font-sans text-sm text-[#153f2b] placeholder-[#153f2b]/40 focus:outline-none focus:ring-1 focus:ring-[#c9a052] transition-all",
              isRTL ? "pr-11 pl-4" : "pl-11 pr-4"
            )}
          />
        </div>

        {/* Message */}
        <div className="flex flex-col gap-1.5">
          <div className="relative w-full">
            <Pencil className={cn("absolute top-5 w-4.5 h-4.5 text-[#153f2b]/40 pointer-events-none", isRTL ? "right-4" : "left-4")} strokeWidth={1.5} />
            <textarea
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows={5}
              placeholder={translations.messagePlaceholder}
              className={cn(
                "w-full py-3 rounded-xl border border-[#c9a052]/20 bg-white font-sans text-sm text-[#153f2b] placeholder-[#153f2b]/40 focus:outline-none focus:ring-1 focus:ring-[#c9a052] transition-all resize-none",
                isRTL ? "pr-11 pl-4" : "pl-11 pr-4"
              )}
            />
          </div>
          {errors.message && (
            <span className="text-[11px] font-semibold text-amber-700/80 px-2 font-sans">
              {errors.message}
            </span>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-[#153f2b] hover:bg-[#c9a052] text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
        >
          <Send className={cn("w-4 h-4", loading ? "animate-spin" : "")} />
          {loading ? translations.submitting : translations.submitBtn}
        </button>

        {/* Confidentiality notice */}
        <div className="flex items-center justify-center gap-2 text-xs text-[#153f2b]/60 mt-2">
          <Lock className="w-3.5 h-3.5" />
          <span>{translations.securityLabel}</span>
        </div>
      </form>
    </div>
  )
}
