-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "squareCustomerId" TEXT NOT NULL,
    "squarePaymentId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "items" JSONB NOT NULL,
    "customerInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);
