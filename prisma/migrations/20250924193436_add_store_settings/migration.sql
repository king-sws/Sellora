-- CreateEnum
CREATE TYPE "public"."SettingType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'IMAGE', 'EMAIL');

-- CreateEnum
CREATE TYPE "public"."SettingCategory" AS ENUM ('GENERAL', 'APPEARANCE', 'EMAIL', 'PAYMENT', 'SHIPPING', 'INVENTORY', 'SEO', 'SOCIAL', 'ADVANCED');

-- CreateTable
CREATE TABLE "public"."StoreSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "type" "public"."SettingType" NOT NULL,
    "category" "public"."SettingCategory" NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreSetting_key_key" ON "public"."StoreSetting"("key");

-- CreateIndex
CREATE INDEX "StoreSetting_category_idx" ON "public"."StoreSetting"("category");

-- CreateIndex
CREATE INDEX "StoreSetting_isPublic_idx" ON "public"."StoreSetting"("isPublic");
