import re
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.configuration import BrandingConfiguration, SchoolConfiguration


SECTION_FIELDS = {
    "school": {"legal_name", "short_name", "board", "affiliation_number", "udise_code", "primary_phone", "secondary_phone", "contact_email", "website", "address_line_1", "address_line_2", "city", "state", "postal_code", "country"},
    "academic": {"working_week", "week_start", "term_naming", "roll_number_scope", "academic_locking_enabled"},
    "student-identity": {"student_id_format", "admission_number_format", "roll_number_format"},
    "attendance": {"attendance_lock_enabled", "attendance_lock_hours", "attendance_correction_allowed", "attendance_correction_reason_required", "attendance_principal_override", "teacher_geofence_enabled", "teacher_geofence_radius_meters"},
    "fees": {"fee_currency", "fee_precision", "fee_rounding_rule", "allow_partial_payment", "allow_advance_payment", "late_fee_enabled", "late_fee_grace_days", "auto_generate_receipt", "receipt_cancellation_reason_required", "refund_approval_required", "concession_approval_required", "scholarship_approval_required", "allowed_payment_methods"},
    "finance": {"fiscal_year_start_month", "fiscal_year_start_day", "voucher_approval_required", "backdated_transactions_allowed", "future_dated_transactions_allowed", "reversal_reason_required", "gst_enabled", "tds_enabled"},
    "exams": {"grading_mode", "passing_percentage", "maximum_marks", "internal_marks_enabled", "practical_marks_enabled", "grace_marks_enabled", "maximum_grace_marks", "revaluation_enabled", "rank_calculation_enabled", "gpa_enabled", "cgpa_enabled", "result_publication_approval_required", "marks_decimal_precision"},
    "promotion": {"automatic_promotion_enabled", "minimum_attendance_percentage", "minimum_passing_percentage", "failed_subject_tolerance", "grace_marks_considered", "manual_promotion_override", "principal_promotion_approval_required", "promotion_locking_enabled"},
    "localization": {"default_language", "timezone", "date_format", "time_format", "currency_display"},
    "printing": {"paper_size", "print_orientation", "print_language", "print_show_logo", "print_show_address", "print_show_contact", "print_show_timestamp", "print_show_document_number", "signature_placeholders", "header_text", "footer_text"},
}


def serialize_config(record: SchoolConfiguration) -> dict[str, Any]:
    values = {column.name: getattr(record, column.name) for column in SchoolConfiguration.__table__.columns if column.name not in {"id", "tenant_id", "school_id", "version", "created_at", "updated_at"}}
    for key, value in values.items():
        if hasattr(value, "to_eng_string"):
            values[key] = float(value)
    return {"id": str(record.id), "school_id": str(record.school_id), "version": record.version, "values": values}


def serialize_branding(record: BrandingConfiguration) -> dict[str, Any]:
    return {column.name: str(getattr(record, column.name)) if column.name in {"id", "school_id"} else getattr(record, column.name) for column in BrandingConfiguration.__table__.columns if column.name not in {"tenant_id", "created_at", "updated_at"}}


async def get_or_create_config(db: AsyncSession, tenant_id: uuid.UUID, school_id: uuid.UUID) -> SchoolConfiguration:
    result = await db.execute(select(SchoolConfiguration).where(SchoolConfiguration.school_id == school_id, SchoolConfiguration.tenant_id == tenant_id))
    record = result.scalars().first()
    if record:
        return record
    record = SchoolConfiguration(tenant_id=tenant_id, school_id=school_id)
    db.add(record)
    await db.flush()
    return record


async def get_or_create_branding(db: AsyncSession, tenant_id: uuid.UUID, school_id: uuid.UUID) -> BrandingConfiguration:
    result = await db.execute(select(BrandingConfiguration).where(BrandingConfiguration.school_id == school_id, BrandingConfiguration.tenant_id == tenant_id))
    record = result.scalars().first()
    if record:
        return record
    record = BrandingConfiguration(tenant_id=tenant_id, school_id=school_id)
    db.add(record)
    await db.flush()
    return record


def validate_identifier_format(value: str) -> None:
    if len(value) > 100 or not re.fullmatch(r"[A-Za-z0-9_{}:#\-]+", value) or "{SEQ:" not in value:
        raise ValueError("Invalid identifier format")