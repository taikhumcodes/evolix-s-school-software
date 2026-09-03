import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class SchoolConfiguration(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "school_configurations"

    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="CASCADE"), unique=True, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    legal_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    short_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    board: Mapped[str] = mapped_column(String(30), default="OTHER")
    affiliation_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    udise_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    primary_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    secondary_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_line_1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_line_2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(2), default="IN")

    working_week: Mapped[str] = mapped_column(String(20), default="MON_SAT")
    week_start: Mapped[int] = mapped_column(Integer, default=1)
    term_naming: Mapped[str] = mapped_column(String(30), default="TERM")
    roll_number_scope: Mapped[str] = mapped_column(String(30), default="CLASS_SECTION_YEAR")
    academic_locking_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    student_id_format: Mapped[str] = mapped_column(String(100), default="STU-{YYYY}-{SEQ:05}")
    admission_number_format: Mapped[str] = mapped_column(String(100), default="ADM-{YY}-{SEQ:04}")
    roll_number_format: Mapped[str] = mapped_column(String(100), default="{SEQ:03}")

    attendance_lock_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    attendance_lock_hours: Mapped[int] = mapped_column(Integer, default=24)
    attendance_correction_allowed: Mapped[bool] = mapped_column(Boolean, default=True)
    attendance_correction_reason_required: Mapped[bool] = mapped_column(Boolean, default=True)
    attendance_principal_override: Mapped[bool] = mapped_column(Boolean, default=True)
    teacher_geofence_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    teacher_geofence_radius_meters: Mapped[int] = mapped_column(Integer, default=100)

    fee_currency: Mapped[str] = mapped_column(String(3), default="INR")
    fee_precision: Mapped[int] = mapped_column(Integer, default=2)
    fee_rounding_rule: Mapped[str] = mapped_column(String(20), default="HALF_UP")
    allow_partial_payment: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_advance_payment: Mapped[bool] = mapped_column(Boolean, default=False)
    late_fee_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    late_fee_grace_days: Mapped[int] = mapped_column(Integer, default=0)
    auto_generate_receipt: Mapped[bool] = mapped_column(Boolean, default=True)
    receipt_cancellation_reason_required: Mapped[bool] = mapped_column(Boolean, default=True)
    refund_approval_required: Mapped[bool] = mapped_column(Boolean, default=True)
    concession_approval_required: Mapped[bool] = mapped_column(Boolean, default=True)
    scholarship_approval_required: Mapped[bool] = mapped_column(Boolean, default=True)
    allowed_payment_methods: Mapped[str] = mapped_column(String(100), default="CASH,BANK_TRANSFER,UPI,CHEQUE,MIXED")

    fiscal_year_start_month: Mapped[int] = mapped_column(Integer, default=4)
    fiscal_year_start_day: Mapped[int] = mapped_column(Integer, default=1)
    voucher_approval_required: Mapped[bool] = mapped_column(Boolean, default=True)
    backdated_transactions_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    future_dated_transactions_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    reversal_reason_required: Mapped[bool] = mapped_column(Boolean, default=True)
    gst_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    tds_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    grading_mode: Mapped[str] = mapped_column(String(20), default="MARKS_GRADE")
    passing_percentage: Mapped[float] = mapped_column(Numeric(5, 2), default=35)
    maximum_marks: Mapped[int] = mapped_column(Integer, default=100)
    internal_marks_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    practical_marks_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    grace_marks_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    maximum_grace_marks: Mapped[int] = mapped_column(Integer, default=0)
    revaluation_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    rank_calculation_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    gpa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    cgpa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    result_publication_approval_required: Mapped[bool] = mapped_column(Boolean, default=True)
    marks_decimal_precision: Mapped[int] = mapped_column(Integer, default=2)

    automatic_promotion_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    minimum_attendance_percentage: Mapped[float] = mapped_column(Numeric(5, 2), default=75)
    minimum_passing_percentage: Mapped[float] = mapped_column(Numeric(5, 2), default=35)
    failed_subject_tolerance: Mapped[int] = mapped_column(Integer, default=0)
    grace_marks_considered: Mapped[bool] = mapped_column(Boolean, default=True)
    manual_promotion_override: Mapped[bool] = mapped_column(Boolean, default=True)
    principal_promotion_approval_required: Mapped[bool] = mapped_column(Boolean, default=True)
    promotion_locking_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    default_language: Mapped[str] = mapped_column(String(2), default="en")
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata")
    date_format: Mapped[str] = mapped_column(String(30), default="DD/MM/YYYY")
    time_format: Mapped[str] = mapped_column(String(10), default="12h")
    currency_display: Mapped[str] = mapped_column(String(20), default="symbol")

    paper_size: Mapped[str] = mapped_column(String(10), default="A4")
    print_orientation: Mapped[str] = mapped_column(String(15), default="portrait")
    print_language: Mapped[str] = mapped_column(String(10), default="en")
    print_show_logo: Mapped[bool] = mapped_column(Boolean, default=True)
    print_show_address: Mapped[bool] = mapped_column(Boolean, default=True)
    print_show_contact: Mapped[bool] = mapped_column(Boolean, default=True)
    print_show_timestamp: Mapped[bool] = mapped_column(Boolean, default=True)
    print_show_document_number: Mapped[bool] = mapped_column(Boolean, default=True)
    signature_placeholders: Mapped[bool] = mapped_column(Boolean, default=True)
    header_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    footer_text: Mapped[str | None] = mapped_column(String(255), nullable=True)


class BrandingConfiguration(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "branding_configurations"

    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="CASCADE"), unique=True, index=True)
    logo_file_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    logo_storage_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    logo_content_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    logo_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    compact_logo_file_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    favicon_file_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    primary_print_color: Mapped[str] = mapped_column(String(7), default="#4F642C")
    accent_print_color: Mapped[str] = mapped_column(String(7), default="#85A34D")
    letterhead_text: Mapped[str | None] = mapped_column(String(500), nullable=True)
    footer_text: Mapped[str | None] = mapped_column(String(500), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
