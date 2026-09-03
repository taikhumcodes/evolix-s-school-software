import os
import uuid
from datetime import datetime
from io import BytesIO
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_permissions
from app.models.configuration import BrandingConfiguration
from app.models.foundation import AuditLog, NumberSeries, School, User
from app.schemas.configuration import BrandingPatch, BrandingUploadMetadata, ConfigurationPatch, NumberSeriesPatch
from app.storage.base import get_storage_backend
from app.services.audit_service import write_audit_log
from app.services.configuration_service import SECTION_FIELDS, get_or_create_branding, get_or_create_config, serialize_branding, serialize_config, validate_identifier_format

router = APIRouter()


async def resolve_school(school_id: uuid.UUID | None, db: AsyncSession, user: User) -> School:
    allowed_ids = {school.id for school in user.schools}
    selected_id = school_id or next(iter(allowed_ids), None)
    if selected_id is None or selected_id not in allowed_ids:
        raise HTTPException(status_code=403, detail="School access denied")
    result = await db.execute(select(School).where(School.id == selected_id, School.tenant_id == user.tenant_id))
    school = result.scalars().first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return school


@router.get("")
async def configuration_overview(school_id: uuid.UUID | None = Query(None), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    school = await resolve_school(school_id, db, user)
    config = await get_or_create_config(db, user.tenant_id, school.id)
    branding = await get_or_create_branding(db, user.tenant_id, school.id)
    await db.commit()
    configured = {section: any(getattr(config, field) not in (None, "") for field in fields) for section, fields in SECTION_FIELDS.items()}
    configured["branding"] = bool(branding.logo_file_id or branding.letterhead_text)
    return {"school": {"id": str(school.id), "name": school.name, "code": school.code}, "version": config.version, "categories": {section: {"status": "Configured" if value else "Needs Setup", "updated_at": config.updated_at} for section, value in configured.items()}}


@router.get("/effective")
async def effective_configuration(school_id: uuid.UUID | None = Query(None), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    school = await resolve_school(school_id, db, user)
    config = await get_or_create_config(db, user.tenant_id, school.id)
    await db.commit()
    return serialize_config(config)


@router.get("/branding")
async def get_branding(school_id: uuid.UUID | None = Query(None), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    school = await resolve_school(school_id, db, user)
    record = await get_or_create_branding(db, user.tenant_id, school.id)
    await db.commit()
    payload = serialize_branding(record)
    return {"id": payload["id"], "school_id": payload["school_id"], "version": payload["version"], "values": {key: value for key, value in payload.items() if key not in {"id", "school_id", "created_at", "updated_at", "version"}}}


def branding_response(payload: dict[str, Any]) -> dict[str, Any]:
    return {"id": payload["id"], "school_id": payload["school_id"], "version": payload["version"], "values": {key: value for key, value in payload.items() if key not in {"id", "school_id", "created_at", "updated_at", "version"}}}


@router.patch("/branding", dependencies=[Depends(require_permissions(["settings.manage"]))])
async def update_branding(data: BrandingPatch, school_id: uuid.UUID | None = Query(None), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    school = await resolve_school(school_id, db, user)
    record = await get_or_create_branding(db, user.tenant_id, school.id)
    if data.version != record.version:
        raise HTTPException(status_code=409, detail="CONFIGURATION_VERSION_CONFLICT")
    before = serialize_branding(record)
    for key, value in data.values.items():
        if key not in {column.name for column in BrandingConfiguration.__table__.columns} or key in {"id", "tenant_id", "school_id", "version", "created_at", "updated_at"}:
            raise HTTPException(status_code=422, detail=f"Unsupported branding field: {key}")
        setattr(record, key, value)
    record.version += 1
    await write_audit_log(db, tenant_id=user.tenant_id, actor_id=user.id, action="BRANDING_UPDATED", entity_type="BrandingConfiguration", entity_id=str(record.id), school_id=school.id, before_data=before, after_data=serialize_branding(record))
    await db.commit()
    payload = serialize_branding(record)
    return branding_response(payload)


@router.get("/branding/asset/{asset_type}")
async def get_branding_asset(asset_type: str, school_id: uuid.UUID = Query(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BrandingConfiguration).where(BrandingConfiguration.school_id == school_id))
    record = result.scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Branding asset not found")
    storage_key = None
    content_type = "image/png"
    if asset_type == "logo":
        storage_key = record.logo_storage_key
        content_type = record.logo_content_type or "image/png"
    elif asset_type == "compact_logo":
        storage_key = f"schools/{school_id}/branding/compact_logo"
    elif asset_type == "favicon":
        storage_key = f"schools/{school_id}/branding/favicon"

    if not storage_key:
        raise HTTPException(status_code=404, detail="Branding asset not found")
    storage = get_storage_backend(os.getenv("STORAGE_DRIVER", "local"), {"LOCAL_STORAGE_PATH": os.getenv("LOCAL_STORAGE_PATH", "./custom_storage")})
    file_bytes = storage.get_bytes(storage_key)
    if not file_bytes:
        raise HTTPException(status_code=404, detail="Asset file missing")
    return Response(content=file_bytes, media_type=content_type, headers={"Cache-Control": "no-cache, must-revalidate"})


@router.delete("/branding/asset/{asset_type}", dependencies=[Depends(require_permissions(["settings.manage"]))])
async def delete_branding_asset(asset_type: str, school_id: uuid.UUID | None = Query(None), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    school = await resolve_school(school_id, db, user)
    record = await get_or_create_branding(db, user.tenant_id, school.id)
    storage = get_storage_backend(os.getenv("STORAGE_DRIVER", "local"), {"LOCAL_STORAGE_PATH": os.getenv("LOCAL_STORAGE_PATH", "./custom_storage")})
    if asset_type == "logo":
        if record.logo_storage_key:
            storage.delete(record.logo_storage_key)
        record.logo_file_id = None
        record.logo_storage_key = None
        record.logo_content_type = None
        record.logo_size = None
    elif asset_type == "compact_logo":
        record.compact_logo_file_id = None
    elif asset_type == "favicon":
        record.favicon_file_id = None
    else:
        raise HTTPException(status_code=422, detail="Unsupported branding asset")
    record.version += 1
    await write_audit_log(db, tenant_id=user.tenant_id, actor_id=user.id, action="BRANDING_ASSET_DELETED", entity_type="BrandingConfiguration", entity_id=str(record.id), school_id=school.id, after_data={"asset_type": asset_type})
    await db.commit()
    payload = serialize_branding(record)
    return branding_response(payload)


@router.post("/branding/upload", dependencies=[Depends(require_permissions(["settings.manage"]))])
async def upload_branding(file: UploadFile = File(...), asset_type: str = Query("logo"), school_id: uuid.UUID | None = Query(None), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    school = await resolve_school(school_id, db, user)
    data = await file.read()
    if len(data) == 0 or len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Branding file must be between 1 byte and 5 MB")
    signatures = {
        "image/png": data.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/jpeg": data.startswith(b"\xff\xd8\xff"),
        "image/webp": data.startswith(b"RIFF") and data[8:12] == b"WEBP",
        "image/x-icon": data.startswith(b"\x00\x00\x01\x00"),
    }
    content_type = next((kind for kind, valid in signatures.items() if valid), None)
    if content_type is None:
        raise HTTPException(status_code=422, detail="Unsupported or unsafe branding file")
    if asset_type not in {"logo", "compact_logo", "favicon"}:
        raise HTTPException(status_code=422, detail="Unsupported branding asset")
    storage_key = f"schools/{school.id}/branding/{uuid.uuid4().hex}"
    storage = get_storage_backend(os.getenv("STORAGE_DRIVER", "local"), {"LOCAL_STORAGE_PATH": os.getenv("LOCAL_STORAGE_PATH", "./custom_storage")})
    storage.upload(BytesIO(data), storage_key)
    record = await get_or_create_branding(db, user.tenant_id, school.id)
    file_id = str(uuid.uuid4())
    if asset_type == "logo":
        record.logo_file_id, record.logo_storage_key, record.logo_content_type, record.logo_size = file_id, storage_key, content_type, len(data)
    elif asset_type == "compact_logo":
        record.compact_logo_file_id = file_id
    else:
        record.favicon_file_id = file_id
    record.version += 1
    await write_audit_log(db, tenant_id=user.tenant_id, actor_id=user.id, action="BRANDING_UPLOADED", entity_type="BrandingConfiguration", entity_id=str(record.id), school_id=school.id, after_data={"asset_type": asset_type, "file_id": file_id, "content_type": content_type, "size": len(data)})
    payload = serialize_branding(record)
    await db.commit()
    return branding_response(payload)


@router.get("/number-series")
async def get_configured_number_series(school_id: uuid.UUID | None = Query(None), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    school = await resolve_school(school_id, db, user)
    result = await db.execute(select(NumberSeries).where(NumberSeries.tenant_id == user.tenant_id, (NumberSeries.school_id == school.id) | (NumberSeries.school_id.is_(None))))
    return [{"id": str(item.id), "code": item.code, "prefix": item.prefix, "suffix": item.suffix, "padding": item.padding, "current_value": item.current_value, "reset_strategy": item.reset_strategy} for item in result.scalars().all()]


@router.patch("/number-series/{series_id}", dependencies=[Depends(require_permissions(["settings.manage"]))])
async def update_configured_number_series(series_id: uuid.UUID, data: NumberSeriesPatch, school_id: uuid.UUID | None = Query(None), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    school = await resolve_school(school_id, db, user)
    result = await db.execute(select(NumberSeries).where(NumberSeries.id == series_id, NumberSeries.tenant_id == user.tenant_id, (NumberSeries.school_id == school.id) | (NumberSeries.school_id.is_(None))))
    series = result.scalars().first()
    if not series:
        raise HTTPException(status_code=404, detail="Number series not found")
    updates = data.model_dump(exclude_unset=True, exclude={"version"})
    for key, value in updates.items():
        setattr(series, key, value)
    if series.padding < 1 or series.padding > 12 or series.reset_strategy not in {None, "NEVER", "ACADEMIC_YEAR", "CALENDAR_YEAR", "MONTHLY"}:
        raise HTTPException(status_code=422, detail="Invalid number series configuration")
    await write_audit_log(db, tenant_id=user.tenant_id, actor_id=user.id, action="NUMBER_SERIES_UPDATED", entity_type="NumberSeries", entity_id=str(series.id), school_id=school.id, after_data={"code": series.code, "prefix": series.prefix, "suffix": series.suffix, "padding": series.padding, "reset_strategy": series.reset_strategy})
    await db.commit()
    return {"id": str(series.id), "code": series.code, "prefix": series.prefix, "suffix": series.suffix, "padding": series.padding, "current_value": series.current_value, "reset_strategy": series.reset_strategy}


@router.get("/number-series/{series_id}/preview")
async def preview_configured_number_series(series_id: uuid.UUID, prefix: str | None = None, suffix: str | None = None, padding: int | None = None, school_id: uuid.UUID | None = Query(None), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    school = await resolve_school(school_id, db, user)
    result = await db.execute(select(NumberSeries).where(NumberSeries.id == series_id, NumberSeries.tenant_id == user.tenant_id, (NumberSeries.school_id == school.id) | (NumberSeries.school_id.is_(None))))
    series = result.scalars().first()
    if not series:
        raise HTTPException(status_code=404, detail="Number series not found")
    width = padding or series.padding
    if width < 1 or width > 12:
        raise HTTPException(status_code=422, detail="Invalid number series padding")
    now = datetime.utcnow()
    expanded_prefix = prefix if prefix is not None else series.prefix or ""
    expanded_suffix = suffix if suffix is not None else series.suffix or ""
    for token, rep in [("{YYYY}", str(now.year)), ("{YY}", str(now.year)[-2:]), ("{MM}", f"{now.month:02d}"), ("{DD}", f"{now.day:02d}")]:
        expanded_prefix = expanded_prefix.replace(token, rep)
        expanded_suffix = expanded_suffix.replace(token, rep)
    return {"preview": f"{expanded_prefix}{str(series.current_value + 1).zfill(width)}{expanded_suffix}"}


@router.get("/history")
async def configuration_history(school_id: uuid.UUID | None = Query(None), action: str | None = None, user_id: uuid.UUID | None = None, date_from: datetime | None = None, date_to: datetime | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await resolve_school(school_id, db, user)
    query = select(AuditLog).where(AuditLog.tenant_id == user.tenant_id, AuditLog.action.like("%CONFIGURATION%") | AuditLog.action.like("BRANDING_%") | (AuditLog.action == "NUMBER_SERIES_UPDATED"))
    if school_id:
        query = query.where(AuditLog.school_id == school_id)
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if date_from:
        query = query.where(AuditLog.created_at >= date_from)
    if date_to:
        query = query.where(AuditLog.created_at <= date_to)
    result = await db.execute(query.order_by(AuditLog.created_at.desc()).limit(100))
    return [{"id": str(item.id), "created_at": item.created_at, "user_id": str(item.user_id) if item.user_id else None, "school_id": str(item.school_id) if item.school_id else None, "action": item.action, "entity_type": item.entity_type, "entity_id": item.entity_id, "before_data": item.before_data, "after_data": item.after_data} for item in result.scalars().all()]


@router.post("/branding/upload-metadata", dependencies=[Depends(require_permissions(["settings.manage"]))])
async def save_branding_upload(data: BrandingUploadMetadata, school_id: uuid.UUID | None = Query(None), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    school = await resolve_school(school_id, db, user)
    record = await get_or_create_branding(db, user.tenant_id, school.id)
    record.logo_file_id, record.logo_storage_key, record.logo_content_type, record.logo_size = data.file_id, data.storage_key, data.content_type, data.size
    record.version += 1
    await write_audit_log(db, tenant_id=user.tenant_id, actor_id=user.id, action="BRANDING_UPDATED", entity_type="BrandingConfiguration", entity_id=str(record.id), school_id=school.id, after_data={"logo_file_id": data.file_id, "logo_content_type": data.content_type, "logo_size": data.size})
    payload = serialize_branding(record)
    await db.commit()
    return {"id": payload["id"], "school_id": payload["school_id"], "version": payload["version"], "values": {key: value for key, value in payload.items() if key not in {"id", "school_id", "created_at", "updated_at", "version"}}}


def _section_route(section: str):
    async def read_section(school_id: uuid.UUID | None = Query(None), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
        school = await resolve_school(school_id, db, user)
        record = await get_or_create_config(db, user.tenant_id, school.id)
        await db.commit()
        payload = serialize_config(record)
        payload["values"] = {key: payload["values"][key] for key in SECTION_FIELDS[section]}
        return payload

    async def update_section(data: ConfigurationPatch, school_id: uuid.UUID | None = Query(None), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
        school = await resolve_school(school_id, db, user)
        record = await get_or_create_config(db, user.tenant_id, school.id)
        if data.version != record.version:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="CONFIGURATION_VERSION_CONFLICT")
        unsupported = set(data.values) - SECTION_FIELDS[section]
        if unsupported:
            raise HTTPException(status_code=422, detail=f"Unsupported fields: {', '.join(sorted(unsupported))}")
        for key in {"student_id_format", "admission_number_format", "roll_number_format"} & set(data.values):
            try:
                validate_identifier_format(str(data.values[key]))
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc)) from exc
        before = serialize_config(record)
        for key, value in data.values.items():
            setattr(record, key, value)
        record.version += 1
        await write_audit_log(db, tenant_id=user.tenant_id, actor_id=user.id, action=f"{section.upper().replace('-', '_')}_CONFIGURATION_UPDATED", entity_type="SchoolConfiguration", entity_id=str(record.id), school_id=school.id, before_data=before["values"], after_data=serialize_config(record)["values"])
        await db.commit()
        return serialize_config(record)

    return read_section, update_section


for _section in SECTION_FIELDS:
    _read, _update = _section_route(_section)
    _read.__name__ = f"get_{_section.replace('-', '_')}_configuration"
    _update.__name__ = f"update_{_section.replace('-', '_')}_configuration"
    router.add_api_route(f"/{_section}", _read, methods=["GET"])
    router.add_api_route(f"/{_section}", _update, methods=["PATCH"], dependencies=[Depends(require_permissions(["settings.manage"]))])