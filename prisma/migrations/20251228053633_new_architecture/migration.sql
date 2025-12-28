/*
  Warnings:

  - You are about to drop the column `categoryId` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `transactionId` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Provider` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `Provider` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Advance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AnalyticsData` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Attachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Delivery` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExpenseCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductService` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Transaction` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `Expense` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `Provider` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MoneyMovementType" AS ENUM ('ADVANCE', 'PAYMENT', 'ADJUSTMENT', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "ProductMovementType" AS ENUM ('DELIVERY', 'ADJUSTMENT', 'LOSS');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ExpenseScope" AS ENUM ('BUSINESS', 'PERSONAL');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('FREIGHT', 'TRANSPORT', 'FOOD', 'OTHER');

-- CreateEnum
CREATE TYPE "IncomeScope" AS ENUM ('BUSINESS', 'PERSONAL');

-- DropForeignKey
ALTER TABLE "Advance" DROP CONSTRAINT "Advance_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "ExpenseCategory" DROP CONSTRAINT "ExpenseCategory_userId_fkey";

-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ProductService" DROP CONSTRAINT "ProductService_userId_fkey";

-- DropForeignKey
ALTER TABLE "Provider" DROP CONSTRAINT "Provider_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_productServiceId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_providerId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_userId_fkey";

-- DropIndex
DROP INDEX "Expense_categoryId_idx";

-- DropIndex
DROP INDEX "Expense_transactionId_idx";

-- DropIndex
DROP INDEX "Organization_createdById_idx";

-- DropIndex
DROP INDEX "OrganizationMember_organizationId_idx";

-- DropIndex
DROP INDEX "OrganizationMember_userId_idx";

-- DropIndex
DROP INDEX "Provider_organizationId_idx";

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "categoryId",
DROP COLUMN "transactionId",
ADD COLUMN     "expenseType" "ExpenseType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "operationId" TEXT,
ADD COLUMN     "scope" "ExpenseScope" NOT NULL DEFAULT 'BUSINESS',
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "createdById";

-- AlterTable
ALTER TABLE "Provider" DROP COLUMN "email",
DROP COLUMN "organizationId",
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "address",
DROP COLUMN "latitude",
DROP COLUMN "longitude";

-- DropTable
DROP TABLE "Advance";

-- DropTable
DROP TABLE "AnalyticsData";

-- DropTable
DROP TABLE "Attachment";

-- DropTable
DROP TABLE "Delivery";

-- DropTable
DROP TABLE "ExpenseCategory";

-- DropTable
DROP TABLE "ProductService";

-- DropTable
DROP TABLE "Transaction";

-- DropEnum
DROP TYPE "AttachmentType";

-- DropEnum
DROP TYPE "TransactionStatus";

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL,
    "operationNumber" TEXT NOT NULL,
    "status" "OperationStatus" NOT NULL DEFAULT 'OPEN',
    "productId" TEXT NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "agreedQuantity" DOUBLE PRECISION,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyMovement" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "movementType" "MoneyMovementType" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "description" TEXT NOT NULL,
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoneyMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMovement" (
    "id" TEXT NOT NULL,
    "netWeight" DOUBLE PRECISION NOT NULL,
    "grossWeight" DOUBLE PRECISION,
    "tare" DOUBLE PRECISION,
    "movementType" "ProductMovementType" NOT NULL,
    "description" TEXT NOT NULL,
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "saleNumber" TEXT NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'PENDING',
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalePayment" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "description" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Income" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "scope" "IncomeScope" NOT NULL DEFAULT 'PERSONAL',
    "description" TEXT NOT NULL,
    "incomeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Income_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_userId_idx" ON "Product"("userId");

-- CreateIndex
CREATE INDEX "Client_userId_idx" ON "Client"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Operation_operationNumber_key" ON "Operation"("operationNumber");

-- CreateIndex
CREATE INDEX "Operation_userId_idx" ON "Operation"("userId");

-- CreateIndex
CREATE INDEX "Operation_providerId_idx" ON "Operation"("providerId");

-- CreateIndex
CREATE INDEX "Operation_productId_idx" ON "Operation"("productId");

-- CreateIndex
CREATE INDEX "Operation_status_idx" ON "Operation"("status");

-- CreateIndex
CREATE INDEX "MoneyMovement_operationId_idx" ON "MoneyMovement"("operationId");

-- CreateIndex
CREATE INDEX "MoneyMovement_movementDate_idx" ON "MoneyMovement"("movementDate");

-- CreateIndex
CREATE INDEX "ProductMovement_operationId_idx" ON "ProductMovement"("operationId");

-- CreateIndex
CREATE INDEX "ProductMovement_movementDate_idx" ON "ProductMovement"("movementDate");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_saleNumber_key" ON "Sale"("saleNumber");

-- CreateIndex
CREATE INDEX "Sale_userId_idx" ON "Sale"("userId");

-- CreateIndex
CREATE INDEX "Sale_clientId_idx" ON "Sale"("clientId");

-- CreateIndex
CREATE INDEX "Sale_productId_idx" ON "Sale"("productId");

-- CreateIndex
CREATE INDEX "Sale_status_idx" ON "Sale"("status");

-- CreateIndex
CREATE INDEX "SalePayment_saleId_idx" ON "SalePayment"("saleId");

-- CreateIndex
CREATE INDEX "Income_userId_idx" ON "Income"("userId");

-- CreateIndex
CREATE INDEX "Income_scope_idx" ON "Income"("scope");

-- CreateIndex
CREATE INDEX "Income_incomeDate_idx" ON "Income"("incomeDate");

-- CreateIndex
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");

-- CreateIndex
CREATE INDEX "Expense_operationId_idx" ON "Expense"("operationId");

-- CreateIndex
CREATE INDEX "Expense_scope_idx" ON "Expense"("scope");

-- CreateIndex
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyMovement" ADD CONSTRAINT "MoneyMovement_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMovement" ADD CONSTRAINT "ProductMovement_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
