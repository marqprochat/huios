-- AlterTable
ALTER TABLE "Student" ADD COLUMN "familyId" TEXT,
ADD COLUMN "churchId" TEXT;

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "priceTier" TEXT,
ADD COLUMN "monthlyAmount" DOUBLE PRECISION,
ADD COLUMN "churchId" TEXT,
ADD COLUMN "origin" TEXT NOT NULL DEFAULT 'ADMIN';

-- AlterTable
ALTER TABLE "CourseClass" ADD COLUMN "enrollmentStatus" TEXT NOT NULL DEFAULT 'FECHADA',
ADD COLUMN "enrollmentOpensAt" TIMESTAMP(3),
ADD COLUMN "enrollmentClosesAt" TIMESTAMP(3),
ADD COLUMN "installments" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "vacancies" INTEGER;

-- AlterTable
ALTER TABLE "CoursePrice" ADD COLUMN "enrollmentFee" DOUBLE PRECISION,
ADD COLUMN "amountMember" DOUBLE PRECISION,
ADD COLUMN "amountNonMember" DOUBLE PRECISION,
ADD COLUMN "amountFamily" DOUBLE PRECISION,
ADD COLUMN "amountPartner" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Church" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EXTERNA',
    "isPartner" BOOLEAN NOT NULL DEFAULT false,
    "publicSlug" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Church_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "responsibleName" TEXT,
    "responsiblePhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL DEFAULT 'PAGBANK',
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "amount" DOUBLE PRECISION NOT NULL,
    "gatewayChargeId" TEXT,
    "gatewayOrderId" TEXT,
    "pixQrCode" TEXT,
    "pixQrCodeText" TEXT,
    "boletoUrl" TEXT,
    "boletoBarcode" TEXT,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Church_publicSlug_key" ON "Church"("publicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gatewayChargeId_key" ON "Payment"("gatewayChargeId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinancialTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
