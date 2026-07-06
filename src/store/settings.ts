import { create } from 'zustand'
import { contactConfig } from '@/config/contact'

export interface PublicSettings {
  boutique: {
    name: string
    slogan: string
    email: string
    phoneWhatsApp: string
    phoneFixed: string
    address: string
    addressAr: string
    hours: string
    instagram: string
    tiktok: string
    facebook: string
    googleMapsUrl: string
  }
  livraison: {
    defaultDeliveryFee: number
    freeDeliveryThreshold: number
    deliveryNotes: string
    livraisonGratuiteActive: boolean
  }
  marketing: {
    enableCheckoutPromo: boolean
  }
  maintenance: boolean
}

// Fallback matching contactConfig exactly
export const fallbackSettings: PublicSettings = {
  boutique: {
    name: "ParaGlow",
    slogan: "Votre beauté, votre santé, votre glow.",
    email: contactConfig.email,
    phoneWhatsApp: contactConfig.phones[0].display,
    phoneFixed: contactConfig.phones[1].display,
    address: contactConfig.address,
    addressAr: contactConfig.addressAr,
    hours: contactConfig.hours,
    instagram: contactConfig.socials.instagram,
    tiktok: contactConfig.socials.tiktok,
    facebook: contactConfig.socials.facebook,
    googleMapsUrl: contactConfig.googleMapsUrl
  },
  livraison: {
    defaultDeliveryFee: 7.0,
    freeDeliveryThreshold: 0.0,
    deliveryNotes: "partout en Tunisie",
    livraisonGratuiteActive: false
  },
  marketing: {
    enableCheckoutPromo: true
  },
  maintenance: false
}

interface SettingsState {
  settings: PublicSettings
  loading: boolean
  isHydrated: boolean
  setSettings: (settings: PublicSettings) => void
  fetchSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: fallbackSettings,
  loading: true,
  isHydrated: false,
  setSettings: (settings) => set({ settings, isHydrated: true, loading: false }),
  fetchSettings: async () => {
    try {
      const res = await fetch('/api/settings/public')
      if (res.ok) {
        const data = await res.json()
        if (data && data.settings) {
          set({ settings: data.settings, isHydrated: true, loading: false })
          return
        }
      }
    } catch (e) {
      console.error('Failed to fetch public settings:', e)
    }
    set({ loading: false })
  }
}))
