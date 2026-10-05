-- Keep discounted catalogue price filtering/sorting inside PostgreSQL.
-- The expression mirrors src/lib/productPricing.ts::computeDisplayPrice.
CREATE INDEX IF NOT EXISTS "Product_public_effective_price_idx"
ON "Product" ((
  CASE
    WHEN "remiseType" = 'POURCENTAGE' AND COALESCE("remiseValeur", 0) > 0
      THEN GREATEST(
        0,
        ROUND(
          ("sellingPriceTTC" * (1 - LEAST(100, GREATEST(0, "remiseValeur")) / 100.0))::numeric,
          3
        )::double precision
      )
    WHEN "remiseType" = 'PRIX_FIXE' AND COALESCE("remiseValeur", 0) > 0
      THEN GREATEST(0, ROUND("remiseValeur"::numeric, 3)::double precision)
    ELSE GREATEST(0, ROUND("sellingPriceTTC"::numeric, 3)::double precision)
  END
))
WHERE "supprime" = false AND "isActive" = true;
