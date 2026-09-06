-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "vehicle_number" VARCHAR(50) NOT NULL,
    "registration_number" VARCHAR(50) NOT NULL,
    "normalized_registration" VARCHAR(50) NOT NULL,
    "vehicle_type_id" UUID NOT NULL,
    "make" VARCHAR(100),
    "model" VARCHAR(100),
    "manufacturing_year" INTEGER,
    "seating_capacity" INTEGER NOT NULL DEFAULT 40,
    "school_owned" BOOLEAN NOT NULL DEFAULT true,
    "ownership_type" VARCHAR(50) NOT NULL DEFAULT 'SCHOOL_OWNED',
    "owner_name" VARCHAR(100),
    "insurance_expiry_date" DATE,
    "fitness_expiry_date" DATE,
    "permit_expiry_date" DATE,
    "pollution_expiry_date" DATE,
    "current_odometer" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_documents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "document_type" VARCHAR(50) NOT NULL,
    "document_number" VARCHAR(100),
    "title" VARCHAR(150) NOT NULL,
    "file_key" VARCHAR(255) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(50) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "issue_date" DATE,
    "expiry_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_staff_assignments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "assignment_role" VARCHAR(30) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_staff_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_routes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "route_code" VARCHAR(50) NOT NULL,
    "route_name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "start_location" VARCHAR(150) NOT NULL,
    "end_location" VARCHAR(150) NOT NULL,
    "estimated_distance" DECIMAL(8,2),
    "estimated_duration" INTEGER,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_route_stops" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "stop_name" VARCHAR(100) NOT NULL,
    "sequence" INTEGER NOT NULL,
    "pickup_time" VARCHAR(20),
    "drop_time" VARCHAR(20),
    "landmark" VARCHAR(255),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_route_vehicle_assignments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "shift" VARCHAR(30) NOT NULL DEFAULT 'BOTH',
    "departure_time" VARCHAR(20),
    "arrival_time" VARCHAR(20),
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_route_vehicle_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_transport_assignments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "pickup_stop_id" UUID NOT NULL,
    "drop_stop_id" UUID NOT NULL,
    "vehicle_id" UUID,
    "shift" VARCHAR(30) NOT NULL DEFAULT 'BOTH',
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "transport_fee_head_id" UUID,
    "fee_amount" DECIMAL(12,2),
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_transport_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_trips" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "driver_employee_id" UUID NOT NULL,
    "conductor_employee_id" UUID,
    "trip_date" DATE NOT NULL,
    "trip_type" VARCHAR(30) NOT NULL,
    "shift" VARCHAR(30),
    "start_odometer" INTEGER,
    "end_odometer" INTEGER,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
    "route_code_snapshot" VARCHAR(50),
    "route_name_snapshot" VARCHAR(100),
    "vehicle_number_snapshot" VARCHAR(50),
    "driver_name_snapshot" VARCHAR(150),
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_trip_students" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "pickup_stop_id" UUID,
    "drop_stop_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'EXPECTED',
    "recorded_at" TIMESTAMP(3),
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_trip_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_odometer_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "reading" INTEGER NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "reference" VARCHAR(100),
    "entered_by_user_id" UUID NOT NULL,
    "remarks" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_odometer_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_fuel_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "fuel_date" DATE NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'LITER',
    "amount" DECIMAL(12,2),
    "odometer" INTEGER,
    "vendor" VARCHAR(150),
    "receipt_file_key" VARCHAR(255),
    "remarks" VARCHAR(255),
    "entered_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_fuel_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_maintenance_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "service_date" DATE NOT NULL,
    "odometer" INTEGER,
    "maintenance_type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "vendor" VARCHAR(150),
    "cost" DECIMAL(12,2),
    "next_service_date" DATE,
    "next_service_odometer" INTEGER,
    "linked_expense_bill_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_locations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "item_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "unit_of_measure" VARCHAR(30) NOT NULL DEFAULT 'PCS',
    "item_type" VARCHAR(30) NOT NULL DEFAULT 'CONSUMABLE',
    "minimum_stock_level" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "reorder_level" DECIMAL(12,3),
    "default_unit_cost" DECIMAL(12,2),
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "movement_type" VARCHAR(30) NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_cost" DECIMAL(12,2),
    "total_cost" DECIMAL(12,2),
    "balance_after" DECIMAL(12,3) NOT NULL,
    "movement_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference_type" VARCHAR(50),
    "reference_id" VARCHAR(100),
    "batch_number" VARCHAR(100),
    "recipient_employee_id" UUID,
    "recipient_department_id" UUID,
    "remarks" VARCHAR(255),
    "actor_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_stock_balances" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "current_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "last_movement_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "asset_tag" VARCHAR(50) NOT NULL,
    "serial_number" VARCHAR(100),
    "manufacturer" VARCHAR(100),
    "model" VARCHAR(100),
    "purchase_date" DATE,
    "purchase_cost" DECIMAL(12,2),
    "warranty_expiry_date" DATE,
    "status" VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    "condition" VARCHAR(50) NOT NULL DEFAULT 'GOOD',
    "remarks" VARCHAR(255),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_assignments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "employee_id" UUID,
    "department_id" UUID,
    "location_id" UUID,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_return_date" DATE,
    "returned_at" TIMESTAMP(3),
    "condition_on_issue" VARCHAR(50) NOT NULL DEFAULT 'GOOD',
    "condition_on_return" VARCHAR(50),
    "remarks" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_by_user_id" UUID NOT NULL,
    "returned_to_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_maintenances" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "service_date" DATE NOT NULL,
    "maintenance_type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "vendor" VARCHAR(150),
    "cost" DECIMAL(12,2),
    "linked_expense_bill_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_disposals" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "disposal_date" DATE NOT NULL,
    "method" VARCHAR(50) NOT NULL,
    "reason" TEXT NOT NULL,
    "value_received" DECIMAL(12,2),
    "approved_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_disposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "email" VARCHAR(150),
    "organization" VARCHAR(150),
    "address" VARCHAR(255),
    "photo_file_key" VARCHAR(255),
    "government_id_type" VARCHAR(50),
    "government_id_last4" VARCHAR(10),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_visits" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "visitor_id" UUID NOT NULL,
    "visit_number" VARCHAR(50) NOT NULL,
    "purpose" VARCHAR(150) NOT NULL,
    "person_to_meet_employee_id" UUID,
    "department_id" UUID,
    "check_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_out_at" TIMESTAMP(3),
    "vehicle_number" VARCHAR(50),
    "number_of_visitors" INTEGER NOT NULL DEFAULT 1,
    "badge_number" VARCHAR(50),
    "remarks" VARCHAR(255),
    "status" VARCHAR(30) NOT NULL DEFAULT 'CHECKED_IN',
    "checked_in_by_user_id" UUID NOT NULL,
    "checked_out_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_pickup_releases" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "pickup_session_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pickup_session" VARCHAR(30) NOT NULL DEFAULT 'AFTERNOON',
    "pickup_type" VARCHAR(30) NOT NULL,
    "guardian_id" UUID,
    "visitor_id" UUID,
    "authorized_person_name" VARCHAR(150),
    "authorized_person_phone" VARCHAR(30),
    "released_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_by_user_id" UUID NOT NULL,
    "reason" VARCHAR(255),
    "is_override" BOOLEAN NOT NULL DEFAULT false,
    "override_reason" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'RELEASED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_pickup_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "academic_year_id" UUID,
    "event_code" VARCHAR(50) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "start_date_time" TIMESTAMP(3) NOT NULL,
    "end_date_time" TIMESTAMP(3) NOT NULL,
    "venue" VARCHAR(150) NOT NULL,
    "capacity" INTEGER,
    "estimated_budget" DECIMAL(12,2),
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "archived_at" TIMESTAMP(3),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_coordinators" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "role" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_coordinators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_participants" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "class_section_id" UUID,
    "team_name" VARCHAR(100),
    "house_name" VARCHAR(100),
    "participant_type" VARCHAR(50) NOT NULL DEFAULT 'INDIVIDUAL',
    "status" VARCHAR(30) NOT NULL DEFAULT 'REGISTERED',
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attended_at" TIMESTAMP(3),
    "notes" VARCHAR(255),

    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_achievements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "participant_id" UUID NOT NULL,
    "position" VARCHAR(50) NOT NULL,
    "result" VARCHAR(100),
    "remarks" VARCHAR(255),
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_expense_links" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "expense_bill_id" UUID NOT NULL,
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_expense_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicles_tenant_id_school_id_status_idx" ON "vehicles"("tenant_id", "school_id", "status");

-- CreateIndex
CREATE INDEX "vehicles_school_id_vehicle_number_idx" ON "vehicles"("school_id", "vehicle_number");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_school_id_normalized_registration_key" ON "vehicles"("school_id", "normalized_registration");

-- CreateIndex
CREATE INDEX "vehicle_documents_tenant_id_school_id_vehicle_id_idx" ON "vehicle_documents"("tenant_id", "school_id", "vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_documents_school_id_expiry_date_idx" ON "vehicle_documents"("school_id", "expiry_date");

-- CreateIndex
CREATE INDEX "vehicle_staff_assignments_tenant_id_school_id_vehicle_id_is_idx" ON "vehicle_staff_assignments"("tenant_id", "school_id", "vehicle_id", "is_active");

-- CreateIndex
CREATE INDEX "vehicle_staff_assignments_school_id_employee_id_is_active_idx" ON "vehicle_staff_assignments"("school_id", "employee_id", "is_active");

-- CreateIndex
CREATE INDEX "transport_routes_tenant_id_school_id_status_idx" ON "transport_routes"("tenant_id", "school_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "transport_routes_school_id_route_code_key" ON "transport_routes"("school_id", "route_code");

-- CreateIndex
CREATE INDEX "transport_route_stops_tenant_id_school_id_route_id_is_activ_idx" ON "transport_route_stops"("tenant_id", "school_id", "route_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "transport_route_stops_route_id_sequence_key" ON "transport_route_stops"("route_id", "sequence");

-- CreateIndex
CREATE INDEX "transport_route_vehicle_assignments_tenant_id_school_id_rou_idx" ON "transport_route_vehicle_assignments"("tenant_id", "school_id", "route_id", "is_active");

-- CreateIndex
CREATE INDEX "transport_route_vehicle_assignments_school_id_vehicle_id_is_idx" ON "transport_route_vehicle_assignments"("school_id", "vehicle_id", "is_active");

-- CreateIndex
CREATE INDEX "student_transport_assignments_tenant_id_school_id_student_i_idx" ON "student_transport_assignments"("tenant_id", "school_id", "student_id", "status");

-- CreateIndex
CREATE INDEX "student_transport_assignments_school_id_route_id_status_idx" ON "student_transport_assignments"("school_id", "route_id", "status");

-- CreateIndex
CREATE INDEX "student_transport_assignments_school_id_vehicle_id_status_idx" ON "student_transport_assignments"("school_id", "vehicle_id", "status");

-- CreateIndex
CREATE INDEX "transport_trips_tenant_id_school_id_trip_date_status_idx" ON "transport_trips"("tenant_id", "school_id", "trip_date", "status");

-- CreateIndex
CREATE INDEX "transport_trips_school_id_route_id_trip_date_idx" ON "transport_trips"("school_id", "route_id", "trip_date");

-- CreateIndex
CREATE INDEX "transport_trips_school_id_vehicle_id_trip_date_idx" ON "transport_trips"("school_id", "vehicle_id", "trip_date");

-- CreateIndex
CREATE INDEX "transport_trip_students_trip_id_status_idx" ON "transport_trip_students"("trip_id", "status");

-- CreateIndex
CREATE INDEX "transport_trip_students_student_id_idx" ON "transport_trip_students"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "transport_trip_students_trip_id_student_id_key" ON "transport_trip_students"("trip_id", "student_id");

-- CreateIndex
CREATE INDEX "vehicle_odometer_logs_tenant_id_school_id_vehicle_id_record_idx" ON "vehicle_odometer_logs"("tenant_id", "school_id", "vehicle_id", "recorded_at");

-- CreateIndex
CREATE INDEX "vehicle_fuel_logs_tenant_id_school_id_vehicle_id_fuel_date_idx" ON "vehicle_fuel_logs"("tenant_id", "school_id", "vehicle_id", "fuel_date");

-- CreateIndex
CREATE INDEX "vehicle_maintenance_logs_tenant_id_school_id_vehicle_id_ser_idx" ON "vehicle_maintenance_logs"("tenant_id", "school_id", "vehicle_id", "service_date");

-- CreateIndex
CREATE INDEX "inventory_categories_tenant_id_school_id_is_active_idx" ON "inventory_categories"("tenant_id", "school_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_categories_school_id_code_key" ON "inventory_categories"("school_id", "code");

-- CreateIndex
CREATE INDEX "inventory_locations_tenant_id_school_id_is_active_idx" ON "inventory_locations"("tenant_id", "school_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_locations_school_id_code_key" ON "inventory_locations"("school_id", "code");

-- CreateIndex
CREATE INDEX "inventory_items_tenant_id_school_id_status_idx" ON "inventory_items"("tenant_id", "school_id", "status");

-- CreateIndex
CREATE INDEX "inventory_items_school_id_category_id_idx" ON "inventory_items"("school_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_school_id_item_code_key" ON "inventory_items"("school_id", "item_code");

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_school_id_item_id_location_id_mov_idx" ON "stock_movements"("tenant_id", "school_id", "item_id", "location_id", "movement_date");

-- CreateIndex
CREATE INDEX "stock_movements_school_id_reference_type_reference_id_idx" ON "stock_movements"("school_id", "reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "inventory_stock_balances_tenant_id_school_id_item_id_idx" ON "inventory_stock_balances"("tenant_id", "school_id", "item_id");

-- CreateIndex
CREATE INDEX "inventory_stock_balances_school_id_location_id_idx" ON "inventory_stock_balances"("school_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_stock_balances_item_id_location_id_key" ON "inventory_stock_balances"("item_id", "location_id");

-- CreateIndex
CREATE INDEX "assets_tenant_id_school_id_status_idx" ON "assets"("tenant_id", "school_id", "status");

-- CreateIndex
CREATE INDEX "assets_school_id_serial_number_idx" ON "assets"("school_id", "serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "assets_school_id_asset_tag_key" ON "assets"("school_id", "asset_tag");

-- CreateIndex
CREATE INDEX "asset_assignments_tenant_id_school_id_asset_id_is_active_idx" ON "asset_assignments"("tenant_id", "school_id", "asset_id", "is_active");

-- CreateIndex
CREATE INDEX "asset_assignments_school_id_employee_id_is_active_idx" ON "asset_assignments"("school_id", "employee_id", "is_active");

-- CreateIndex
CREATE INDEX "asset_assignments_school_id_department_id_is_active_idx" ON "asset_assignments"("school_id", "department_id", "is_active");

-- CreateIndex
CREATE INDEX "asset_maintenances_tenant_id_school_id_asset_id_service_dat_idx" ON "asset_maintenances"("tenant_id", "school_id", "asset_id", "service_date");

-- CreateIndex
CREATE INDEX "asset_disposals_tenant_id_school_id_asset_id_idx" ON "asset_disposals"("tenant_id", "school_id", "asset_id");

-- CreateIndex
CREATE INDEX "visitors_tenant_id_school_id_phone_idx" ON "visitors"("tenant_id", "school_id", "phone");

-- CreateIndex
CREATE INDEX "visitor_visits_tenant_id_school_id_status_check_in_at_idx" ON "visitor_visits"("tenant_id", "school_id", "status", "check_in_at");

-- CreateIndex
CREATE INDEX "visitor_visits_school_id_visitor_id_idx" ON "visitor_visits"("school_id", "visitor_id");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_visits_school_id_visit_number_key" ON "visitor_visits"("school_id", "visit_number");

-- CreateIndex
CREATE INDEX "student_pickup_releases_tenant_id_school_id_student_id_pick_idx" ON "student_pickup_releases"("tenant_id", "school_id", "student_id", "pickup_session_date", "pickup_session");

-- CreateIndex
CREATE INDEX "activity_categories_tenant_id_school_id_is_active_idx" ON "activity_categories"("tenant_id", "school_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "activity_categories_school_id_code_key" ON "activity_categories"("school_id", "code");

-- CreateIndex
CREATE INDEX "school_events_tenant_id_school_id_start_date_time_status_idx" ON "school_events"("tenant_id", "school_id", "start_date_time", "status");

-- CreateIndex
CREATE UNIQUE INDEX "school_events_school_id_event_code_key" ON "school_events"("school_id", "event_code");

-- CreateIndex
CREATE INDEX "event_coordinators_tenant_id_school_id_event_id_idx" ON "event_coordinators"("tenant_id", "school_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_coordinators_event_id_employee_id_key" ON "event_coordinators"("event_id", "employee_id");

-- CreateIndex
CREATE INDEX "event_participants_tenant_id_school_id_event_id_status_idx" ON "event_participants"("tenant_id", "school_id", "event_id", "status");

-- CreateIndex
CREATE INDEX "event_participants_school_id_student_id_idx" ON "event_participants"("school_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_participants_event_id_student_id_key" ON "event_participants"("event_id", "student_id");

-- CreateIndex
CREATE INDEX "event_achievements_tenant_id_school_id_event_id_idx" ON "event_achievements"("tenant_id", "school_id", "event_id");

-- CreateIndex
CREATE INDEX "event_expense_links_tenant_id_school_id_event_id_idx" ON "event_expense_links"("tenant_id", "school_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_expense_links_event_id_expense_bill_id_key" ON "event_expense_links"("event_id", "expense_bill_id");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_staff_assignments" ADD CONSTRAINT "vehicle_staff_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_staff_assignments" ADD CONSTRAINT "vehicle_staff_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_staff_assignments" ADD CONSTRAINT "vehicle_staff_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_staff_assignments" ADD CONSTRAINT "vehicle_staff_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_routes" ADD CONSTRAINT "transport_routes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_routes" ADD CONSTRAINT "transport_routes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_route_stops" ADD CONSTRAINT "transport_route_stops_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_route_stops" ADD CONSTRAINT "transport_route_stops_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_route_stops" ADD CONSTRAINT "transport_route_stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "transport_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_route_vehicle_assignments" ADD CONSTRAINT "transport_route_vehicle_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_route_vehicle_assignments" ADD CONSTRAINT "transport_route_vehicle_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_route_vehicle_assignments" ADD CONSTRAINT "transport_route_vehicle_assignments_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "transport_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_route_vehicle_assignments" ADD CONSTRAINT "transport_route_vehicle_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transport_assignments" ADD CONSTRAINT "student_transport_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transport_assignments" ADD CONSTRAINT "student_transport_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transport_assignments" ADD CONSTRAINT "student_transport_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transport_assignments" ADD CONSTRAINT "student_transport_assignments_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transport_assignments" ADD CONSTRAINT "student_transport_assignments_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "transport_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transport_assignments" ADD CONSTRAINT "student_transport_assignments_pickup_stop_id_fkey" FOREIGN KEY ("pickup_stop_id") REFERENCES "transport_route_stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transport_assignments" ADD CONSTRAINT "student_transport_assignments_drop_stop_id_fkey" FOREIGN KEY ("drop_stop_id") REFERENCES "transport_route_stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transport_assignments" ADD CONSTRAINT "student_transport_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transport_assignments" ADD CONSTRAINT "student_transport_assignments_transport_fee_head_id_fkey" FOREIGN KEY ("transport_fee_head_id") REFERENCES "fee_heads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_trips" ADD CONSTRAINT "transport_trips_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_trips" ADD CONSTRAINT "transport_trips_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_trips" ADD CONSTRAINT "transport_trips_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "transport_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_trips" ADD CONSTRAINT "transport_trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_trips" ADD CONSTRAINT "transport_trips_driver_employee_id_fkey" FOREIGN KEY ("driver_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_trips" ADD CONSTRAINT "transport_trips_conductor_employee_id_fkey" FOREIGN KEY ("conductor_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_trip_students" ADD CONSTRAINT "transport_trip_students_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "transport_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_trip_students" ADD CONSTRAINT "transport_trip_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_trip_students" ADD CONSTRAINT "transport_trip_students_pickup_stop_id_fkey" FOREIGN KEY ("pickup_stop_id") REFERENCES "transport_route_stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_trip_students" ADD CONSTRAINT "transport_trip_students_drop_stop_id_fkey" FOREIGN KEY ("drop_stop_id") REFERENCES "transport_route_stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_odometer_logs" ADD CONSTRAINT "vehicle_odometer_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_odometer_logs" ADD CONSTRAINT "vehicle_odometer_logs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_odometer_logs" ADD CONSTRAINT "vehicle_odometer_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_odometer_logs" ADD CONSTRAINT "vehicle_odometer_logs_entered_by_user_id_fkey" FOREIGN KEY ("entered_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_fuel_logs" ADD CONSTRAINT "vehicle_fuel_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_fuel_logs" ADD CONSTRAINT "vehicle_fuel_logs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_fuel_logs" ADD CONSTRAINT "vehicle_fuel_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_fuel_logs" ADD CONSTRAINT "vehicle_fuel_logs_entered_by_user_id_fkey" FOREIGN KEY ("entered_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenance_logs" ADD CONSTRAINT "vehicle_maintenance_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenance_logs" ADD CONSTRAINT "vehicle_maintenance_logs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenance_logs" ADD CONSTRAINT "vehicle_maintenance_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenance_logs" ADD CONSTRAINT "vehicle_maintenance_logs_linked_expense_bill_id_fkey" FOREIGN KEY ("linked_expense_bill_id") REFERENCES "expense_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_categories" ADD CONSTRAINT "inventory_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_categories" ADD CONSTRAINT "inventory_categories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "inventory_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_recipient_employee_id_fkey" FOREIGN KEY ("recipient_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_recipient_department_id_fkey" FOREIGN KEY ("recipient_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock_balances" ADD CONSTRAINT "inventory_stock_balances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock_balances" ADD CONSTRAINT "inventory_stock_balances_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock_balances" ADD CONSTRAINT "inventory_stock_balances_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock_balances" ADD CONSTRAINT "inventory_stock_balances_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_returned_to_user_id_fkey" FOREIGN KEY ("returned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenances" ADD CONSTRAINT "asset_maintenances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenances" ADD CONSTRAINT "asset_maintenances_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenances" ADD CONSTRAINT "asset_maintenances_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenances" ADD CONSTRAINT "asset_maintenances_linked_expense_bill_id_fkey" FOREIGN KEY ("linked_expense_bill_id") REFERENCES "expense_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_visits" ADD CONSTRAINT "visitor_visits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_visits" ADD CONSTRAINT "visitor_visits_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_visits" ADD CONSTRAINT "visitor_visits_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_visits" ADD CONSTRAINT "visitor_visits_person_to_meet_employee_id_fkey" FOREIGN KEY ("person_to_meet_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_visits" ADD CONSTRAINT "visitor_visits_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_visits" ADD CONSTRAINT "visitor_visits_checked_in_by_user_id_fkey" FOREIGN KEY ("checked_in_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_visits" ADD CONSTRAINT "visitor_visits_checked_out_by_user_id_fkey" FOREIGN KEY ("checked_out_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_pickup_releases" ADD CONSTRAINT "student_pickup_releases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_pickup_releases" ADD CONSTRAINT "student_pickup_releases_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_pickup_releases" ADD CONSTRAINT "student_pickup_releases_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_pickup_releases" ADD CONSTRAINT "student_pickup_releases_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_pickup_releases" ADD CONSTRAINT "student_pickup_releases_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "visitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_pickup_releases" ADD CONSTRAINT "student_pickup_releases_released_by_user_id_fkey" FOREIGN KEY ("released_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_categories" ADD CONSTRAINT "activity_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_categories" ADD CONSTRAINT "activity_categories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "activity_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_coordinators" ADD CONSTRAINT "event_coordinators_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_coordinators" ADD CONSTRAINT "event_coordinators_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_coordinators" ADD CONSTRAINT "event_coordinators_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "school_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_coordinators" ADD CONSTRAINT "event_coordinators_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "school_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_class_section_id_fkey" FOREIGN KEY ("class_section_id") REFERENCES "class_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_achievements" ADD CONSTRAINT "event_achievements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_achievements" ADD CONSTRAINT "event_achievements_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_achievements" ADD CONSTRAINT "event_achievements_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "school_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_achievements" ADD CONSTRAINT "event_achievements_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "event_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_expense_links" ADD CONSTRAINT "event_expense_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_expense_links" ADD CONSTRAINT "event_expense_links_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_expense_links" ADD CONSTRAINT "event_expense_links_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "school_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_expense_links" ADD CONSTRAINT "event_expense_links_expense_bill_id_fkey" FOREIGN KEY ("expense_bill_id") REFERENCES "expense_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

