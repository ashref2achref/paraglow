import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest) {
  return await checkAdminAuth(request)
}

function addObjectSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  rows: Record<string, string | number | boolean>[]
) {
  const worksheet = workbook.addWorksheet(name)
  const keys = rows[0] ? Object.keys(rows[0]) : []
  worksheet.columns = keys.map((key) => ({ header: key, key, width: Math.min(40, Math.max(12, key.length + 3)) }))
  if (rows.length > 0) worksheet.addRows(rows)
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  worksheet.getRow(1).font = { bold: true }
}

export async function GET(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  try {
    const products = await prisma.product.findMany({
      where: { supprime: false },
      include: { category: true, brand: true },
    })
    const productRows = products.map((product) => ({
      ID: product.id,
      Code: product.code,
      CodeBarre: product.barcode || '',
      Nom: product.name,
      NomAr: product.nameAr || '',
      NomEn: product.nameEn || '',
      Categorie: product.category?.name || '',
      Marque: product.brand?.name || '',
      PrixAchatHT: product.purchasePriceHT,
      PrixVenteTTC: product.sellingPriceTTC,
      Marge: product.margin,
      TVA: product.tva,
      Stock: product.stock,
      StockMin: product.stockMin,
      RemiseType: product.remiseType,
      RemiseValeur: product.remiseValeur || 0,
      RemiseVisible: product.remiseVisible ? 'Oui' : 'Non',
      Actif: product.isActive ? 'Oui' : 'Non',
    }))

    const orders = await prisma.order.findMany({
      where: { supprime: false },
      include: { client: true },
    })
    const orderRows = orders.map((order) => ({
      ID: order.id,
      NumeroCommande: order.orderNumber,
      Client: order.client ? `${order.client.prenom} ${order.client.nom}` : order.guestName || 'Glow Client',
      Telephone: order.guestPhone || order.client?.phone || '',
      Email: order.guestEmail || order.client?.email || '',
      Statut: order.status,
      MethodePaiement: order.paymentMethod,
      StatutPaiement: order.paymentStatus,
      FraisLivraison: order.deliveryFee,
      AdresseLivraison: order.deliveryAddress || order.client?.adresse || '',
      SousTotal: order.subtotal,
      Discount: order.discount,
      Total: order.total,
      Source: order.source,
      DateCreation: order.createdAt.toISOString(),
    }))

    const clients = await prisma.client.findMany({
      where: { supprime: false },
      include: { partner: true },
    })
    const clientRows = clients.map((client) => ({
      ID: client.id,
      Prenom: client.prenom,
      Nom: client.nom,
      Telephone: client.phone,
      Email: client.email || '',
      Adresse: client.adresse || '',
      SocieteConvention: client.partner?.name || 'Aucune',
      DateCreation: client.createdAt.toISOString(),
    }))

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'ParaGlow'
    workbook.created = new Date()

    addObjectSheet(workbook, 'Produits', productRows)
    addObjectSheet(workbook, 'Commandes', orderRows)
    addObjectSheet(workbook, 'Clients', clientRows)

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="paraglow_data_export.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Export settings error:', error)
    return new NextResponse('Erreur lors de l’exportation des données', { status: 500 })
  }
}
