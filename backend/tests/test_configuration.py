import uuid

import pytest
from app.storage.base import get_storage_backend


async def school_id(client, token):
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    return response.json()["schools"][0]["id"]


@pytest.mark.asyncio
async def test_configuration_defaults_and_update(client, admin_token):
    sid = await school_id(client, admin_token)
    response = await client.get("/api/v1/configuration/effective", params={"school_id": sid}, headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert response.json()["values"]["default_language"] == "en"
    version = response.json()["version"]
    updated = await client.patch("/api/v1/configuration/attendance", params={"school_id": sid}, headers={"Authorization": f"Bearer {admin_token}"}, json={"version": version, "values": {"attendance_lock_hours": 12}})
    assert updated.status_code == 200
    assert updated.json()["values"]["attendance_lock_hours"] == 12
    assert updated.json()["version"] == version + 1


@pytest.mark.asyncio
@pytest.mark.parametrize("section,field,value", [("attendance", "attendance_lock_hours", -1), ("fees", "late_fee_grace_days", -2), ("exams", "passing_percentage", 101), ("promotion", "minimum_attendance_percentage", -1)])
async def test_configuration_rejects_invalid_values(client, admin_token, section, field, value):
    sid = await school_id(client, admin_token)
    current = await client.get(f"/api/v1/configuration/{section}", params={"school_id": sid}, headers={"Authorization": f"Bearer {admin_token}"})
    response = await client.patch(f"/api/v1/configuration/{section}", params={"school_id": sid}, headers={"Authorization": f"Bearer {admin_token}"}, json={"version": current.json()["version"], "values": {field: value}})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_configuration_version_conflict(client, admin_token):
    sid = await school_id(client, admin_token)
    current = await client.get("/api/v1/configuration/fees", params={"school_id": sid}, headers={"Authorization": f"Bearer {admin_token}"})
    payload = {"version": current.json()["version"], "values": {"allow_partial_payment": False}}
    first = await client.patch("/api/v1/configuration/fees", params={"school_id": sid}, headers={"Authorization": f"Bearer {admin_token}"}, json=payload)
    second = await client.patch("/api/v1/configuration/fees", params={"school_id": sid}, headers={"Authorization": f"Bearer {admin_token}"}, json=payload)
    assert first.status_code == 200
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_configuration_restricted_user_cannot_update(client, admin_token):
    login = await client.post("/api/v1/auth/login", json={"email": "restricted_a@evolix.com", "password": "password"})
    assert login.status_code == 200
    restricted_token = login.json()["access_token"]
    sid = await school_id(client, admin_token)
    current = await client.get("/api/v1/configuration/academic", params={"school_id": sid}, headers={"Authorization": f"Bearer {admin_token}"})
    response = await client.patch("/api/v1/configuration/academic", params={"school_id": sid}, headers={"Authorization": f"Bearer {restricted_token}"}, json={"version": current.json()["version"], "values": {"week_start": 2}})
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_configuration_tenant_and_school_isolation(client, admin_token):
    sid = await school_id(client, admin_token)
    current = await client.get("/api/v1/configuration/school", params={"school_id": sid}, headers={"Authorization": f"Bearer {admin_token}"})
    unknown = str(uuid.uuid4())
    response = await client.get("/api/v1/configuration/school", params={"school_id": unknown}, headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 403
    response = await client.patch("/api/v1/configuration/school", params={"school_id": unknown}, headers={"Authorization": f"Bearer {admin_token}"}, json={"version": current.json()["version"], "values": {"short_name": "Unsafe"}})
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_configuration_audit_and_branding_metadata(client, admin_token):
    sid = await school_id(client, admin_token)
    branding = await client.post("/api/v1/configuration/branding/upload-metadata", params={"school_id": sid}, headers={"Authorization": f"Bearer {admin_token}"}, json={"file_id": "logo-1", "storage_key": "schools/logo-1.png", "content_type": "image/png", "size": 1024})
    assert branding.status_code == 200
    assert branding.json()["values"]["logo_file_id"] == "logo-1"
    audit = await client.get("/api/v1/audit-logs", params={"action": "BRANDING_UPDATED"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert audit.status_code == 200
    assert audit.json()["total"] >= 1


@pytest.mark.asyncio
async def test_branding_multipart_upload_validates_signature_and_size(client, admin_token):
    sid = await school_id(client, admin_token)
    valid = await client.post("/api/v1/configuration/branding/upload", params={"school_id": sid}, headers={"Authorization": f"Bearer {admin_token}"}, files={"file": ("logo.png", b"\x89PNG\r\n\x1a\nvalid", "image/png")})
    assert valid.status_code == 200
    storage_key = valid.json()["values"]["logo_storage_key"]
    storage = get_storage_backend("local", {"LOCAL_STORAGE_PATH": "./custom_storage"})
    assert storage.exists(storage_key)
    
    # Test retrieving the uploaded asset (unauthenticated for img tags)
    fetched = await client.get("/api/v1/configuration/branding/asset/logo", params={"school_id": sid})
    assert fetched.status_code == 200
    assert fetched.content == b"\x89PNG\r\n\x1a\nvalid"
    assert fetched.headers["content-type"] == "image/png"
    
    # Test deleting the branding asset
    deleted = await client.delete("/api/v1/configuration/branding/asset/logo", params={"school_id": sid}, headers={"Authorization": f"Bearer {admin_token}"})
    assert deleted.status_code == 200
    assert deleted.json()["values"]["logo_file_id"] is None
    assert not storage.exists(storage_key)

    invalid = await client.post("/api/v1/configuration/branding/upload", params={"school_id": sid}, headers={"Authorization": f"Bearer {admin_token}"}, files={"file": ("script.png", b"not-an-image", "image/png")})
    assert invalid.status_code == 422


@pytest.mark.asyncio
async def test_number_series_preview_and_safe_update(client, admin_token, db):
    sid = uuid.UUID(await school_id(client, admin_token))
    from app.models.foundation import NumberSeries
    series = NumberSeries(tenant_id=uuid.UUID((await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})).json()["tenant_id"]), school_id=sid, code="STUDENT_ID", prefix="STU-{YYYY}-", padding=4, current_value=3)
    db.add(series)
    await db.commit()
    response = await client.get(f"/api/v1/configuration/number-series/{series.id}/preview", params={"school_id": str(sid), "prefix": "STU-{YYYY}-", "padding": 5}, headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    from datetime import datetime
    current_year = datetime.utcnow().year
    assert response.json()["preview"] == f"STU-{current_year}-00004"
    update = await client.patch(f"/api/v1/configuration/number-series/{series.id}", params={"school_id": str(sid)}, headers={"Authorization": f"Bearer {admin_token}"}, json={"prefix": "NEW-", "padding": 5, "reset_strategy": "MONTHLY"})
    assert update.status_code == 200
    assert update.json()["current_value"] == 3


@pytest.mark.asyncio
async def test_configuration_history_date_filter(client, admin_token):
    sid = await school_id(client, admin_token)
    response = await client.get("/api/v1/configuration/history", params={"school_id": sid, "date_from": "2000-01-01T00:00:00Z"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200