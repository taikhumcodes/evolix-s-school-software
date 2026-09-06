-- AlterTable
ALTER TABLE "journal_lines" ADD COLUMN     "employee_id" UUID;

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "employee_number" VARCHAR(50) NOT NULL,
    "user_id" UUID,
    "first_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "last_name" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "gender" VARCHAR(20),
    "date_of_birth" DATE,
    "phone" VARCHAR(30) NOT NULL,
    "alternate_phone" VARCHAR(30),
    "email" VARCHAR(150) NOT NULL,
    "permanent_address" TEXT,
    "current_address" TEXT,
    "emergency_contact_name" VARCHAR(100),
    "emergency_contact_phone" VARCHAR(30),
    "emergency_contact_relation" VARCHAR(50),
    "blood_group" VARCHAR(10),
    "marital_status" VARCHAR(20),
    "nationality" VARCHAR(50) NOT NULL DEFAULT 'Indian',
    "joining_date" DATE NOT NULL,
    "confirmation_date" DATE,
    "probation_period_months" INTEGER,
    "employment_type" VARCHAR(30) NOT NULL DEFAULT 'PERMANENT',
    "department_id" UUID,
    "designation_id" UUID,
    "reporting_manager_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "exit_date" DATE,
    "exit_reason" VARCHAR(255),
    "profile_photo_key" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_histories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "company_name" VARCHAR(150) NOT NULL,
    "designation" VARCHAR(100) NOT NULL,
    "department" VARCHAR(100),
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "remarks" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "document_type" VARCHAR(50) NOT NULL,
    "document_number" VARCHAR(100),
    "file_key" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100),
    "file_size" INTEGER,
    "expiry_date" DATE,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "verified_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_emergency_contacts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "relation" VARCHAR(50) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "alternate_phone" VARCHAR(30),
    "email" VARCHAR(150),
    "address" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_bank_accounts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "account_holder_name" VARCHAR(150) NOT NULL,
    "bank_name" VARCHAR(100) NOT NULL,
    "branch_name" VARCHAR(100),
    "encrypted_account_number" TEXT NOT NULL,
    "masked_account_number" VARCHAR(30) NOT NULL,
    "ifsc_code" VARCHAR(30) NOT NULL,
    "account_type" VARCHAR(30) NOT NULL DEFAULT 'SAVINGS',
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_leave_types" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "category" VARCHAR(30) NOT NULL DEFAULT 'CASUAL',
    "annual_quota" DECIMAL(5,1) NOT NULL,
    "accrual_frequency" VARCHAR(20) NOT NULL DEFAULT 'ANNUAL',
    "allow_carry_forward" BOOLEAN NOT NULL DEFAULT false,
    "max_carry_forward_days" DECIMAL(5,1),
    "allow_encashment" BOOLEAN NOT NULL DEFAULT false,
    "is_unpaid" BOOLEAN NOT NULL DEFAULT false,
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_leave_balances" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "entitlement_period" VARCHAR(50) NOT NULL,
    "allocated_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "used_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "pending_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "carry_forward_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "closing_balance" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balance_transactions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "entitlement_period" VARCHAR(50) NOT NULL,
    "transaction_type" VARCHAR(30) NOT NULL,
    "days" DECIMAL(5,1) NOT NULL,
    "balance_after" DECIMAL(5,1) NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "source_id" UUID,
    "remarks" VARCHAR(255),
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_balance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_components" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "calculation_type" VARCHAR(30) NOT NULL,
    "formula_expression" VARCHAR(255),
    "depends_on_component_id" UUID,
    "is_taxable" BOOLEAN NOT NULL DEFAULT true,
    "is_statutory" BOOLEAN NOT NULL DEFAULT false,
    "affects_gross" BOOLEAN NOT NULL DEFAULT true,
    "affects_net" BOOLEAN NOT NULL DEFAULT true,
    "gl_account_id" UUID,
    "employer_liability_account_id" UUID,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_structures" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_structure_components" (
    "id" UUID NOT NULL,
    "salary_structure_id" UUID NOT NULL,
    "component_id" UUID NOT NULL,
    "calculation_type" VARCHAR(30),
    "flat_amount" DECIMAL(12,2),
    "percentage_value" DECIMAL(6,3),
    "formula_expression" VARCHAR(255),
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "salary_structure_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_salary_assignments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "salary_structure_id" UUID NOT NULL,
    "base_salary" DECIMAL(12,2) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "remarks" VARCHAR(255),
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_salary_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_configurations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "pay_frequency" VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    "pay_day" INTEGER NOT NULL DEFAULT 30,
    "proration_basis" VARCHAR(30) NOT NULL DEFAULT 'WORKING_DAYS',
    "attendance_cutoff_day" INTEGER NOT NULL DEFAULT 25,
    "default_expense_account_id" UUID,
    "default_payable_account_id" UUID,
    "default_disbursement_account_id" UUID,
    "epf_enabled" BOOLEAN NOT NULL DEFAULT false,
    "epf_employer_rate" DECIMAL(5,2),
    "epf_employee_rate" DECIMAL(5,2),
    "esic_enabled" BOOLEAN NOT NULL DEFAULT false,
    "esic_employer_rate" DECIMAL(5,2),
    "esic_employee_rate" DECIMAL(5,2),
    "tds_enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_lock_after_days" INTEGER NOT NULL DEFAULT 7,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "financial_year_id" UUID NOT NULL,
    "period_number" INTEGER NOT NULL,
    "period_name" VARCHAR(100) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "pay_date" DATE NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "closed_at" TIMESTAMP(3),
    "closed_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "period_id" UUID NOT NULL,
    "financial_year_id" UUID NOT NULL,
    "run_number" VARCHAR(50) NOT NULL,
    "run_type" VARCHAR(30) NOT NULL DEFAULT 'REGULAR',
    "status" VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "calculation_basis" VARCHAR(30) NOT NULL DEFAULT 'WORKING_DAYS',
    "total_employees" INTEGER NOT NULL DEFAULT 0,
    "total_gross" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_employer_contributions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_net_pay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_remaining_payable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "journal_entry_id" UUID,
    "reversal_journal_entry_id" UUID,
    "reversal_reason" VARCHAR(255),
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMP(3),
    "posted_by_user_id" UUID,
    "posted_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "reversed_at" TIMESTAMP(3),
    "reversed_by_user_id" UUID,
    "remarks" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_run_employees" (
    "id" UUID NOT NULL,
    "payroll_run_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "salary_structure_id" UUID,
    "base_salary" DECIMAL(12,2) NOT NULL,
    "working_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "present_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "paid_leave_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "absent_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "unpaid_leave_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "loss_of_pay_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "gross_earnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "employer_contributions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remaining_payable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_status" VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    "calculation_snapshot" JSONB NOT NULL,
    "remarks" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_run_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_line_items" (
    "id" UUID NOT NULL,
    "payroll_run_employee_id" UUID NOT NULL,
    "component_id" UUID NOT NULL,
    "component_name" VARCHAR(100) NOT NULL,
    "component_code" VARCHAR(50) NOT NULL,
    "component_type" VARCHAR(30) NOT NULL,
    "calculated_amount" DECIMAL(12,2) NOT NULL,
    "rate_applied" DECIMAL(6,3),
    "remarks" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_adjustments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "period_id" UUID NOT NULL,
    "payroll_run_id" UUID,
    "type" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "applied_in_run_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_payments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "payroll_run_id" UUID NOT NULL,
    "payment_number" VARCHAR(50) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "payment_method" VARCHAR(30) NOT NULL,
    "disbursing_account_id" UUID NOT NULL,
    "bank_account_id" UUID,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "reference_number" VARCHAR(100),
    "remarks" VARCHAR(255),
    "idempotency_key" VARCHAR(100),
    "journal_entry_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_payment_allocations" (
    "id" UUID NOT NULL,
    "payroll_payment_id" UUID NOT NULL,
    "payroll_run_employee_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_separations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "notice_date" DATE NOT NULL,
    "resignation_date" DATE,
    "expected_last_working_date" DATE NOT NULL,
    "actual_last_working_date" DATE,
    "separation_type" VARCHAR(30) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'INITIATED',
    "clearance_status" JSONB,
    "gratuity_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "encashment_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notice_pay_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_additions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "final_payable_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "settlement_payroll_run_id" UUID,
    "remarks" VARCHAR(255),
    "initiated_by_user_id" UUID NOT NULL,
    "settled_by_user_id" UUID,
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_separations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");

-- CreateIndex
CREATE INDEX "employees_tenant_id_school_id_status_idx" ON "employees"("tenant_id", "school_id", "status");

-- CreateIndex
CREATE INDEX "employees_school_id_department_id_designation_id_idx" ON "employees"("school_id", "department_id", "designation_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_school_id_employee_number_key" ON "employees"("school_id", "employee_number");

-- CreateIndex
CREATE INDEX "employment_histories_employee_id_idx" ON "employment_histories"("employee_id");

-- CreateIndex
CREATE INDEX "employee_documents_employee_id_document_type_idx" ON "employee_documents"("employee_id", "document_type");

-- CreateIndex
CREATE INDEX "employee_emergency_contacts_employee_id_idx" ON "employee_emergency_contacts"("employee_id");

-- CreateIndex
CREATE INDEX "employee_bank_accounts_employee_id_is_primary_idx" ON "employee_bank_accounts"("employee_id", "is_primary");

-- CreateIndex
CREATE INDEX "staff_leave_types_tenant_id_school_id_is_active_idx" ON "staff_leave_types"("tenant_id", "school_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "staff_leave_types_school_id_code_key" ON "staff_leave_types"("school_id", "code");

-- CreateIndex
CREATE INDEX "employee_leave_balances_tenant_id_school_id_employee_id_idx" ON "employee_leave_balances"("tenant_id", "school_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_leave_balances_school_id_employee_id_leave_type_id_key" ON "employee_leave_balances"("school_id", "employee_id", "leave_type_id", "entitlement_period");

-- CreateIndex
CREATE INDEX "leave_balance_transactions_tenant_id_school_id_employee_id__idx" ON "leave_balance_transactions"("tenant_id", "school_id", "employee_id", "leave_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balance_transactions_school_id_source_type_source_id__key" ON "leave_balance_transactions"("school_id", "source_type", "source_id", "transaction_type");

-- CreateIndex
CREATE INDEX "salary_components_tenant_id_school_id_type_is_active_idx" ON "salary_components"("tenant_id", "school_id", "type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "salary_components_school_id_code_key" ON "salary_components"("school_id", "code");

-- CreateIndex
CREATE INDEX "salary_structures_tenant_id_school_id_is_active_idx" ON "salary_structures"("tenant_id", "school_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "salary_structures_school_id_code_key" ON "salary_structures"("school_id", "code");

-- CreateIndex
CREATE INDEX "salary_structure_components_salary_structure_id_display_ord_idx" ON "salary_structure_components"("salary_structure_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "salary_structure_components_salary_structure_id_component_i_key" ON "salary_structure_components"("salary_structure_id", "component_id");

-- CreateIndex
CREATE INDEX "employee_salary_assignments_school_id_employee_id_is_curren_idx" ON "employee_salary_assignments"("school_id", "employee_id", "is_current");

-- CreateIndex
CREATE INDEX "employee_salary_assignments_employee_id_effective_from_effe_idx" ON "employee_salary_assignments"("employee_id", "effective_from", "effective_to");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_configurations_school_id_key" ON "payroll_configurations"("school_id");

-- CreateIndex
CREATE INDEX "payroll_periods_tenant_id_school_id_is_closed_idx" ON "payroll_periods"("tenant_id", "school_id", "is_closed");

-- CreateIndex
CREATE INDEX "payroll_periods_school_id_start_date_end_date_idx" ON "payroll_periods"("school_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_school_id_financial_year_id_period_number_key" ON "payroll_periods"("school_id", "financial_year_id", "period_number");

-- CreateIndex
CREATE INDEX "payroll_runs_tenant_id_school_id_period_id_status_idx" ON "payroll_runs"("tenant_id", "school_id", "period_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_school_id_run_number_key" ON "payroll_runs"("school_id", "run_number");

-- CreateIndex
CREATE INDEX "payroll_run_employees_employee_id_payment_status_idx" ON "payroll_run_employees"("employee_id", "payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_run_employees_payroll_run_id_employee_id_key" ON "payroll_run_employees"("payroll_run_id", "employee_id");

-- CreateIndex
CREATE INDEX "payroll_line_items_payroll_run_employee_id_component_type_idx" ON "payroll_line_items"("payroll_run_employee_id", "component_type");

-- CreateIndex
CREATE INDEX "payroll_adjustments_school_id_employee_id_period_id_status_idx" ON "payroll_adjustments"("school_id", "employee_id", "period_id", "status");

-- CreateIndex
CREATE INDEX "payroll_payments_tenant_id_school_id_payroll_run_id_idx" ON "payroll_payments"("tenant_id", "school_id", "payroll_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_payments_school_id_payment_number_key" ON "payroll_payments"("school_id", "payment_number");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_payments_school_id_idempotency_key_key" ON "payroll_payments"("school_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "payroll_payment_allocations_payroll_payment_id_idx" ON "payroll_payment_allocations"("payroll_payment_id");

-- CreateIndex
CREATE INDEX "payroll_payment_allocations_payroll_run_employee_id_idx" ON "payroll_payment_allocations"("payroll_run_employee_id");

-- CreateIndex
CREATE INDEX "payroll_payment_allocations_employee_id_idx" ON "payroll_payment_allocations"("employee_id");

-- CreateIndex
CREATE INDEX "employee_separations_tenant_id_school_id_employee_id_status_idx" ON "employee_separations"("tenant_id", "school_id", "employee_id", "status");

-- CreateIndex
CREATE INDEX "journal_lines_employee_id_idx" ON "journal_lines"("employee_id");

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_reporting_manager_id_fkey" FOREIGN KEY ("reporting_manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_histories" ADD CONSTRAINT "employment_histories_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_emergency_contacts" ADD CONSTRAINT "employee_emergency_contacts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_bank_accounts" ADD CONSTRAINT "employee_bank_accounts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leave_types" ADD CONSTRAINT "staff_leave_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leave_types" ADD CONSTRAINT "staff_leave_types_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "staff_leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance_transactions" ADD CONSTRAINT "leave_balance_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance_transactions" ADD CONSTRAINT "leave_balance_transactions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance_transactions" ADD CONSTRAINT "leave_balance_transactions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance_transactions" ADD CONSTRAINT "leave_balance_transactions_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "staff_leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance_transactions" ADD CONSTRAINT "leave_balance_transactions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_gl_account_id_fkey" FOREIGN KEY ("gl_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_employer_liability_account_id_fkey" FOREIGN KEY ("employer_liability_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_depends_on_component_id_fkey" FOREIGN KEY ("depends_on_component_id") REFERENCES "salary_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_structure_components" ADD CONSTRAINT "salary_structure_components_salary_structure_id_fkey" FOREIGN KEY ("salary_structure_id") REFERENCES "salary_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_structure_components" ADD CONSTRAINT "salary_structure_components_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "salary_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_assignments" ADD CONSTRAINT "employee_salary_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_assignments" ADD CONSTRAINT "employee_salary_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_assignments" ADD CONSTRAINT "employee_salary_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_assignments" ADD CONSTRAINT "employee_salary_assignments_salary_structure_id_fkey" FOREIGN KEY ("salary_structure_id") REFERENCES "salary_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_configurations" ADD CONSTRAINT "payroll_configurations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_configurations" ADD CONSTRAINT "payroll_configurations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_configurations" ADD CONSTRAINT "payroll_configurations_default_expense_account_id_fkey" FOREIGN KEY ("default_expense_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_configurations" ADD CONSTRAINT "payroll_configurations_default_payable_account_id_fkey" FOREIGN KEY ("default_payable_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_configurations" ADD CONSTRAINT "payroll_configurations_default_disbursement_account_id_fkey" FOREIGN KEY ("default_disbursement_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_closed_by_user_id_fkey" FOREIGN KEY ("closed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_reversal_journal_entry_id_fkey" FOREIGN KEY ("reversal_journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_posted_by_user_id_fkey" FOREIGN KEY ("posted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_reversed_by_user_id_fkey" FOREIGN KEY ("reversed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_employees" ADD CONSTRAINT "payroll_run_employees_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_employees" ADD CONSTRAINT "payroll_run_employees_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_employees" ADD CONSTRAINT "payroll_run_employees_salary_structure_id_fkey" FOREIGN KEY ("salary_structure_id") REFERENCES "salary_structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_payroll_run_employee_id_fkey" FOREIGN KEY ("payroll_run_employee_id") REFERENCES "payroll_run_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_disbursing_account_id_fkey" FOREIGN KEY ("disbursing_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payment_allocations" ADD CONSTRAINT "payroll_payment_allocations_payroll_payment_id_fkey" FOREIGN KEY ("payroll_payment_id") REFERENCES "payroll_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payment_allocations" ADD CONSTRAINT "payroll_payment_allocations_payroll_run_employee_id_fkey" FOREIGN KEY ("payroll_run_employee_id") REFERENCES "payroll_run_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payment_allocations" ADD CONSTRAINT "payroll_payment_allocations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_separations" ADD CONSTRAINT "employee_separations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_separations" ADD CONSTRAINT "employee_separations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_separations" ADD CONSTRAINT "employee_separations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_separations" ADD CONSTRAINT "employee_separations_settlement_payroll_run_id_fkey" FOREIGN KEY ("settlement_payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_separations" ADD CONSTRAINT "employee_separations_initiated_by_user_id_fkey" FOREIGN KEY ("initiated_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_separations" ADD CONSTRAINT "employee_separations_settled_by_user_id_fkey" FOREIGN KEY ("settled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

