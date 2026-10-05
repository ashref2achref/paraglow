import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import {
  OrderValidationError,
  consumesPromoUsage,
  decrementPromoUsage,
  decrementStock,
  incrementPromoUsage,
  isStockReservedStatus,
} from '@/lib/orderPricing'
import type { OrderStatus, Prisma } from '@prisma/client'

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
]

export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest) {
  return await checkAdminAuth(request);}

// GET individual order details, client, items, tracking, and logs
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        items: true,
        tracking: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

    // Load logs for this order
    const logs = await prisma.orderLog.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ order, logs })
  } catch (error) {
    console.error('Admin order GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT: Update order fields (status, notes, confirmation status) and create logs
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params

  try {
    const body = await request.json()
    const { status, notes, confiremee, clientNom, clientPrenom, clientPhone, clientAdresse } = body

    const currentOrder = await prisma.order.findUnique({
      where: { id },
      include: { client: true, items: true }
    })

    if (!currentOrder) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

    if (currentOrder.supprime) {
      return NextResponse.json({ error: 'Restaurez la commande avant de la modifier' }, { status: 409 })
    }

    const requestedStatus = typeof status === 'string' && ORDER_STATUSES.includes(status as OrderStatus)
      ? status as OrderStatus
      : null

    if (status !== undefined && !requestedStatus) {
      return NextResponse.json({ error: 'Statut de commande invalide' }, { status: 400 })
    }

    let targetStatus: OrderStatus = requestedStatus ?? currentOrder.status

    // Legacy UI confirmation toggle is translated to a real status transition so
    // status, stock reservation and confirmee can never diverge.
    if (confiremee !== undefined && !requestedStatus) {
      if (confiremee === true && !isStockReservedStatus(targetStatus)) targetStatus = 'CONFIRMED'
      if (confiremee === false && isStockReservedStatus(targetStatus)) targetStatus = 'PENDING'
    }

    const wasConfirmed = currentOrder.confirmee
    const willBeConfirmed = isStockReservedStatus(targetStatus)
    const statusChanged = targetStatus !== currentOrder.status

    // Handle stock insufficiency warning before starting transaction (Optimized: 1 query instead of N)
    if (!wasConfirmed && willBeConfirmed) {
      const productIds = currentOrder.items.map(item => item.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } }
      })

      const insufficientProducts = []
      for (const item of currentOrder.items) {
        const product = products.find(p => p.id === item.productId)
        if (product && product.stock < item.quantity) {
          insufficientProducts.push({
            id: product.id,
            name: product.name,
            stock: product.stock,
            requested: item.quantity
          })
        }
      }

      if (insufficientProducts.length > 0) {
        return NextResponse.json({
          error: 'INSUFFICIENT_STOCK',
          message: 'Stock insuffisant pour certains produits.',
          products: insufficientProducts
        }, { status: 400 })
      }
    }

    const updateData: Prisma.OrderUpdateInput = {}
    const logDetails: string[] = []
    const logChanges: Record<string, { before: unknown; after: unknown }> = {}

    // Track status change
    if (statusChanged) {
      updateData.status = targetStatus
      logDetails.push(`Statut modifié de ${currentOrder.status} à ${targetStatus}`)
      logChanges.status = { before: currentOrder.status, after: targetStatus }
    }

    // Track confirmation state
    if (willBeConfirmed !== currentOrder.confirmee) {
      updateData.confirmee = willBeConfirmed
      logDetails.push(willBeConfirmed ? `Commande confirmée` : `Commande marquée comme non-confirmée`)
      logChanges.confirmee = { before: currentOrder.confirmee, after: willBeConfirmed }
    }

    // Track notes change
    if (notes !== undefined && notes !== currentOrder.notes) {
      updateData.notes = notes
      logDetails.push(`Note interne mise à jour`)
      logChanges.notes = { before: currentOrder.notes, after: notes }
    }

    if (clientAdresse !== undefined && clientAdresse !== currentOrder.deliveryAddress) {
      updateData.deliveryAddress = clientAdresse
      logDetails.push('Adresse de livraison mise à jour')
      logChanges.deliveryAddress = { before: currentOrder.deliveryAddress, after: clientAdresse }
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const hadPromoUsage = consumesPromoUsage(currentOrder.status, currentOrder.supprime)
      const willHavePromoUsage = consumesPromoUsage(targetStatus, false)

      if (currentOrder.promoCodeId && hadPromoUsage !== willHavePromoUsage) {
        if (willHavePromoUsage) await incrementPromoUsage(tx, currentOrder.promoCodeId)
        else await decrementPromoUsage(tx, currentOrder.promoCodeId)
      }

      // Perform stock adjustments (Optimized: batch log writes)
      if (!wasConfirmed && willBeConfirmed) {
        await decrementStock(tx, currentOrder.items)
        const logEntries = currentOrder.items.map((item) => ({
          action: 'MODIFICATION',
          details: `Stock décrémenté de -${item.quantity} (commande ${currentOrder.orderNumber} confirmée)`,
          productId: item.productId,
          productName: item.productName
        }))
        if (logEntries.length > 0) {
          await tx.productLog.createMany({ data: logEntries })
        }
      } else if (wasConfirmed && !willBeConfirmed) {
        const logEntries = []
        for (const item of currentOrder.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          })
          logEntries.push({
            action: 'MODIFICATION',
            details: `Stock ré-incrémenté de +${item.quantity} (commande ${currentOrder.orderNumber} marquée non-confirmée/annulée)`,
            productId: item.productId,
            productName: item.productName
          })
        }
        if (logEntries.length > 0) {
          await tx.productLog.createMany({ data: logEntries })
        }
      }

      // Update Client details if edited
      if (currentOrder.clientId && (clientNom || clientPrenom || clientPhone || clientAdresse)) {
        await tx.client.update({
          where: { id: currentOrder.clientId },
          data: {
            nom: clientNom !== undefined ? clientNom : currentOrder.client?.nom,
            prenom: clientPrenom !== undefined ? clientPrenom : currentOrder.client?.prenom,
            phone: clientPhone !== undefined ? clientPhone : currentOrder.client?.phone,
            adresse: clientAdresse !== undefined ? clientAdresse : currentOrder.client?.adresse,
          }
        })
        logDetails.push(`Informations du client mises à jour`)
      }

      const resOrder = await tx.order.update({
        where: { id: id },
        data: updateData,
        include: { client: true, items: true }
      })

      // Write OrderTracking and OrderLog if changes occurred
      if (logDetails.length > 0) {
        if (statusChanged) {
          await tx.orderTracking.create({
            data: {
              orderId: id,
              status: targetStatus,
              message: `Statut de la commande modifié pour: ${targetStatus}`,
            }
          })
        }

        await tx.orderLog.create({
          data: {
            orderId: id,
            action: statusChanged ? 'STATUT' : 'MODIFICATION',
            details: logDetails.join(', '),
            changes: JSON.stringify(logChanges),
          }
        })
      }

      return resOrder
    })

    return NextResponse.json({ order: updatedOrder })
  } catch (error: unknown) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Admin order update error (PUT):', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la commande' }, { status: 500 })
  }
}

// DELETE: Handles putting order in trash, restoring, or permanent delete
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  const { searchParams } = request.nextUrl
  const mode = searchParams.get('mode') || 'trash' // 'trash', 'restore', 'permanent'

  try {
    const order = await prisma.order.findUnique({ 
      where: { id },
      include: { items: true }
    })
    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

    if (mode === 'trash') {
      if (order.supprime) {
        return NextResponse.json({ error: 'Commande déjà dans la corbeille' }, { status: 400 })
      }

      await prisma.$transaction(async (tx) => {
        // Soft delete order
        await tx.order.update({
          where: { id },
          data: { supprime: true, supprimeLe: new Date(), confirmee: false }
        })

        if (order.promoCodeId && consumesPromoUsage(order.status, false)) {
          await decrementPromoUsage(tx, order.promoCodeId)
        }

        // Restore stock for all items (if it was confirmed) (Optimized: batch log writes)
        if (order.confirmee) {
          const logEntries = []
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } }
            })
            logEntries.push({
              action: 'MODIFICATION',
              details: `Stock ré-incrémenté de +${item.quantity} (commande ${order.orderNumber} mise à la corbeille)`,
              productId: item.productId,
              productName: item.productName
            })
          }
          if (logEntries.length > 0) {
            await tx.productLog.createMany({ data: logEntries })
          }
        }

        await tx.orderLog.create({
          data: {
            orderId: id,
            action: 'SUPPRESSION',
            details: `Commande ${order.orderNumber} mise à la corbeille (stock restauré si applicable).`,
          }
        })
      })

      return NextResponse.json({ success: true, message: 'Commande mise à la corbeille et stock restauré' })
    } else if (mode === 'restore') {
      if (!order.supprime) {
        return NextResponse.json({ error: 'La commande n\'est pas dans la corbeille' }, { status: 400 })
      }

      try {
        await prisma.$transaction(async (tx) => {
          // If the order status was a confirmed status, it would try to confirm it again on restore
          const shouldBeConfirmed = isStockReservedStatus(order.status)
          if (shouldBeConfirmed) {
            // Verify stock availability (Optimized: 1 query instead of N)
            const productIds = order.items.map(item => item.productId)
            const products = await tx.product.findMany({
              where: { id: { in: productIds } }
            })

            for (const item of order.items) {
              const product = products.find(p => p.id === item.productId)
              if (!product) {
                throw new Error(`Produit introuvable : ${item.productName}`)
              }
              if (product.stock < item.quantity) {
                throw new Error(`Stock insuffisant pour restaurer : ${item.productName} (Demandé: ${item.quantity}, Disponible: ${product.stock})`)
              }
            }

            // Decrement atomically inside the transaction to prevent concurrent overselling.
            await decrementStock(tx, order.items)
            const logEntries = order.items.map((item) => ({
              action: 'MODIFICATION',
              details: `Stock décrémenté de -${item.quantity} (commande ${order.orderNumber} restaurée de la corbeille)`,
              productId: item.productId,
              productName: item.productName
            }))
            if (logEntries.length > 0) {
              await tx.productLog.createMany({ data: logEntries })
            }
          }

          if (order.promoCodeId && consumesPromoUsage(order.status, false)) {
            await incrementPromoUsage(tx, order.promoCodeId)
          }

          // Restore order
          await tx.order.update({
            where: { id },
            data: { supprime: false, supprimeLe: null, confirmee: shouldBeConfirmed }
          })

          await tx.orderLog.create({
            data: {
              orderId: id,
              action: 'RESTORATION',
              details: `Commande ${order.orderNumber} restaurée depuis la corbeille (stock réservé si applicable).`,
            }
          })
        })

        return NextResponse.json({ success: true, message: 'Commande restaurée avec succès' })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur lors de la restauration de la commande'
        return NextResponse.json({ error: message }, { status: 400 })
      }
    } else if (mode === 'permanent') {
      if (!order.supprime) {
        return NextResponse.json({ error: 'La suppression définitive est autorisée uniquement depuis la corbeille' }, { status: 400 })
      }

      await prisma.$transaction(async (tx) => {
        // Log order deletion
        await tx.orderLog.create({
          data: {
            orderId: id,
            action: 'SUPPRESSION',
            details: `Commande ${order.orderNumber} supprimée définitivement de la base de données.`,
          }
        })
        
        await tx.order.delete({ where: { id } })
      })

      return NextResponse.json({ success: true, message: 'Commande supprimée définitivement' })
    }

    return NextResponse.json({ error: 'Mode non supporté' }, { status: 400 })
  } catch (error: unknown) {
    console.error('Admin order delete error (DELETE):', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression de la commande' }, { status: 500 })
  }
}
