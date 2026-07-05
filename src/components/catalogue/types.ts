// Shared catalogue/search product types.
// Reused by CatalogueClient and SearchClient so the product grid stays
// identical across the catalogue and search results pages.

export interface Product {
  id: string
  code: string
  slug: string
  name: string
  description?: string
  sellingPriceTTC: number
  originalPrice?: number
  remiseType?: string
  remiseValeur?: number | null
  remiseVisible?: boolean
  stock: number
  images: string // JSON string
  isBestSeller: boolean
  isFeatured: boolean
  isNew: boolean
  rating: number
  reviewsCount: number
  category?: {
    name: string
    nameAr?: string | null
    nameEn?: string | null
    slug: string
  }
  brand?: {
    name: string
    slug: string
  }
}

export interface Category {
  id: string
  name: string
  nameAr?: string | null
  nameEn?: string | null
  slug: string
}

export interface Brand {
  id: string
  name: string
  slug: string
  _count?: {
    products: number
  }
}
