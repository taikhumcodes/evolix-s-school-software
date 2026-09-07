-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "CommunicationCategory" AS ENUM ('ATTENDANCE', 'FEES', 'ADMISSION', 'ACADEMIC', 'EXAM', 'RESULT', 'HR', 'PAYROLL', 'TRANSPORT', 'EVENT', 'GENERAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TemplateLanguage" AS ENUM ('ENGLISH', 'HINDI', 'HINGLISH');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('DRAFT', 'QUEUED', 'PROCESSING', 'PREPARED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED', 'SKIPPED', 'PROVIDER_NOT_CONFIGURED', 'MANUAL_ACTION_REQUIRED');

-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('USER', 'GUARDIAN', 'EMPLOYEE', 'STUDENT_GUARDIAN', 'CUSTOM_INTERNAL_TARGET');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SendEvidenceType" AS ENUM ('PROVIDER_ACCEPTED', 'MANUAL_CONFIRMED', 'PROVIDER_DELIVERED', 'IN_APP_READ');

-- CreateEnum
CREATE TYPE "AutomationEventType" AS ENUM ('STUDENT_ABSENT', 'FEE_INVOICE_GENERATED', 'PAYMENT_RECEIVED', 'EXAM_RESULT_PUBLISHED', 'PAYSLIP_GENERATED', 'STUDENT_NOT_BOARDED_BUS', 'DOCUMENT_EXPIRING', 'EVENT_SCHEDULED', 'GATE_VISITOR_CHECKED_IN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AutomationConditionOperator" AS ENUM ('EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL', 'CONTAINS', 'IN', 'NOT_IN');

-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('SEND_COMMUNICATION', 'CREATE_IN_APP_NOTIFICATION', 'CREATE_INTERNAL_TASK', 'DEFER_COMMUNICATION');

-- CreateEnum
CREATE TYPE "EventProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "communication_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "category" "CommunicationCategory" NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "subject" VARCHAR(255),
    "body" TEXT NOT NULL,
    "language" "TemplateLanguage" NOT NULL DEFAULT 'ENGLISH',
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_template_versions" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "subject" VARCHAR(255),
    "body" TEXT NOT NULL,
    "language" "TemplateLanguage" NOT NULL DEFAULT 'ENGLISH',
    "change_summary" VARCHAR(255),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_preferences" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "recipient_type" "RecipientType" NOT NULL,
    "recipient_reference_id" UUID NOT NULL,
    "category" "CommunicationCategory" NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "preferred_language" "TemplateLanguage" NOT NULL DEFAULT 'ENGLISH',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_batches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" "CommunicationCategory" NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "template_id" UUID,
    "template_version" INTEGER,
    "audience_definition_safe_json" JSONB NOT NULL,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "prepared_count" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "status" "BatchStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "approved_by" UUID,
    "created_by" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_messages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "batch_id" UUID,
    "template_id" UUID,
    "template_version" INTEGER,
    "category" "CommunicationCategory" NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "recipient_type" "RecipientType" NOT NULL,
    "recipient_reference_id" UUID NOT NULL,
    "destination_encrypted" TEXT,
    "destination_masked" VARCHAR(100),
    "subject_rendered" VARCHAR(255),
    "body_rendered" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "send_evidence_type" "SendEvidenceType",
    "delivery_mode" VARCHAR(50) DEFAULT 'AUTOMATIC',
    "manual_confirmed_at" TIMESTAMP(3),
    "manual_confirmed_by" UUID,
    "scheduled_at" TIMESTAMP(3),
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "provider" VARCHAR(50),
    "provider_message_id" VARCHAR(150),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "last_error_code" VARCHAR(100),
    "last_error_message" VARCHAR(255),
    "source_type" VARCHAR(50),
    "source_id" UUID,
    "idempotency_key" VARCHAR(150),
    "is_test" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_delivery_attempts" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "result_status" "MessageStatus" NOT NULL,
    "error_code" VARCHAR(100),
    "error_message" VARCHAR(255),
    "provider_message_id" VARCHAR(150),
    "safe_metadata" JSONB,

    CONSTRAINT "communication_delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "in_app_notifications" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "body" TEXT NOT NULL,
    "category" "CommunicationCategory" NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "action_url" VARCHAR(255),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "source_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_settings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "default_channels" JSONB NOT NULL DEFAULT '["IN_APP"]',
    "quiet_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
    "quiet_hours_start" VARCHAR(10) NOT NULL DEFAULT '21:00',
    "quiet_hours_end" VARCHAR(10) NOT NULL DEFAULT '07:00',
    "bulk_approval_threshold" INTEGER NOT NULL DEFAULT 100,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "event_type" "AutomationEventType" NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "source_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "processing_status" "EventProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "locked_by" VARCHAR(100),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "processed_at" TIMESTAMP(3),
    "last_error" TEXT,
    "is_test" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "event_type" "AutomationEventType" NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_executions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "rule_version" INTEGER NOT NULL,
    "status" "EventProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "skip_reason" VARCHAR(100),
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_action_executions" (
    "id" UUID NOT NULL,
    "execution_id" UUID NOT NULL,
    "action_index" INTEGER NOT NULL,
    "action_type" "AutomationActionType" NOT NULL,
    "status" "EventProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "target_entity" VARCHAR(50),
    "target_id" UUID,
    "output_data" JSONB,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "automation_action_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_automation_jobs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "job_type" VARCHAR(50) NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "source_id" UUID NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "idempotency_key" VARCHAR(150),
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "locked_at" TIMESTAMP(3),
    "locked_by" VARCHAR(100),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "defer_count" INTEGER NOT NULL DEFAULT 0,
    "max_defers" INTEGER NOT NULL DEFAULT 3,
    "completed_at" TIMESTAMP(3),
    "last_error" TEXT,
    "skip_reason" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_automation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_tasks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    "assigned_role" VARCHAR(50),
    "assigned_user_id" UUID,
    "due_date" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "source_execution_id" UUID,
    "source_action_index" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "communication_templates_tenant_id_school_id_category_channe_idx" ON "communication_templates"("tenant_id", "school_id", "category", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "communication_templates_school_id_code_key" ON "communication_templates"("school_id", "code");

-- CreateIndex
CREATE INDEX "communication_template_versions_template_id_idx" ON "communication_template_versions"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "communication_template_versions_template_id_version_key" ON "communication_template_versions"("template_id", "version");

-- CreateIndex
CREATE INDEX "communication_preferences_tenant_id_school_id_recipient_ref_idx" ON "communication_preferences"("tenant_id", "school_id", "recipient_reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "communication_preferences_school_id_recipient_type_recipien_key" ON "communication_preferences"("school_id", "recipient_type", "recipient_reference_id", "category", "channel");

-- CreateIndex
CREATE INDEX "communication_batches_tenant_id_school_id_status_created_at_idx" ON "communication_batches"("tenant_id", "school_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "communication_messages_idempotency_key_key" ON "communication_messages"("idempotency_key");

-- CreateIndex
CREATE INDEX "communication_messages_tenant_id_school_id_status_scheduled_idx" ON "communication_messages"("tenant_id", "school_id", "status", "scheduled_at");

-- CreateIndex
CREATE INDEX "communication_messages_school_id_recipient_reference_id_idx" ON "communication_messages"("school_id", "recipient_reference_id");

-- CreateIndex
CREATE INDEX "communication_messages_school_id_source_type_source_id_idx" ON "communication_messages"("school_id", "source_type", "source_id");

-- CreateIndex
CREATE INDEX "communication_delivery_attempts_message_id_attempt_number_idx" ON "communication_delivery_attempts"("message_id", "attempt_number");

-- CreateIndex
CREATE INDEX "in_app_notifications_user_id_is_read_created_at_idx" ON "in_app_notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "in_app_notifications_school_id_entity_type_entity_id_idx" ON "in_app_notifications"("school_id", "entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "communication_settings_school_id_key" ON "communication_settings"("school_id");

-- CreateIndex
CREATE INDEX "domain_events_tenant_id_school_id_processing_status_occurre_idx" ON "domain_events"("tenant_id", "school_id", "processing_status", "occurred_at");

-- CreateIndex
CREATE INDEX "domain_events_processing_status_locked_at_idx" ON "domain_events"("processing_status", "locked_at");

-- CreateIndex
CREATE INDEX "automation_rules_tenant_id_school_id_event_type_is_active_idx" ON "automation_rules"("tenant_id", "school_id", "event_type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "automation_rules_school_id_code_key" ON "automation_rules"("school_id", "code");

-- CreateIndex
CREATE INDEX "automation_executions_tenant_id_school_id_executed_at_idx" ON "automation_executions"("tenant_id", "school_id", "executed_at");

-- CreateIndex
CREATE UNIQUE INDEX "automation_executions_rule_id_event_id_rule_version_key" ON "automation_executions"("rule_id", "event_id", "rule_version");

-- CreateIndex
CREATE UNIQUE INDEX "automation_action_executions_execution_id_action_index_key" ON "automation_action_executions"("execution_id", "action_index");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_automation_jobs_idempotency_key_key" ON "scheduled_automation_jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "scheduled_automation_jobs_tenant_id_school_id_status_schedu_idx" ON "scheduled_automation_jobs"("tenant_id", "school_id", "status", "scheduled_for");

-- CreateIndex
CREATE INDEX "scheduled_automation_jobs_status_locked_at_idx" ON "scheduled_automation_jobs"("status", "locked_at");

-- CreateIndex
CREATE INDEX "automation_tasks_tenant_id_school_id_status_due_date_idx" ON "automation_tasks"("tenant_id", "school_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "automation_tasks_assigned_user_id_status_idx" ON "automation_tasks"("assigned_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "automation_tasks_source_execution_id_source_action_index_key" ON "automation_tasks"("source_execution_id", "source_action_index");

-- AddForeignKey
ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_template_versions" ADD CONSTRAINT "communication_template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "communication_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_template_versions" ADD CONSTRAINT "communication_template_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_batches" ADD CONSTRAINT "communication_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_batches" ADD CONSTRAINT "communication_batches_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_batches" ADD CONSTRAINT "communication_batches_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "communication_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_batches" ADD CONSTRAINT "communication_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_batches" ADD CONSTRAINT "communication_batches_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "communication_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "communication_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_delivery_attempts" ADD CONSTRAINT "communication_delivery_attempts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "communication_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_settings" ADD CONSTRAINT "communication_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_settings" ADD CONSTRAINT "communication_settings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "domain_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_action_executions" ADD CONSTRAINT "automation_action_executions_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "automation_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_automation_jobs" ADD CONSTRAINT "scheduled_automation_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_automation_jobs" ADD CONSTRAINT "scheduled_automation_jobs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_tasks" ADD CONSTRAINT "automation_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_tasks" ADD CONSTRAINT "automation_tasks_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_tasks" ADD CONSTRAINT "automation_tasks_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

