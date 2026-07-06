# Tasks Checklist

## PARTIE 1 : Unification des modals de confirmation
- [x] Remplacer les confirmations divergentes par le composant `<Modal>` :
  - [x] Produits (`/admin/produits`) : soft-delete unitaire (ajouter confirmation)
  - [x] Produits (`/admin/produits`) : soft-delete en lot (remplacer `window.confirm`)
  - [x] Photos-site : remplacer div custom fixed inline
  - [x] Marketing : remplacer div Tailwind fixed inset-0 (code promo et CSE)
  - [x] Import : remplacer div Tailwind (uniquement la confirmation d'annulation)
  - [x] Corbeilles : remplacer div Tailwind (produits, photos-site)
- [x] Valider la compilation (`npx tsc --noEmit` + `npm run build`)
- [x] Faire le commit séparé "Partie 1"


## PARTIE 2 : Restructuration du Header Mobile
  - [x] Supprimer le bouton hamburger et le drawer/panel associé dans `Header.tsx`
  - [x] Ajouter la gestion de la langue sur mobile via un menu déroulant similaire à la version desktop
  - [x] Restructurer le header mobile avec le logo centré sur la première ligne et les 4 boutons (Langue, Favoris, Suivi de commande, Panier) sur la deuxième ligne
  - [x] S'assurer que le header desktop ne subit aucune modification
  - [x] Lancer la vérification de build (`npx tsc --noEmit` et `npm run build`)
  - [x] Faire un commit Git séparé pour la Partie 2"


## PARTIE 3 : Recréation fantôme du lot d'import après annulation
- [x] Identifier la date de coupure ou le marqueur précis pour les 592 produits d'origine
- [x] Mettre à jour `api/admin/import/batches/route.ts` pour ne pas ré-associer les produits créés manuellement
- [x] Valider la compilation (`npx tsc --noEmit` + `npm run build`)
- [x] Faire le commit séparé "Partie 3"


## PARTIE 4 : Suppression définitive corbeille échoue (contrainte FK)
- [x] Ajouter la vérification défensive d'OrderItem/commandes liées dans `api/admin/products/trash/route.ts` et renvoyer une erreur 400 claire
- [x] Mettre à jour le frontend `produits/corbeille/page.tsx` pour afficher l'erreur en toast
- [x] Auditer les autres corbeilles (clients, etc.) et appliquer des vérifications similaires
- [x] Valider la compilation (`npx tsc --noEmit` + `npm run build`)
- [x] Faire le commit séparé "Partie 4"


## PARTIE 5 : Gestion du stock
- [x] Retirer la validation de stock du checkout dans `src/lib/orderPricing.ts`
- [x] Retirer l'appel `decrementStock` dans `src/app/api/orders/route.ts`
- [x] Mettre à jour `POST` dans `src/app/api/admin/orders/route.ts`
- [x] Mettre à jour `PUT` et `DELETE` (trash / restore) dans `src/app/api/admin/orders/[id]/route.ts` pour gérer le stock aux transitions de confirmation
- [x] Gérer l'erreur `INSUFFICIENT_STOCK` et le comportement de forçage dans `src/app/admin/commandes/page.tsx`
- [x] Valider la compilation (`npx tsc --noEmit` + `npm run build`)
- [x] Commit Partie 5


## PARTIE 6 : Revalidation du cache Next.js
- [ ] Créer le helper centralisé `src/lib/revalidate.ts`
- [ ] Remplacer `revalidatePath` dans `purgeOrphans.ts`
- [ ] Remplacer `revalidatePath` dans `importProcessor.ts`
- [ ] Remplacer `revalidatePath` dans `src/app/api/admin/products/[id]/route.ts`
- [ ] Remplacer `revalidatePath` dans `src/app/api/admin/products/route.ts`
- [ ] Remplacer `revalidatePath` dans `src/app/api/admin/import/batches/[id]/route.ts`
- [ ] Remplacer `revalidatePath` dans `src/app/api/admin/settings/route.ts`
- [ ] Remplacer la liste locale statique dans `media/route.ts` et `media/trash/route.ts`
- [ ] Valider la compilation (`npx tsc --noEmit` + `npm run build`)
- [ ] Commit Partie 6


## PARTIE 7 : Purge intelligente des orphelins
- [ ] Ajouter la clause de délai de grâce (createdAt < 1 jour) dans `purgeOrphans.ts`
- [ ] Ajouter les actions API `'dry_run_purge_orphans'` et `'force_purge_orphans'` dans `settings/route.ts`
- [ ] Ajouter l'UI et la modal de confirmation dans `parametres/page.tsx`
- [x] Modify `next.config.ts` to whitelist `qgawickfkqtvcvchgfep.supabase.co` in `remotePatterns`
- [x] Verify any running dev server tasks and restart or launch a new dev server
- [x] Build check with `npm run build` or similar compilation step
- [x] Verify localhost:3000 home page loading and image displays
- [x] Add changes to git, commit, and push to GitHub
- [ ] Valider la compilation (`npx tsc --noEmit` + `npm run build`)
- [ ] Commit Partie 7


## PARTIE 8 : Relations formelles Prisma et logs
- [ ] Mettre à jour `prisma/schema.prisma` avec les relations `onDelete: SetNull` et `orderId` optionnel
- [ ] Sauvegarder `dev.db`
- [ ] Nettoyer les clés étrangères orphelines existantes en base
- [ ] Lancer la migration `npx prisma migrate dev`
- [ ] Valider la compilation (`npx tsc --noEmit` + `npm run build`)
- [ ] Commit Partie 8


## PARTIE 9 : i18n complète
- [ ] Traduire les ternaires dans `WishlistClient.tsx`
- [ ] Traduire les ternaires dans `CartClient.tsx`
- [ ] Corriger le fallback de livraison en anglais dans `delivery.ts`
- [ ] Ajouter les nouvelles clés de traduction dans `fr.json`, `en.json`, et `ar.json`
- [ ] Valider la compilation (`npx tsc --noEmit` + `npm run build`)
- [ ] Commit Partie 9
