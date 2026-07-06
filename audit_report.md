# Rapport d'Audit Fonctionnel Complet et Exhaustif — Projet ParaGlow

Ce rapport présente l'audit fonctionnel exhaustif et systématique de l'application e-commerce **ParaGlow** (Next.js App Router, Prisma ORM, Supabase Database & Storage, i18n multilingue FR/EN/AR). L'audit a été réalisé sans modification de code afin d'offrir une visibilité totale sur l'état du projet, ses anomalies fonctionnelles, ses failles logiques de gestion de stock, ses incohérences d'internationalisation et ses vulnérabilités d'architecture.

---

## 1. Synthèse Globale des Anomalies

L'analyse approfondie du code source a permis d'identifier **18 points d'attention et anomalies**, classés ci-dessous par niveau de sévérité :

*   **Critique (1)** : Dysfonctionnement majeur bloquant ou impactant l'intégrité commerciale ou financière directe de l'application.
*   **Élevée (5)** : Dysfonctionnements applicatifs, plantages de requêtes de base de données (crashes API) ou pertes de données potentiels.
*   **Moyenne (8)** : Problèmes d'ergonomie, incohérences d'i18n/RTL, affichages trompeurs pour l'utilisateur ou mécanismes inefficaces.
*   **Faible (4)** : Améliorations de confort de développement, optimisations cosmétiques ou métadonnées incomplètes.

---

## 2. Anomalies Critiques et Élevées

### 2.1. [CRITIQUE] Absence de vérification et de décrémentation des stocks lors du checkout public
*   **Composants concernés** : [src/app/api/orders/route.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/api/orders/route.ts#L46-L131) et [src/lib/orderPricing.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/lib/orderPricing.ts#L95-L138)
*   **Description** : Lors de la soumission d'une commande par un client sur le site public via la route `POST /api/orders`, la fonction `priceOrderItems` récupère bien les produits en base de données pour recalculer les prix (évitant toute injection de tarifs par le client), mais **ne valide jamais** si la quantité demandée est disponible en stock (`product.stock >= item.quantity`). De plus, la fonction `decrementStock` présente dans le fichier utilitaire n'est pas appelée à cette étape. La commande est immédiatement créée en statut `PENDING` avec le paramètre `confirmee: false`.
*   **Impact** : Un client peut commander des produits en rupture de stock totale (stock = 0) ou saisir des quantités absurdes (ex: 9999 unités d'un produit en ayant 2 en stock). Cette anomalie crée une faille commerciale grave (ventes de produits non disponibles, promesses de livraison non tenues, gestion client compliquée).
*   **Résolution suggérée** : Ajouter une validation de stock stricte dans `priceOrderItems` ou dans le flux de la transaction de checkout de `POST /api/orders`, en bloquant la commande et en renvoyant une erreur `400 INSUFFICIENT_STOCK` si un produit n'a plus de stock disponible.

### 2.2. [ÉLEVÉE] Crash SQL systématique lors de la purge forcée des catégories orphelines
*   **Composants concernés** : [src/app/api/admin/settings/route.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/api/admin/settings/route.ts#L157-L188) (action `force_purge_orphans`) et [src/lib/purgeOrphans.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/lib/purgeOrphans.ts#L3-L23)
*   **Description** : La fonction de nettoyage des données orphelines tente de supprimer de la base de données toutes les catégories n'ayant aucun produit associé (`products: { none: {} }`). Elle procède en deux étapes : d'abord la suppression des sous-catégories (`parentId: { not: null }`), puis celle des catégories parentes (`parentId: null`). Cependant, si une catégorie parente n'a aucun produit directement rattaché mais possède encore une sous-catégorie active (laquelle contient des produits et ne sera donc pas supprimée), la tentative de suppression de la catégorie parente échouera.
*   **Impact** : L'opération lève une exception de violation de contrainte d'intégrité référentielle SQL (Foreign Key Constraint Violation) sur le champ `parentId` dans PostgreSQL. Cela provoque un plantage (erreur 500) de l'API et interrompt la transaction de purge.
*   **Résolution suggérée** : Modifier la condition de suppression des catégories parentes pour exclure celles qui possèdent encore des catégories enfants actives, en utilisant une requête du type `where: { parentId: null, products: { none: {} }, children: { none: {} } }`.

### 2.3. [ÉLEVÉE] Impossibilité de sauvegarder ou modifier les traductions des noms des produits (`nameAr` / `nameEn`)
*   **Composants concernés** : [src/lib/validation.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/lib/validation.ts#L57-L86) (Zod `adminProductSchema`) et les routes d'API admin de produits.
*   **Description** : Bien que le schéma Prisma possède les champs `nameAr` et `nameEn` pour le modèle `Product`, le validateur de formulaires Zod de l'administration (`adminProductSchema`) ne comprend pas ces deux clés. Par conséquent, lors des appels `POST` et `PUT` sur `/api/admin/products`, les données envoyées pour les noms de produits en arabe et en anglais sont ignorées et non insérées en base de données.
*   **Impact** : L'administration ne peut pas renseigner de noms traduits pour les produits. Le catalogue public affiche donc par défaut le nom en français même lorsque le visiteur sélectionne la langue arabe ou anglaise.
*   **Résolution suggérée** : Ajouter `nameAr: z.string().optional().nullable()` et `nameEn: z.string().optional().nullable()` dans le schéma `adminProductSchema` de `src/lib/validation.ts` et répercuter leur écriture dans les requêtes Prisma de création et mise à jour.

### 2.4. [ÉLEVÉE] Limiteur de débit (Rate Limiter) inefficace en environnement Serverless (Vercel)
*   **Composants concernés** : [src/lib/rateLimit.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/lib/rateLimit.ts#L8-L30) (In-memory Store)
*   **Description** : Le mécanisme de rate limiting pour le formulaire de contact, la connexion administration et la validation des commandes stocke les requêtes dans une variable globale en mémoire JavaScript (`const limiters = new Map()`).
*   **Impact** : L'application étant hébergée sur Vercel, chaque requête est traitée par des fonctions Serverless éphémères et isolées. La mémoire n'est pas partagée entre les instances, et le stockage local est réinitialisé lors du recyclage des conteneurs. Le rate-limiting est donc inefficace en production, exposant le site à des attaques par force brute (connexion admin) ou à du spam de commandes/messages.
*   **Résolution suggérée** : Remplacer le stockage en mémoire locale par une solution distante partagée rapide (ex: Redis / Vercel KV) ou déléguer cette limitation de requêtes au niveau de la passerelle de sécurité (Cloudflare / Vercel Firewall).

### 2.5. [ÉLEVÉE] Risque de dépassement de mémoire (OOM) lors de l'extraction d'images Excel volumineuses
*   **Composants concernés** : [src/lib/excelImageExtractor.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/lib/excelImageExtractor.ts) et [src/app/api/admin/import/route.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/api/admin/import/route.ts#L148-L152)
*   **Description** : Lors de l'import de catalogue produit par fichier Excel, si des images sont nativement embarquées dans les feuilles de calcul, la fonction charge la totalité du fichier en mémoire synchrone pour parser la structure ZIP du fichier `.xlsx` afin d'en extraire les médias binaires.
*   **Impact** : Pour les fichiers d'import volumineux contenant des dizaines d'images haute définition, la mémoire allouée à la fonction Next.js sur Vercel (souvent limitée à 1024 Mo par défaut) peut être dépassée (OOM Error), entraînant le redémarrage brutal du processus et l'échec immédiat de l'import.
*   **Résolution suggérée** : Effectuer l'extraction des images par flux ou recommander de fournir uniquement des URLs d'images publiques dans la colonne dédiée au lieu d'intégrer les images physiquement dans le fichier Excel.

---

## 3. Anomalies Moyennes et Incohérences Fonctionnelles

### 3.1. Incohérence et contradiction sur le seuil de livraison gratuite (150 DT vs 200 DT)
*   **Composants concernés** :
    *   Configuration par défaut : [src/store/settings.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/store/settings.ts#L49) (`freeDeliveryThreshold: 150.0`)
    *   Logique serveur : [src/lib/orderPricing.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/lib/orderPricing.ts#L142) (`let freeDeliveryThreshold = 150`)
    *   Fichiers de traduction : [src/i18n/messages/fr.json](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/i18n/messages/fr.json#L247) (`"freeDeliveryAt": "Livraison gratuite à partir de 200 DT"`)
*   **Description** : Les interfaces et textes d'information (bannière d'annonce, panier public) affichent que la livraison gratuite est offerte à partir de **200 DT**. Cependant, les constantes de repli définies dans le code serveur et dans le magasin d'état Zustand fixent ce seuil à **150 DT**.
*   **Impact** : Si l'administrateur n'a pas configuré explicitement ce paramètre en base de données, un client verra qu'il doit atteindre 200 DT pour ne pas payer de frais de livraison, mais la livraison passera gratuitement à 0 DT dès que son panier atteindra 150 DT. Cette incohérence crée un manque à gagner financier direct et déstabilise l'expérience utilisateur.
*   **Résolution suggérée** : Aligner toutes les valeurs par défaut (fichiers JSON et constantes de code) sur une seule et unique valeur de référence (ex: 200 DT ou 150 DT selon le souhait commercial).

### 3.2. Absence totale de système d'envoi d'e-mails transactionnels (Emails fantômes)
*   **Composants concernés** : [src/app/api/orders/route.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/api/orders/route.ts) et [src/app/[locale]/commande/confirmation/page.tsx](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/%5Blocale%5D/commande/confirmation/page.tsx)
*   **Description** : Lors de la confirmation d'une commande, l'interface affiche le texte `"Un e-mail de confirmation a été envoyé"`. Or, après inspection complète de l'arborescence du projet, il n'existe aucun module de messagerie, aucune intégration de service d'envoi (Nodemailer, Resend, SendGrid, etc.) ni aucune commande d'envoi d'email dans l'API de validation de commande.
*   **Impact** : Le client final ne reçoit jamais d'e-mail récapitulatif de sa commande ni d'e-mail de suivi. Cela nuit à la crédibilité professionnelle de la boutique en ligne.
*   **Résolution suggérée** : Intégrer un fournisseur d'e-mails transactionnels (ex: Resend ou Brevo) dans la route `/api/orders` pour envoyer un e-mail HTML récapitulatif au client dès la création de sa commande.

### 3.3. Textes en dur et non traduits dans l'interface multilingue (i18n)
L'application utilise `next-intl` pour la traduction, mais de nombreux composants contiennent encore du texte brut, ce qui casse l'expérience utilisateur dans d'autres langues.

*   **Panier client ([src/components/cart/CartClient.tsx](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/components/cart/CartClient.tsx#L476))** :
    *   La fonctionnalité de vidage du panier affiche du texte traduit de manière conditionnelle inline : `{locale === 'ar' ? 'تفريغ السلة' : 'Vider le panier'}`. L'anglais n'est pas pris en compte (renvoie vers la version française) et cela court-circuite le fichier de langue JSON.
*   **Page de confirmation de commande ([src/app/[locale]/commande/confirmation/page.tsx](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/%5Blocale%5D/commande/confirmation/page.tsx#L45-L50,L99-L102,L114))** :
    *   Textes traduits via des conditions ternaires en cascade directement dans le JSX (ex: validation téléphonique, bouton de suivi de commande, message de remerciement secondaire) au lieu d'utiliser le hook `useTranslations()`.
*   **Suivi de commande ([src/app/[locale]/commande/suivi/SuiviClient.tsx](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/%5Blocale%5D/commande/suivi/SuiviClient.tsx#L278))** :
    *   Conditionnelles d'affichage en dur pour le label de livraison estimée : `{locale === 'ar' ? 'موعد التسليم المتوقع' : locale === 'en' ? 'Estimated delivery' : 'Livraison estimée'}`.
*   **Page produit ([src/app/[locale]/catalogue/[slug]/page.tsx](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/%5Blocale%5D/catalogue/%5Bslug%5D/page.tsx#L199-L205))** :
    *   La bannière de réassurance affiche "Achat 100% Sécurisé" et sa description uniquement en français, sans aucune gestion de langue.

---

## 4. Anomalies Faibles et Améliorations Optionnelles

### 4.1. Pas d'installation PWA possible pour le site public
*   **Composants concernés** : [src/app/admin/layout.tsx](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/admin/layout.tsx#L10-L25)
*   **Description** : Les balises de métadonnées d'installation PWA (manifeste PWA, icône Apple, couleur du thème mobile) ne sont déclarées que dans le layout de l'espace d'administration. Le site public n'embarque aucun fichier manifest, empêchant les clients de l'installer sur l'écran d'accueil de leur smartphone.
*   **Recommandation** : Si le site public doit être installable comme une application native, ajouter un manifest public `/public/manifest.json` et déclarer les métadonnées PWA correspondantes dans le layout racine du site `/[locale]/layout.tsx`.

### 4.2. Absence de contrainte de suppression en cascade pour les clients
*   **Composants concernés** : [prisma/schema.prisma](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/prisma/schema.prisma)
*   **Description** : Le modèle `Client` ne dispose pas de directive de cascade ou de blocage en cas de suppression physique. Si un administrateur supprime manuellement la fiche d'un client en base de données, la clé étrangère `clientId` dans les commandes liées peut générer des erreurs d'intégrité de clé orpheline selon les configurations strictes de clés étrangères.
*   **Recommandation** : Configurer explicitement la relation dans Prisma en définissant la règle à appliquer en cas de suppression (ex: `onDelete: SetNull` ou `onDelete: Cascade` ou `onDelete: Restrict`).

---

## 5. Registre Détaillé des Anomalies Fonctionnelles (18 Issues)

Voici le registre intégral des anomalies détectées lors de l'audit systématique :

| ID | Module / Page | Fichier source principal | Sévérité | Description de l'anomalie | Action Corrective suggérée |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **01** | Commande Public | [api/orders/route.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/api/orders/route.ts) | **Critique** | Commande possible sans aucun contrôle de stock disponible (possibilité de commander des produits en rupture). | Vérifier `product.stock >= item.quantity` dans `priceOrderItems` avant d'accepter la commande. |
| **02** | Paramètres Admin | [api/admin/settings/route.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/api/admin/settings/route.ts#L157-L188) | **Élevée** | Crash SQL lors du nettoyage forcé des catégories orphelines si des sous-catégories ont des produits et bloquent le parent. | Exclure de la suppression les catégories parentes ayant des enfants actifs (`children: { none: {} }`). |
| **03** | Produits Admin | [lib/validation.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/lib/validation.ts#L57) | **Élevée** | Clés `nameAr` et `nameEn` absentes du validateur Zod `adminProductSchema`, interdisant la traduction des titres. | Ajouter les champs `nameAr` et `nameEn` de type String optionnel dans le schéma Zod. |
| **04** | Sécurité | [lib/rateLimit.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/lib/rateLimit.ts) | **Élevée** | Limiteur de requêtes basé sur une Map locale en mémoire, inopérant sur Vercel Serverless. | Utiliser un stockage partagé persistant comme Redis (Vercel KV) ou configurer des règles de pare-feu WAF. |
| **05** | Import Excel | [lib/excelImageExtractor.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/lib/excelImageExtractor.ts) | **Élevée** | Extraction d'images Excel volumineuses exécutée entièrement en mémoire synchrone (risque d'OOM et timeout). | Traiter le fichier par flux ou encourager le téléversement d'images par colonnes d'URLs uniquement. |
| **06** | Configuration | [store/settings.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/store/settings.ts#L49) | **Moyenne** | Discordance entre le seuil de livraison gratuite affiché (200 DT) et calculé par défaut par le serveur (150 DT). | Harmoniser la constante de repli globale à 200 DT dans le code et les traductions. |
| **07** | Commande Public | [api/orders/route.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/api/orders/route.ts) | **Moyenne** | Mensonge d'UI : aucun mail de confirmation n'est expédié au client (absence de connecteur de messagerie). | Configurer un transporteur (Resend/Nodemailer) pour l'envoi effectif des récapitulatifs de commandes. |
| **08** | Panier Public | [CartClient.tsx](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/components/cart/CartClient.tsx#L476) | **Moyenne** | Bouton "Vider le panier" traduit en dur de façon binaire (FR/AR) ignorant l'anglais et le système i18n JSON. | Exporter la clé dans le fichier `messages` et l'appeler via la fonction de traduction locale. |
| **09** | Confirmation | [confirmation/page.tsx](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/%5Blocale%5D/commande/confirmation/page.tsx#L45) | **Moyenne** | Traductions écrites en dur dans le JSX via des ternaires multiples au lieu d'utiliser les clés JSON. | Nettoyer le JSX et transférer les traductions vers `orderConfirmation` dans `fr.json`/`en.json`/`ar.json`. |
| **10** | Suivi Commande | [SuiviClient.tsx](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/%5Blocale%5D/commande/suivi/SuiviClient.tsx#L278) | **Moyenne** | Labels et estimations de livraison écrits sous forme de conditions hardcodées dans le fichier tsx. | Centraliser ces chaînes dans le dictionnaire de traduction `orderTracking`. |
| **11** | Page Produit | [catalogue/[slug]/page.tsx](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/%5Blocale%5D/catalogue/%5Bslug%5D/page.tsx#L199) | **Moyenne** | Texte de la bannière de réassurance de sécurité rédigé uniquement en français sur toutes les langues. | Rendre la bannière dynamique et utiliser les traductions associées à la clé `product`. |
| **12** | Base de données | [prisma/schema.prisma](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/prisma/schema.prisma) | **Moyenne** | Risque d'intégrité orpheline sur la clé `clientId` de la table `Order` si une fiche Client est physiquement effacée. | Définir un comportement de contrainte SQL comme `onDelete: SetNull` ou `onDelete: Restrict`. |
| **13** | Stats Admin | [api/admin/dashboard/route.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/api/admin/dashboard/route.ts) | **Moyenne** | Quelques requêtes de comptage (ex: alertes stocks ou nouveaux clients) n'excluent pas les produits/commandes soft-deleted. | Ajouter systématiquement la clause `supprime: false` sur toutes les statistiques du tableau de bord. |
| **14** | Import Excel | [lib/importProcessor.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/lib/importProcessor.ts) | **Moyenne** | Création automatique de marques et catégories sans désinfection préalable des noms et caractères spéciaux. | Nettoyer et désinfecter les chaînes reçues avant d'exécuter la création et la génération de slug. |
| **15** | PWA | [admin/layout.tsx](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/admin/layout.tsx#L10) | **Faible** | PWA limitée uniquement à l'URL `/admin`, indisponible pour l'espace public des clients. | Déplacer le manifeste PWA au niveau racine si l'installation de la boutique en ligne est requise. |
| **16** | Validation | [lib/validation.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/lib/validation.ts#L67) | **Faible** | Pas de plafond de garde-fou sur les taux de TVA ou les marges dans `adminProductSchema`. | Restreindre les valeurs pour éviter des erreurs arithmétiques involontaires (ex: TVA max 100%). |
| **17** | Logs Admin | [api/admin/orders/[id]/route.ts](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/api/admin/orders/%5Bid%5D/route.ts#L212) | **Faible** | Redondance d'écriture dans la console d'erreurs (double appel de `console.error` successifs avec des labels proches). | Nettoyer la gestion des erreurs dans le bloc catch de la route d'API PUT/DELETE. |
| **18** | Page Catalogue | [CatalogueClient.tsx](file:///c:/Users/ASUS-PC/Desktop/Site%20Para%20Glow/paraglow/src/app/%5Blocale%5D/catalogue/CatalogueClient.tsx) | **Faible** | Les skeletons de chargement SSR sur le catalogue ignorent parfois la direction RTL en arabe lors du premier rendu. | Ajuster les styles CSS pour respecter scrupuleusement la propriété de direction de document sur les squelettes. |

---

## 6. Recommandations et Plan d'Action Recommandé

Pour remédier à ces anomalies sans perturber le fonctionnement général, il est conseillé de suivre ce plan de correction par vagues :

1.  **Vague 1 (Urgent / Commercial & Sécurité)** :
    *   Mettre en place la vérification et la décrémentation des stocks au moment de la validation finale du checkout public dans `api/orders/route.ts`.
    *   Corriger la validation Zod `adminProductSchema` pour y intégrer `nameAr` et `nameEn` afin de permettre à l'administrateur d'éditer les produits en arabe et en anglais.
2.  **Vague 2 (Correction de base de données & Plantages)** :
    *   Modifier l'API de purge des catégories orphelines dans `api/admin/settings/route.ts` et `lib/purgeOrphans.ts` pour exclure les catégories parentes ayant encore des sous-catégories actives.
    *   Migrer le limiteur de débit vers une base Redis externe (ou utiliser Vercel KV) pour garantir la sécurité et la robustesse en production.
3.  **Vague 3 (Harmonisation & Crédibilité Client)** :
    *   Configurer un fournisseur d'emails transactionnels (ex: Resend) pour envoyer des confirmations de commandes réelles et de qualité.
    *   Modifier les replis par défaut de seuil de livraison gratuite à 200 DT pour s'accorder avec la politique commerciale communiquée.
    *   Transférer tous les textes traduits en dur (bannière de réassurance, page de confirmation, bouton de vidage du panier) vers les dictionnaires i18n JSON respectifs.
