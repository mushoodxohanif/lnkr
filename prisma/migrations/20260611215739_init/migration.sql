-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'QUALIFIED', 'ARCHIVED', 'SENT', 'SKIPPED', 'SNOOZED');

-- CreateEnum
CREATE TYPE "TimingSignal" AS ENUM ('HOT', 'WARM', 'COLD');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'COPIED', 'SENT');

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "valueProps" JSONB NOT NULL DEFAULT '[]',
    "targetIndustries" JSONB NOT NULL DEFAULT '[]',
    "targetPersonas" JSONB NOT NULL DEFAULT '[]',
    "caseStudies" JSONB NOT NULL DEFAULT '[]',
    "pricingTierHints" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ICPCriteria" (
    "id" TEXT NOT NULL,
    "titles" JSONB NOT NULL DEFAULT '[]',
    "seniorityLevels" JSONB NOT NULL DEFAULT '[]',
    "companySizeMin" INTEGER,
    "companySizeMax" INTEGER,
    "industries" JSONB NOT NULL DEFAULT '[]',
    "techStack" JSONB NOT NULL DEFAULT '[]',
    "geo" JSONB NOT NULL DEFAULT '[]',
    "exclusionRules" JSONB NOT NULL DEFAULT '{}',
    "weights" JSONB NOT NULL DEFAULT '{}',
    "fitThreshold" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ICPCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "linkedInUrl" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT,
    "title" TEXT,
    "company" TEXT,
    "location" TEXT,
    "snListSource" TEXT,
    "rawProfileSnapshot" JSONB,
    "recentPosts" JSONB,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "scrapedAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "companyEnrichmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyEnrichment" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "companyName" TEXT,
    "employeeCount" INTEGER,
    "industry" TEXT,
    "funding" JSONB,
    "techStack" JSONB,
    "signals" JSONB,
    "enrichedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyEnrichment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadScore" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fitPercent" DOUBLE PRECISION NOT NULL,
    "dimensionScores" JSONB NOT NULL DEFAULT '{}',
    "fitReasons" JSONB NOT NULL DEFAULT '[]',
    "disqualifiers" JSONB NOT NULL DEFAULT '[]',
    "painPoints" JSONB NOT NULL DEFAULT '[]',
    "recommendedOffer" TEXT,
    "timingSignal" "TimingSignal" NOT NULL DEFAULT 'WARM',
    "priorityRank" INTEGER,
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedContent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "warmingComment" TEXT,
    "connectionNote" VARCHAR(300),
    "painPoints" JSONB,
    "personalizationHooks" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyBatch" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "top50LeadIds" JSONB NOT NULL DEFAULT '[]',
    "runMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyBatchLead" (
    "id" TEXT NOT NULL,
    "dailyBatchId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "DailyBatchLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnListConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SnListConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoNotContact" (
    "id" TEXT NOT NULL,
    "linkedInUrl" TEXT,
    "email" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoNotContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "instructions" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_linkedInUrl_key" ON "Lead"("linkedInUrl");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_scrapedAt_idx" ON "Lead"("scrapedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyEnrichment_domain_key" ON "CompanyEnrichment"("domain");

-- CreateIndex
CREATE INDEX "LeadScore_leadId_scoredAt_idx" ON "LeadScore"("leadId", "scoredAt");

-- CreateIndex
CREATE INDEX "LeadScore_fitPercent_idx" ON "LeadScore"("fitPercent");

-- CreateIndex
CREATE INDEX "LeadScore_priorityRank_idx" ON "LeadScore"("priorityRank");

-- CreateIndex
CREATE INDEX "GeneratedContent_leadId_idx" ON "GeneratedContent"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyBatch_date_key" ON "DailyBatch"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyBatchLead_dailyBatchId_leadId_key" ON "DailyBatchLead"("dailyBatchId", "leadId");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SnListConfig_url_key" ON "SnListConfig"("url");

-- CreateIndex
CREATE UNIQUE INDEX "DoNotContact_linkedInUrl_key" ON "DoNotContact"("linkedInUrl");

-- CreateIndex
CREATE UNIQUE INDEX "DoNotContact_email_key" ON "DoNotContact"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_key_key" ON "PromptTemplate"("key");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_companyEnrichmentId_fkey" FOREIGN KEY ("companyEnrichmentId") REFERENCES "CompanyEnrichment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadScore" ADD CONSTRAINT "LeadScore_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedContent" ADD CONSTRAINT "GeneratedContent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyBatchLead" ADD CONSTRAINT "DailyBatchLead_dailyBatchId_fkey" FOREIGN KEY ("dailyBatchId") REFERENCES "DailyBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyBatchLead" ADD CONSTRAINT "DailyBatchLead_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
