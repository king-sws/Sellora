-- CreateTable
CREATE TABLE "public"."PromoModal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discountValue" TEXT NOT NULL,
    "couponCode" TEXT,
    "buttonText" TEXT NOT NULL DEFAULT 'Shop Now',
    "buttonLink" TEXT NOT NULL DEFAULT '/',
    "primaryColor" TEXT NOT NULL DEFAULT '#dc2626',
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showOnPages" TEXT[] DEFAULT ARRAY['home']::TEXT[],
    "delaySeconds" INTEGER NOT NULL DEFAULT 1,
    "features" JSONB,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "termsText" TEXT NOT NULL DEFAULT '*Terms and conditions apply',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoModal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromoModal_isActive_idx" ON "public"."PromoModal"("isActive");

-- CreateIndex
CREATE INDEX "PromoModal_startsAt_idx" ON "public"."PromoModal"("startsAt");

-- CreateIndex
CREATE INDEX "PromoModal_expiresAt_idx" ON "public"."PromoModal"("expiresAt");
