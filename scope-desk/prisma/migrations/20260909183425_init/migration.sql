-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'estimator',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Property_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "insuranceCarrier" TEXT,
    "claimNumber" TEXT,
    "policyNumber" TEXT,
    "dateOfLoss" DATETIME,
    "estimator" TEXT,
    "inspectionDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Claim_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Claim_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UploadedFile_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeasurementReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "sourceFileId" TEXT NOT NULL,
    "parserType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rawText" TEXT,
    "extracted" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeasurementReport_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeasurementReport_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "UploadedFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "roofAreaSqFt" REAL,
    "measuredSquares" REAL,
    "facets" INTEGER,
    "predominantPitch" TEXT,
    "pitchAreasJson" TEXT,
    "eaves" REAL,
    "rakes" REAL,
    "ridges" REAL,
    "hips" REAL,
    "valleys" REAL,
    "starterLength" REAL,
    "dripEdgeLength" REAL,
    "flashingLength" REAL,
    "stepFlashingLength" REAL,
    "apronFlashingLength" REAL,
    "leakBarrierLength" REAL,
    "twoStoryAreaSqFt" REAL,
    "steepSlopeAreaSqFt" REAL,
    "wastePercent" REAL DEFAULT 12,
    "fieldSourceJson" TEXT,
    "originalValuesJson" TEXT,
    "membraneWidthFeet" REAL DEFAULT 3,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Measurement_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Accessory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'ea',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Accessory_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionFinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT,
    "damageType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InspectionFinding_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "caption" TEXT,
    "damageClassification" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Photo_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "UploadedFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceListItem" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EstimateRevision" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EstimateRevision_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EstimateLineItem" (
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
    "depreciationPercent" REAL NOT NULL DEFAULT 0,
    "depreciationAmount" REAL NOT NULL DEFAULT 0,
    "acv" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "codeCitation" TEXT,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "priceListItemCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EstimateLineItem_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "EstimateRevision" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CodeReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "authorityHavingJurisdiction" TEXT,
    "departmentContact" TEXT,
    "adoptedCodeEdition" TEXT,
    "localAmendments" TEXT,
    "permitRequirements" TEXT,
    "permitFees" TEXT,
    "iceBarrierRequirement" TEXT,
    "dripEdgeRequirement" TEXT,
    "valleyLiningRequirement" TEXT,
    "underlaymentRequirement" TEXT,
    "ventilationRequirement" TEXT,
    "chimneyCricketRequirement" TEXT,
    "reRoofLayerLimitation" TEXT,
    "deckingRequirement" TEXT,
    "sourceUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationDate" DATETIME,
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CodeReport_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeatherEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "eventType" TEXT NOT NULL,
    "hailSizeInches" REAL,
    "windSpeedMph" REAL,
    "distanceFromPropertyMiles" REAL,
    "evidenceLevel" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "confidenceLevel" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeatherEvent_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "revisionId" TEXT,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Supplement_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CarrierEstimateItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplementId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" REAL NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CarrierEstimateItem_supplementId_fkey" FOREIGN KEY ("supplementId") REFERENCES "Supplement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplementMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplementId" TEXT NOT NULL,
    "contractorLineItemId" TEXT,
    "contractorDescription" TEXT NOT NULL,
    "contractorQuantity" REAL NOT NULL,
    "contractorUnit" TEXT NOT NULL,
    "contractorUnitPrice" REAL NOT NULL,
    "carrierItemId" TEXT,
    "reasonForSupplement" TEXT,
    "supportingCodeOrPhoto" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplementMatch_supplementId_fkey" FOREIGN KEY ("supplementId") REFERENCES "Supplement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupplementMatch_carrierItemId_fkey" FOREIGN KEY ("carrierItemId") REFERENCES "CarrierEstimateItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "revisionId" TEXT,
    "storageKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedDocument_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MeasurementReport_sourceFileId_key" ON "MeasurementReport"("sourceFileId");

-- CreateIndex
CREATE UNIQUE INDEX "Measurement_claimId_key" ON "Measurement"("claimId");

-- CreateIndex
CREATE UNIQUE INDEX "Photo_fileId_key" ON "Photo"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceListItem_code_key" ON "PriceListItem"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EstimateRevision_claimId_revisionNumber_key" ON "EstimateRevision"("claimId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CodeReport_claimId_key" ON "CodeReport"("claimId");
