-- AlterTable
ALTER TABLE "GeneratedDocument" ADD COLUMN "deliveredAt" DATETIME;
ALTER TABLE "GeneratedDocument" ADD COLUMN "deliveredToEmail" TEXT;
ALTER TABLE "GeneratedDocument" ADD COLUMN "sectionConfigJson" TEXT;
ALTER TABLE "GeneratedDocument" ADD COLUMN "secureTokenExpiresAt" DATETIME;
ALTER TABLE "GeneratedDocument" ADD COLUMN "secureTokenHash" TEXT;

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportType" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "intakeJson" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paidAt" DATETIME,
    "claimId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CodeCitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "requirementKey" TEXT NOT NULL,
    "requirementText" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "codeSection" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'verification_required',
    "verifiedDate" DATETIME,
    "reviewedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CodeCitation_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RetailTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RetailIntake" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "desiredSystem" TEXT,
    "desiredManufacturer" TEXT,
    "shingleStyleColor" TEXT,
    "warrantySelection" TEXT,
    "ventilationPreference" TEXT,
    "upgradesJson" TEXT,
    "financingInterest" BOOLEAN NOT NULL DEFAULT false,
    "requestedTimeframe" TEXT,
    "knownLeaksConcerns" TEXT,
    "existingRoofInfo" TEXT,
    "budgetRangeMin" REAL,
    "budgetRangeMax" REAL,
    "selectedTierKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RetailIntake_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QCChecklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "revisionId" TEXT,
    "itemsJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'incomplete',
    "exceptionReason" TEXT,
    "exceptionByUserId" TEXT,
    "completedByUserId" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QCChecklist_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WhiteLabelProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "addressLine1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "licenseNumber" TEXT,
    "salesRepName" TEXT,
    "workmanshipWarrantyText" TEXT,
    "logoStorageKey" TEXT,
    "brandPrimaryColor" TEXT,
    "brandAccentColor" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Claim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL DEFAULT 'insurance',
    "insuranceCarrier" TEXT,
    "claimNumber" TEXT,
    "policyNumber" TEXT,
    "dateOfLoss" DATETIME,
    "causeOfLoss" TEXT,
    "adjusterName" TEXT,
    "adjusterPhone" TEXT,
    "adjusterEmail" TEXT,
    "estimator" TEXT,
    "inspectionDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'open',
    "whiteLabelProfileId" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Claim_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Claim_whiteLabelProfileId_fkey" FOREIGN KEY ("whiteLabelProfileId") REFERENCES "WhiteLabelProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Claim_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Claim" ("claimNumber", "createdAt", "createdById", "dateOfLoss", "estimator", "id", "inspectionDate", "insuranceCarrier", "policyNumber", "propertyId", "status", "updatedAt") SELECT "claimNumber", "createdAt", "createdById", "dateOfLoss", "estimator", "id", "inspectionDate", "insuranceCarrier", "policyNumber", "propertyId", "status", "updatedAt" FROM "Claim";
DROP TABLE "Claim";
ALTER TABLE "new_Claim" RENAME TO "Claim";
CREATE TABLE "new_EstimateLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "revisionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "calculatedQuantity" REAL,
    "quantityOverridden" BOOLEAN NOT NULL DEFAULT false,
    "unitPrice" REAL NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "taxableMaterialAmount" REAL NOT NULL DEFAULT 0,
    "taxRatePercent" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "rcv" REAL NOT NULL DEFAULT 0,
    "rcvUnrounded" REAL,
    "depreciationPercent" REAL NOT NULL DEFAULT 0,
    "depreciationAmount" REAL NOT NULL DEFAULT 0,
    "acv" REAL NOT NULL DEFAULT 0,
    "laborComponent" REAL,
    "materialComponent" REAL,
    "equipmentComponent" REAL,
    "notes" TEXT,
    "codeCitation" TEXT,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "priceListItemCode" TEXT,
    "retailTierKeys" TEXT,
    "isUpgrade" BOOLEAN NOT NULL DEFAULT false,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "reviewedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EstimateLineItem_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "EstimateRevision" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EstimateLineItem" ("acv", "calculatedQuantity", "category", "codeCitation", "createdAt", "depreciationAmount", "depreciationPercent", "description", "id", "included", "notes", "priceListItemCode", "quantity", "quantityOverridden", "rcv", "revisionId", "sortOrder", "taxAmount", "taxRatePercent", "taxable", "taxableMaterialAmount", "unit", "unitPrice", "updatedAt") SELECT "acv", "calculatedQuantity", "category", "codeCitation", "createdAt", "depreciationAmount", "depreciationPercent", "description", "id", "included", "notes", "priceListItemCode", "quantity", "quantityOverridden", "rcv", "revisionId", "sortOrder", "taxAmount", "taxRatePercent", "taxable", "taxableMaterialAmount", "unit", "unitPrice", "updatedAt" FROM "EstimateLineItem";
DROP TABLE "EstimateLineItem";
ALTER TABLE "new_EstimateLineItem" RENAME TO "EstimateLineItem";
CREATE TABLE "new_EstimateRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "label" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "wastePercent" REAL NOT NULL DEFAULT 12,
    "taxRatePercent" REAL NOT NULL DEFAULT 8.5,
    "defaultDepreciationPercent" REAL NOT NULL DEFAULT 0,
    "deductible" REAL NOT NULL DEFAULT 0,
    "priorPayments" REAL NOT NULL DEFAULT 0,
    "overheadProfitPercent" REAL NOT NULL DEFAULT 0,
    "showOverheadProfitOnCustomerPdf" BOOLEAN NOT NULL DEFAULT false,
    "steepSlopePitchThreshold" TEXT NOT NULL DEFAULT '7/12',
    "roundingMode" TEXT NOT NULL DEFAULT 'nearest_cent',
    "retailTierKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EstimateRevision_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EstimateRevision" ("claimId", "createdAt", "deductible", "defaultDepreciationPercent", "id", "label", "priorPayments", "revisionNumber", "status", "taxRatePercent", "updatedAt", "wastePercent") SELECT "claimId", "createdAt", "deductible", "defaultDepreciationPercent", "id", "label", "priorPayments", "revisionNumber", "status", "taxRatePercent", "updatedAt", "wastePercent" FROM "EstimateRevision";
DROP TABLE "EstimateRevision";
ALTER TABLE "new_EstimateRevision" RENAME TO "EstimateRevision";
CREATE UNIQUE INDEX "EstimateRevision_claimId_revisionNumber_key" ON "EstimateRevision"("claimId", "revisionNumber");
CREATE TABLE "new_PriceListItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "defaultUnitPrice" REAL NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "defaultDepreciationPercent" REAL NOT NULL DEFAULT 0,
    "codeCitation" TEXT,
    "calcRule" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "state" TEXT,
    "insuranceUnitPrice" REAL,
    "retailUnitPrice" REAL,
    "internalCostPrice" REAL,
    "manufacturer" TEXT,
    "productName" TEXT,
    "technicalFunction" TEXT,
    "reasonSelected" TEXT,
    "compatibleSystems" TEXT,
    "applicablePitches" TEXT,
    "climateSuitability" TEXT,
    "codeRelevance" TEXT,
    "installReference" TEXT,
    "warrantyRelevance" TEXT,
    "dataSheetUrl" TEXT,
    "infoVerifiedDate" DATETIME,
    "standardOrUpgrade" TEXT NOT NULL DEFAULT 'standard',
    "retailTierKeys" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PriceListItem" ("active", "calcRule", "category", "code", "codeCitation", "createdAt", "defaultDepreciationPercent", "defaultUnitPrice", "description", "id", "sortOrder", "taxable", "unit", "updatedAt") SELECT "active", "calcRule", "category", "code", "codeCitation", "createdAt", "defaultDepreciationPercent", "defaultUnitPrice", "description", "id", "sortOrder", "taxable", "unit", "updatedAt" FROM "PriceListItem";
DROP TABLE "PriceListItem";
ALTER TABLE "new_PriceListItem" RENAME TO "PriceListItem";
CREATE UNIQUE INDEX "PriceListItem_code_state_key" ON "PriceListItem"("code", "state");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeCheckoutSessionId_key" ON "Order"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_claimId_key" ON "Order"("claimId");

-- CreateIndex
CREATE UNIQUE INDEX "RetailTier_key_key" ON "RetailTier"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RetailIntake_claimId_key" ON "RetailIntake"("claimId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_secureTokenHash_key" ON "GeneratedDocument"("secureTokenHash");

