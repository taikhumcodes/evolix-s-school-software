-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BONAFIDE_CERTIFICATE', 'TRANSFER_CERTIFICATE', 'CHARACTER_CERTIFICATE', 'STUDENT_ID_CARD', 'ADMISSION_FORM', 'STUDENT_PROFILE', 'REPORT_CARD', 'EXAM_RESULT', 'MARKS_STATEMENT', 'FEE_RECEIPT', 'FEE_STATEMENT', 'STUDENT_LEDGER_STATEMENT', 'EMPLOYEE_ID_CARD', 'EMPLOYMENT_CERTIFICATE', 'EXPERIENCE_CERTIFICATE', 'SALARY_CERTIFICATE', 'APPOINTMENT_LETTER', 'RELIEVING_LETTER', 'PAYSLIP', 'ROUTE_MANIFEST', 'VISITOR_PASS', 'STUDENT_PICKUP_RECORD', 'EVENT_PARTICIPANT_LIST', 'GENERAL_LETTER', 'CUSTOM_CERTIFICATE');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('STUDENT', 'ACADEMIC', 'FINANCE', 'HR', 'PAYROLL', 'OPERATIONS', 'GENERAL');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'GENERATED', 'FINALIZED', 'CANCELLED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "NumberingPolicy" AS ENUM ('NUMBER_SERIES_ON_FINALIZE', 'SOURCE_NUMBER', 'NO_OFFICIAL_NUMBER');

-- CreateEnum
CREATE TYPE "SignatureAssetType" AS ENUM ('SIGNATURE', 'STAMP', 'SEAL');

-- CreateEnum
CREATE TYPE "DocumentActionType" AS ENUM ('GENERATED', 'FINALIZED', 'PRINTED', 'DOWNLOADED', 'REPRINTED', 'CANCELLED', 'SUPERSEDED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "BulkJobStatus" AS ENUM ('DRAFT', 'QUEUED', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BulkItemStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "document_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "page_size" VARCHAR(20) NOT NULL DEFAULT 'A4',
    "orientation" VARCHAR(20) NOT NULL DEFAULT 'PORTRAIT',
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "current_version_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_template_versions" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "layout_definition" JSONB NOT NULL,
    "content_definition" JSONB,
    "variable_schema" JSONB,
    "style_definition" JSONB,
    "page_settings" JSONB,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_signature_assets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "asset_type" "SignatureAssetType" NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "owner_employee_id" UUID,
    "designation_label" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_signature_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "numbering_policy" "NumberingPolicy" NOT NULL DEFAULT 'NUMBER_SERIES_ON_FINALIZE',
    "template_id" UUID NOT NULL,
    "template_version_id" UUID NOT NULL,
    "document_number" VARCHAR(100),
    "source_type" VARCHAR(50) NOT NULL,
    "source_id" UUID NOT NULL,
    "recipient_type" VARCHAR(50),
    "recipient_id" UUID,
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "data_snapshot_json" JSONB NOT NULL,
    "rendered_metadata_json" JSONB,
    "storage_key" VARCHAR(500),
    "checksum_sha256" VARCHAR(64),
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "verification_token_hash" VARCHAR(64),
    "reprint_count" INTEGER NOT NULL DEFAULT 0,
    "generated_by" UUID,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" UUID,
    "cancellation_reason" TEXT,
    "supersedes_document_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_action_logs" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "action" "DocumentActionType" NOT NULL,
    "actor_id" UUID,
    "ip_address" VARCHAR(50),
    "user_agent" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_document_jobs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "document_template_id" UUID NOT NULL,
    "template_version_id" UUID NOT NULL,
    "source_selection_safe_json" JSONB NOT NULL,
    "status" "BulkJobStatus" NOT NULL DEFAULT 'DRAFT',
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "processed_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_document_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_document_job_items" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "source_id" UUID NOT NULL,
    "status" "BulkItemStatus" NOT NULL DEFAULT 'PENDING',
    "generated_document_id" UUID,
    "error_code" VARCHAR(100),
    "error_message" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_document_job_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_templates_tenant_id_school_id_document_type_status_idx" ON "document_templates"("tenant_id", "school_id", "document_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "document_templates_school_id_code_key" ON "document_templates"("school_id", "code");

-- CreateIndex
CREATE INDEX "document_template_versions_template_id_is_published_idx" ON "document_template_versions"("template_id", "is_published");

-- CreateIndex
CREATE UNIQUE INDEX "document_template_versions_template_id_version_number_key" ON "document_template_versions"("template_id", "version_number");

-- CreateIndex
CREATE INDEX "document_signature_assets_tenant_id_school_id_asset_type_is_idx" ON "document_signature_assets"("tenant_id", "school_id", "asset_type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "generated_documents_verification_token_hash_key" ON "generated_documents"("verification_token_hash");

-- CreateIndex
CREATE INDEX "generated_documents_tenant_id_school_id_document_type_statu_idx" ON "generated_documents"("tenant_id", "school_id", "document_type", "status");

-- CreateIndex
CREATE INDEX "generated_documents_source_type_source_id_idx" ON "generated_documents"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "generated_documents_school_id_document_number_idx" ON "generated_documents"("school_id", "document_number");

-- CreateIndex
CREATE INDEX "generated_documents_status_finalized_at_idx" ON "generated_documents"("status", "finalized_at");

-- CreateIndex
CREATE INDEX "document_action_logs_document_id_action_idx" ON "document_action_logs"("document_id", "action");

-- CreateIndex
CREATE INDEX "document_action_logs_school_id_created_at_idx" ON "document_action_logs"("school_id", "created_at");

-- CreateIndex
CREATE INDEX "bulk_document_jobs_tenant_id_school_id_status_idx" ON "bulk_document_jobs"("tenant_id", "school_id", "status");

-- CreateIndex
CREATE INDEX "bulk_document_job_items_job_id_status_idx" ON "bulk_document_job_items"("job_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bulk_document_job_items_job_id_source_type_source_id_key" ON "bulk_document_job_items"("job_id", "source_type", "source_id");

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_template_versions" ADD CONSTRAINT "document_template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signature_assets" ADD CONSTRAINT "document_signature_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signature_assets" ADD CONSTRAINT "document_signature_assets_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "document_template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_supersedes_document_id_fkey" FOREIGN KEY ("supersedes_document_id") REFERENCES "generated_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_action_logs" ADD CONSTRAINT "document_action_logs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "generated_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_document_jobs" ADD CONSTRAINT "bulk_document_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_document_jobs" ADD CONSTRAINT "bulk_document_jobs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_document_jobs" ADD CONSTRAINT "bulk_document_jobs_document_template_id_fkey" FOREIGN KEY ("document_template_id") REFERENCES "document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_document_jobs" ADD CONSTRAINT "bulk_document_jobs_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "document_template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_document_job_items" ADD CONSTRAINT "bulk_document_job_items_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "bulk_document_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_document_job_items" ADD CONSTRAINT "bulk_document_job_items_generated_document_id_fkey" FOREIGN KEY ("generated_document_id") REFERENCES "generated_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

