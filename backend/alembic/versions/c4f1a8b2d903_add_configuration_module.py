"""Add typed Module 03 configuration tables.

Revision ID: c4f1a8b2d903
Revises: 60da47be69f5
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "c4f1a8b2d903"
down_revision: Union[str, None] = "60da47be69f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "school_configurations",
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("school_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        *[sa.Column(name, type_, nullable=nullable, server_default=default) for name, type_, nullable, default in [
            ("legal_name", sa.String(200), True, None), ("short_name", sa.String(100), True, None),
            ("board", sa.String(30), False, "'OTHER'"), ("affiliation_number", sa.String(100), True, None),
            ("udise_code", sa.String(50), True, None), ("primary_phone", sa.String(30), True, None),
            ("secondary_phone", sa.String(30), True, None), ("contact_email", sa.String(255), True, None),
            ("website", sa.String(255), True, None), ("address_line_1", sa.String(255), True, None),
            ("address_line_2", sa.String(255), True, None), ("city", sa.String(100), True, None),
            ("state", sa.String(100), True, None), ("postal_code", sa.String(20), True, None),
            ("country", sa.String(2), False, "'IN'"), ("working_week", sa.String(20), False, "'MON_SAT'"),
            ("week_start", sa.Integer(), False, "1"), ("term_naming", sa.String(30), False, "'TERM'"),
            ("roll_number_scope", sa.String(30), False, "'CLASS_SECTION_YEAR'"),
            ("academic_locking_enabled", sa.Boolean(), False, "true"),
            ("student_id_format", sa.String(100), False, "'STU-{YYYY}-{SEQ:05}'"),
            ("admission_number_format", sa.String(100), False, "'ADM-{YY}-{SEQ:04}'"),
            ("roll_number_format", sa.String(100), False, "'{SEQ:03}'"),
            ("attendance_lock_enabled", sa.Boolean(), False, "true"), ("attendance_lock_hours", sa.Integer(), False, "24"),
            ("attendance_correction_allowed", sa.Boolean(), False, "true"),
            ("attendance_correction_reason_required", sa.Boolean(), False, "true"),
            ("attendance_principal_override", sa.Boolean(), False, "true"),
            ("teacher_geofence_enabled", sa.Boolean(), False, "false"),
            ("teacher_geofence_radius_meters", sa.Integer(), False, "100"),
            ("fee_currency", sa.String(3), False, "'INR'"), ("fee_precision", sa.Integer(), False, "2"),
            ("fee_rounding_rule", sa.String(20), False, "'HALF_UP'"), ("allow_partial_payment", sa.Boolean(), False, "true"),
            ("allow_advance_payment", sa.Boolean(), False, "false"), ("late_fee_enabled", sa.Boolean(), False, "true"),
            ("late_fee_grace_days", sa.Integer(), False, "0"), ("auto_generate_receipt", sa.Boolean(), False, "true"),
            ("receipt_cancellation_reason_required", sa.Boolean(), False, "true"),
            ("refund_approval_required", sa.Boolean(), False, "true"), ("concession_approval_required", sa.Boolean(), False, "true"),
            ("scholarship_approval_required", sa.Boolean(), False, "true"),
            ("allowed_payment_methods", sa.String(100), False, "'CASH,BANK_TRANSFER,UPI,CHEQUE,MIXED'"),
            ("fiscal_year_start_month", sa.Integer(), False, "4"), ("fiscal_year_start_day", sa.Integer(), False, "1"),
            ("voucher_approval_required", sa.Boolean(), False, "true"), ("backdated_transactions_allowed", sa.Boolean(), False, "false"),
            ("future_dated_transactions_allowed", sa.Boolean(), False, "false"), ("reversal_reason_required", sa.Boolean(), False, "true"),
            ("gst_enabled", sa.Boolean(), False, "false"), ("tds_enabled", sa.Boolean(), False, "false"),
            ("grading_mode", sa.String(20), False, "'MARKS_GRADE'"), ("passing_percentage", sa.Numeric(5, 2), False, "35"),
            ("maximum_marks", sa.Integer(), False, "100"), ("internal_marks_enabled", sa.Boolean(), False, "true"),
            ("practical_marks_enabled", sa.Boolean(), False, "false"), ("grace_marks_enabled", sa.Boolean(), False, "false"),
            ("maximum_grace_marks", sa.Integer(), False, "0"), ("revaluation_enabled", sa.Boolean(), False, "false"),
            ("rank_calculation_enabled", sa.Boolean(), False, "true"), ("gpa_enabled", sa.Boolean(), False, "false"),
            ("cgpa_enabled", sa.Boolean(), False, "false"), ("result_publication_approval_required", sa.Boolean(), False, "true"),
            ("marks_decimal_precision", sa.Integer(), False, "2"), ("automatic_promotion_enabled", sa.Boolean(), False, "false"),
            ("minimum_attendance_percentage", sa.Numeric(5, 2), False, "75"),
            ("minimum_passing_percentage", sa.Numeric(5, 2), False, "35"), ("failed_subject_tolerance", sa.Integer(), False, "0"),
            ("grace_marks_considered", sa.Boolean(), False, "true"), ("manual_promotion_override", sa.Boolean(), False, "true"),
            ("principal_promotion_approval_required", sa.Boolean(), False, "true"), ("promotion_locking_enabled", sa.Boolean(), False, "true"),
            ("default_language", sa.String(2), False, "'en'"), ("timezone", sa.String(64), False, "'Asia/Kolkata'"),
            ("date_format", sa.String(30), False, "'DD/MM/YYYY'"), ("time_format", sa.String(10), False, "'12h'"),
            ("currency_display", sa.String(20), False, "'symbol'"), ("paper_size", sa.String(10), False, "'A4'"),
            ("print_orientation", sa.String(15), False, "'portrait'"), ("print_language", sa.String(10), False, "'en'"),
            ("print_show_logo", sa.Boolean(), False, "true"), ("print_show_address", sa.Boolean(), False, "true"),
            ("print_show_contact", sa.Boolean(), False, "true"), ("print_show_timestamp", sa.Boolean(), False, "true"),
            ("print_show_document_number", sa.Boolean(), False, "true"), ("signature_placeholders", sa.Boolean(), False, "true"),
            ("header_text", sa.String(255), True, None), ("footer_text", sa.String(255), True, None),
        ]],
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("school_id", name="uq_school_configurations_school_id"),
    )
    op.create_index("ix_school_configurations_tenant_id", "school_configurations", ["tenant_id"])
    op.create_index("ix_school_configurations_school_id", "school_configurations", ["school_id"])
    op.create_table(
        "branding_configurations",
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("school_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("logo_file_id", sa.String(255), nullable=True), sa.Column("logo_storage_key", sa.String(500), nullable=True),
        sa.Column("logo_content_type", sa.String(100), nullable=True), sa.Column("logo_size", sa.Integer(), nullable=True),
        sa.Column("compact_logo_file_id", sa.String(255), nullable=True), sa.Column("favicon_file_id", sa.String(255), nullable=True),
        sa.Column("primary_print_color", sa.String(7), nullable=False, server_default="'#4F642C'"),
        sa.Column("accent_print_color", sa.String(7), nullable=False, server_default="'#85A34D'"),
        sa.Column("letterhead_text", sa.String(500), nullable=True), sa.Column("footer_text", sa.String(500), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("school_id", name="uq_branding_configurations_school_id"),
    )
    op.create_index("ix_branding_configurations_tenant_id", "branding_configurations", ["tenant_id"])
    op.create_index("ix_branding_configurations_school_id", "branding_configurations", ["school_id"])


def downgrade() -> None:
    op.drop_table("branding_configurations")
    op.drop_table("school_configurations")