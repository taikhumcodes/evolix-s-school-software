-- CreateEnum
CREATE TYPE "ReportVisibility" AS ENUM ('PRIVATE', 'SCHOOL_SHARED');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NOT_CONFIGURED');

-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('FULL', 'SCHEMA_ONLY', 'DATA_ONLY');

-- CreateTable
CREATE TABLE "saved_reports" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dataset" VARCHAR(100) NOT NULL,
    "dimensions_json" JSONB NOT NULL,
    "metrics_json" JSONB NOT NULL,
    "filters_json" JSONB NOT NULL,
    "sort_json" JSONB NOT NULL,
    "visualization" VARCHAR(50) NOT NULL DEFAULT 'TABLE',
    "visibility" "ReportVisibility" NOT NULL DEFAULT 'PRIVATE',
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_exports" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID,
    "export_version" VARCHAR(50) NOT NULL,
    "app_version" VARCHAR(50) NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "private_storage_reference" TEXT,
    "checksum" VARCHAR(255),
    "size_bytes" BIGINT,
    "included_datasets" JSONB NOT NULL,
    "created_by" UUID,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_records" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "type" "BackupType" NOT NULL DEFAULT 'FULL',
    "status" "BackupStatus" NOT NULL DEFAULT 'PENDING',
    "private_storage_reference" TEXT,
    "checksum" VARCHAR(255),
    "size_bytes" BIGINT,
    "created_by" UUID,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_reports_tenant_id_school_id_dataset_idx" ON "saved_reports"("tenant_id", "school_id", "dataset");

-- CreateIndex
CREATE INDEX "data_exports_tenant_id_school_id_status_idx" ON "data_exports"("tenant_id", "school_id", "status");

-- CreateIndex
CREATE INDEX "backup_records_status_created_at_idx" ON "backup_records"("status", "created_at");

-- AddForeignKey
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_records" ADD CONSTRAINT "backup_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

