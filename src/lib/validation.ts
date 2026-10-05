import { z } from 'zod'
import { TUNISIAN_GOVERNORATES } from './governorates'

const GOVERNORATE_IDS = new Set(TUNISIAN_GOVERNORATES.map((governorate) => governorate.id))

function numberInput(defaultValue: number, schema: z.ZodNumber = z.number()) {
  return z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return defaultValue
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : value
  }, schema)
}

const nullableNumberInput = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : value
}, z.number().nullable())

// 1. Contact Form Schema
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit comporter au moins 2 caractères").max(120, "Le nom est trop long"),
  email: z.string().trim().email("Adresse email invalide").max(254, "Adresse email trop longue"),
  phone: z.string().trim().max(20, "Téléphone trop long").optional().nullable(),
  subject: z.string().trim().max(160, "Sujet trop long").optional().nullable(),
  message: z.string().trim().min(5, "Le message doit comporter au moins 5 caractères").max(4000, "Le message est trop long")
})

// 2. Public Order Creation Schema
export const createOrderSchema = z.object({
  guestName: z.string().trim().min(2, "Le nom doit comporter au moins 2 caractères").max(120, "Le nom est trop long"),
  guestPhone: z.string().trim().min(8, "Le numéro de téléphone doit comporter au moins 8 chiffres").max(15),
  guestEmail: z.string().trim().email("Email invalide").max(254, "Email trop long").optional().nullable().or(z.literal('')),
  address: z.string().trim().min(5, "L'adresse de livraison est requise").max(500, "Adresse trop longue"),
  wilaya: z.string().trim().refine((value) => GOVERNORATE_IDS.has(value), "Wilaya invalide"),
  notes: z.string().trim().max(1000, "Notes trop longues").optional().nullable(),
  promoCode: z.string().trim().max(64, "Code promo trop long").optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string().trim().min(1, "ID produit requis").max(128, "ID produit invalide"),
      quantity: z.number().int().positive("La quantité doit être supérieure à 0").max(999, "Quantité trop élevée")
    })
  ).min(1, "Le panier ne doit pas être vide").max(100, "Trop de lignes dans le panier")
})

// 3. Admin Customer Schema
export const adminCustomerSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis").max(120, "Nom trop long"),
  prenom: z.string().trim().max(120, "Prénom trop long").optional().nullable(),
  phone: z.string().trim().min(8, "Téléphone requis (min 8 chiffres)").max(20, "Téléphone trop long"),
  email: z.string().trim().email("Email invalide").max(254, "Email trop long").optional().nullable().or(z.literal('')),
  adresse: z.string().trim().max(500, "Adresse trop longue").optional().nullable(),
  wilaya: z.string().trim().refine((value) => !value || GOVERNORATE_IDS.has(value), "Wilaya invalide").optional().nullable(),
  notes: z.string().trim().max(2000, "Notes trop longues").optional().nullable(),
  partnerId: z.string().trim().max(128, "Partenaire invalide").optional().nullable()
})

// 4. Admin Promo Code Schema
export const adminPromoSchema = z.object({
  code: z.string().trim().min(1, "Le code promo est requis").max(64, "Code promo trop long").transform((value) => value.toUpperCase()),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']).default('PERCENTAGE'),
  value: z.number().nonnegative("La valeur doit être positive"),
  minOrder: z.number().nonnegative("Le montant minimum doit être positif").optional().nullable(),
  maxUses: z.number().int().positive("Le nombre max d'utilisations doit être supérieur à 0").optional().nullable(),
  maxUsesPerClient: z.number().int().positive("Le nombre max d'utilisations par client doit être supérieur à 0").optional().nullable(),
  applicableCategories: z.string().max(10000, "Liste de catégories trop longue").optional().nullable(),
  applicableProducts: z.string().max(20000, "Liste de produits trop longue").optional().nullable(),
  startDate: z.string().optional().nullable().or(z.date().optional().nullable()),
  endDate: z.string().optional().nullable().or(z.date().optional().nullable()),
  isActive: z.boolean().default(true)
}).superRefine((value, ctx) => {
  if (value.type === 'PERCENTAGE' && value.value > 100) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Le pourcentage ne peut pas dépasser 100%' })
  }

  if (value.startDate && value.endDate) {
    const start = new Date(value.startDate)
    const end = new Date(value.endDate)
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'La date de fin doit être postérieure à la date de début' })
    }
  }
})

// 5. Admin Product Schema
export const adminProductSchema = z.object({
  code: z.string().trim().min(1, "Le code est requis").max(80, "Code produit trop long"),
  barcode: z.string().trim().max(80, "Code-barres trop long").optional().nullable(),
  name: z.string().trim().min(1, "La désignation est requise").max(240, "Désignation trop longue"),
  nameAr: z.string().trim().max(240, "Nom arabe trop long").optional().nullable(),
  nameEn: z.string().trim().max(240, "Nom anglais trop long").optional().nullable(),
  slug: z.string().trim().max(300, "Slug trop long").optional().nullable(),
  categoryId: z.string().trim().max(128, "Catégorie invalide").optional().nullable(),
  brandId: z.string().trim().max(128, "Marque invalide").optional().nullable(),
  description: z.string().trim().max(10000, "Description trop longue").optional().nullable(),
  descriptionAr: z.string().trim().max(10000, "Description arabe trop longue").optional().nullable(),
  descriptionEn: z.string().trim().max(10000, "Description anglaise trop longue").optional().nullable(),
  purchasePriceHT: numberInput(0, z.number().nonnegative("Le prix d'achat ne peut pas être négatif")),
  margin: numberInput(0).refine(val => val >= -100 && val <= 1000, "La marge doit être entre -100% et 1000%"),
  tva: numberInput(19).refine(val => val >= 0 && val <= 100, "La TVA doit être entre 0% et 100%"),
  sellingPriceTTC: numberInput(0, z.number().nonnegative("Le prix de vente TTC ne peut pas être négatif")),
  sellingPriceHT: numberInput(0, z.number().nonnegative("Le prix de vente HT ne peut pas être négatif")),
  publicPrice: nullableNumberInput.refine(val => val === null || val >= 0, "Le prix public ne peut pas être négatif"),
  stock: numberInput(0, z.number().int("Le stock doit être un nombre entier").nonnegative("Le stock ne peut pas être négatif")),
  stockMin: numberInput(5, z.number().int("Le stock minimum doit être un nombre entier").nonnegative("Le stock minimum ne peut pas être négatif")),
  loyaltyPoints: numberInput(0, z.number().int("Les points fidélité doivent être entiers").nonnegative("Les points fidélité ne peuvent pas être négatifs")),
  imageUrl: z.string().optional().nullable(),
  images: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  remiseType: z.enum(['AUCUNE', 'POURCENTAGE', 'PRIX_FIXE']).default('AUCUNE'),
  remiseValeur: nullableNumberInput.refine(val => val === null || val >= 0, "La remise ne peut pas être négative"),
  remiseVisible: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isOnSale: z.boolean().default(false)
}).superRefine((value, ctx) => {
  if (value.remiseType === 'POURCENTAGE' && (value.remiseValeur ?? 0) > 100) {
    ctx.addIssue({ code: 'custom', path: ['remiseValeur'], message: 'La remise en pourcentage ne peut pas dépasser 100%' })
  }
  if (
    value.remiseType === 'PRIX_FIXE' &&
    value.remiseValeur !== null &&
    value.remiseValeur !== undefined &&
    value.sellingPriceTTC > 0 &&
    value.remiseValeur > value.sellingPriceTTC
  ) {
    ctx.addIssue({ code: 'custom', path: ['remiseValeur'], message: 'Le prix promotionnel ne peut pas dépasser le prix TTC' })
  }
})
