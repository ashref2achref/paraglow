import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

function checkAuth(request: NextRequest) {
  return checkAdminAuth(request)
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  try {
    // 1. Fetch Products
    const products = await prisma.product.findMany({
      where: { supprime: false },
      include: { category: true, brand: true }
    })
    const productRows = products.map(p => ({
      ID: p.id,
      Code: p.code,
      CodeBarre: p.barcode || '',
      Nom: p.name,
      NomAr: p.nameAr || '',
      NomEn: p.nameEn || '',
      Categorie: p.category?.name || '',
      Marque: p.brand?.name || '',
      PrixAchatHT: p.purchasePriceHT,
      PrixVenteTTC: p.sellingPriceTTC,
      Marge: p.margin,
      TVA: p.tva,
      Stock: p.stock,
      StockMin: p.stockMin,
      RemiseType: p.remiseType,
      RemiseValeur: p.remiseValeur || 0,
      RemiseVisible: p.remiseVisible ? 'Oui' : 'Non',
      Actif: p.isActive ? 'Oui' : 'Non'
    }))

    // 2. Fetch Orders
    const orders = await prisma.order.findMany({
      where: { supprime: false },
      include: { client: true }
    })
    const orderRows = orders.map(o => ({
      ID: o.id,
      NumeroCommande: o.orderNumber,
      Client: o.client ? `${o.client.prenom} ${o.client.nom}` : o.guestName || 'Glow Client',
      Telephone: o.guestPhone || o.client?.phone || '',
      Email: o.guestEmail || o.client?.email || '',
      Statut: o.status,
      MethodePaiement: o.paymentMethod,
      StatutPaiement: o.paymentStatus,
      FraisLivraison: o.deliveryFee,
      SousTotal: o.subtotal,
      Discount: o.discount,
      Total: o.total,
      Source: o.source,
      DateCreation: o.createdAt.toISOString()
    }))

    // 3. Fetch Customers
    const clients = await prisma.client.findMany({
      include: { partner: true }
    })
    const clientRows = clients.map(c => ({
      ID: c.id,
      Prenom: c.prenom,
      Nom: c.nom,
      Telephone: c.phone,
      Email: c.email || '',
      Adresse: c.adresse || '',
      SocieteConvention: c.partner?.name || 'Aucune',
      DateCreation: c.createdAt.toISOString()
    }))

    // Create workbook and worksheets
    const wb = XLSX.utils.book_new()

    const wsProducts = XLSX.utils.json_to_sheet(productRows)
    const wsOrders = XLSX.utils.json_to_sheet(orderRows)
    const wsClients = XLSX.utils.json_to_sheet(clientRows)

    XLSX.utils.book_append_sheet(wb, wsProducts, 'Produits')
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Commandes')
    XLSX.utils.book_append_sheet(wb, wsClients, 'Clients')

    // Write buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Return response
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="paraglow_data_export.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    })
  } catch (error: any) {
    console.error('Export GET error:', error)
    return new NextResponse('Erreur lors de l\'exportation : ' + error.message, { status: 500 })
  }
}
