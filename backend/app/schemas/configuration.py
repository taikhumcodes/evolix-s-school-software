from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ConfigurationPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=1)
    values: dict[str, Any]

    @field_validator("values")
    @classmethod
    def validate_values(cls, values: dict[str, Any]) -> dict[str, Any]:
        for key, value in values.items():
            if key.endswith("percentage") and not 0 <= Decimal(str(value)) <= 100:
                raise ValueError(f"{key} must be between 0 and 100")
            if key in {"attendance_lock_hours", "late_fee_grace_days", "teacher_geofence_radius_meters", "maximum_grace_marks", "failed_subject_tolerance"} and int(value) < 0:
                raise ValueError(f"{key} must not be negative")
            if key in {"fee_precision", "marks_decimal_precision"} and not 0 <= int(value) <= 6:
                raise ValueError(f"{key} must be between 0 and 6")
            if key in {"student_id_format", "admission_number_format", "roll_number_format"}:
                if "{SEQ:" not in str(value) or "}" not in str(value):
                    raise ValueError(f"{key} must contain a sequence token")
            if key in {"primary_print_color", "accent_print_color"} and (len(str(value)) != 7 or not str(value).startswith("#")):
                raise ValueError(f"{key} must be a hex color")
        return values


class ConfigurationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    school_id: str
    version: int
    values: dict[str, Any]


class BrandingUploadMetadata(BaseModel):
    file_id: str = Field(min_length=1, max_length=255)
    storage_key: str = Field(min_length=1, max_length=500)
    content_type: str
    size: int = Field(gt=0, le=5 * 1024 * 1024)

    @field_validator("content_type")
    @classmethod
    def valid_content_type(cls, value: str) -> str:
        if value not in {"image/png", "image/jpeg", "image/webp", "image/x-icon"}:
            raise ValueError("Unsupported branding file type")
        return value


class BrandingPatch(ConfigurationPatch):
    pass


class NumberSeriesPatch(BaseModel):
    version: int | None = Field(default=None, ge=1)
    prefix: str | None = Field(default=None, max_length=50)
    suffix: str | None = Field(default=None, max_length=50)
    padding: int | None = Field(default=None, ge=1, le=12)
    reset_strategy: str | None = None

    @field_validator("reset_strategy")
    @classmethod
    def valid_reset_strategy(cls, value: str | None) -> str | None:
        if value not in {None, "NEVER", "ACADEMIC_YEAR", "CALENDAR_YEAR", "MONTHLY"}:
            raise ValueError("Invalid number series reset strategy")
        return value