import { z } from 'zod'

// 1. Contact Form Schema
export const contactSchema = z.object({
  name: z.string().min(2, "Le nom doit comporter au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  phone: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  message: z.string().min(5, "Le message doit comporter au moins 5 caractères")
})

// 2. Public Order Creation Schema
export const createOrderSchema = z.object({
  guestName: z.string().min(2, "Le nom doit comporter au moins 2 caractères"),
  guestPhone: z.string().min(8, "Le numéro de téléphone doit comporter au moins 8 chiffres").max(15),
  guestEmail: z.string().email("Email invalide").optional().nullable().or(z.literal('')),
  address: z.string().min(5, "L'adresse de livraison est requise"),
  wilaya: z.string().min(1, "La wilaya est requise"),
  notes: z.string().optional().nullable(),
  promoCode: z.string().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string().min(1, "ID produit requis"),
      quantity: z.number().int().positive("La quantité doit être supérieure à 0")
    })
  ).min(1, "Le panier ne doit pas être vide")
})

// 3. Admin Customer Schema
export const adminCustomerSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().optional().nullable(),
  phone: z.string().min(8, "Téléphone requis (min 8 chiffres)"),
  email: z.string().email("Email invalide").optional().nullable().or(z.literal('')),
  adresse: z.string().optional().nullable(),
  wilaya: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  partnerId: z.string().optional().nullable()
})

// 4. Admin Promo Code Schema
export const adminPromoSchema = z.object({
  code: z.string().min(1, "Le code promo est requis").transform(val => val.trim().toUpperCase()),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']).default('PERCENTAGE'),
  value: z.number().nonnegative("La valeur doit être positive"),
  minOrder: z.number().nonnegative("Le montant minimum doit être positif").optional().nullable(),
  maxUses: z.number().int().positive("Le nombre max d'utilisations doit être supérieur à 0").optional().nullable(),
  maxUsesPerClient: z.number().int().positive("Le nombre max d'utilisations par client doit être supérieur à 0").optional().nullable(),
  applicableCategories: z.string().optional().nullable(),
  applicableProducts: z.string().optional().nullable(),
  startDate: z.string().optional().nullable().or(z.date().optional().nullable()),
  endDate: z.string().optional().nullable().or(z.date().optional().nullable()),
  isActive: z.boolean().default(true)
})

// 5. Admin Product Schema
export const adminProductSchema = z.object({
  code: z.string().min(1, "Le code est requis").transform(val => val.trim()),
  barcode: z.string().optional().nullable(),
  name: z.string().min(1, "La désignation est requise").transform(val => val.trim()),
  nameAr: z.string().optional().nullable(),
  nameEn: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  purchasePriceHT: z.union([z.number(), z.string()]).transform(val => Number(val) || 0),
  margin: z.union([z.number(), z.string()]).transform(val => Number(val) || 0).refine(val => val >= -100 && val <= 1000, "La marge doit être entre -100% et 1000%"),
  tva: z.union([z.number(), z.string()]).transform(val => Number(val) || 19).refine(val => val >= 0 && val <= 100, "La TVA doit être entre 0% et 100%"),
  sellingPriceTTC: z.union([z.number(), z.string()]).transform(val => Number(val) || 0),
  sellingPriceHT: z.union([z.number(), z.string()]).transform(val => Number(val) || 0),
  publicPrice: z.union([z.number(), z.string()]).optional().nullable().transform(val => val ? Number(val) : null),
  stock: z.union([z.number(), z.string()]).transform(val => Number(val) || 0),
  stockMin: z.union([z.number(), z.string()]).transform(val => Number(val) || 5),
  loyaltyPoints: z.union([z.number(), z.string()]).transform(val => Number(val) || 0),
  imageUrl: z.string().optional().nullable(),
  images: z.any().optional().nullable(),
  remiseType: z.enum(['AUCUNE', 'POURCENTAGE', 'PRIX_FIXE']).default('AUCUNE'),
  remiseValeur: z.union([z.number(), z.string()]).optional().nullable().transform(val => val ? Number(val) : null),
  remiseVisible: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isOnSale: z.boolean().default(false)
})
