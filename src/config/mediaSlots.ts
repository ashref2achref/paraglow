export interface MediaSlot {
  key: string
  label: string
  page: 'home' | 'about' | 'contact'
  recommended: string
  acceptVideo?: boolean
}

export const MEDIA_SLOTS: MediaSlot[] = [
  // ── Accueil ──
  { key: 'home.hero', label: 'Image Hero — page d\'accueil', page: 'home', recommended: '1400×1000 paysage', acceptVideo: true },
  { key: 'home.univers.beaute', label: 'Univers Beauté', page: 'home', recommended: '600×800 portrait/carré' },
  { key: 'home.univers.sante', label: 'Univers Santé', page: 'home', recommended: '600×800 portrait/carré' },
  { key: 'home.univers.bebe', label: 'Univers Bébé & Maman', page: 'home', recommended: '600×800 portrait/carré' },
  { key: 'home.univers.hygiene', label: 'Univers Hygiène', page: 'home', recommended: '600×800 portrait/carré' },
  { key: 'home.univers.solaire', label: 'Univers Solaire', page: 'home', recommended: '600×800 portrait/carré' },
  { key: 'home.univers.complements', label: 'Univers Compléments', page: 'home', recommended: '600×800 portrait/carré' },
  // ── À propos ──
  { key: 'about.hero', label: 'Image Hero — À propos', page: 'about', recommended: '1200×900 paysage 4:3' },
  { key: 'about.equipe', label: 'Photo Équipe — À propos', page: 'about', recommended: '1200×900 paysage 4:3' },
  { key: 'about.pourquoi', label: 'Image Pourquoi nous — À propos', page: 'about', recommended: '1400×900 paysage' },
  // ── Contact ──
  { key: 'contact.decorative', label: 'Image décorative — Contact', page: 'contact', recommended: '1200×750 paysage 16:10' },
]

export const SLOTS_BY_PAGE = {
  home: MEDIA_SLOTS.filter((s) => s.page === 'home'),
  about: MEDIA_SLOTS.filter((s) => s.page === 'about'),
  contact: MEDIA_SLOTS.filter((s) => s.page === 'contact'),
}
