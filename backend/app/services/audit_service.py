"""
Audit logging service for EVOLIX School ERP.

Provides a reusable function to write structured audit events to the audit_logs table.
Sensitive fields (passwords, tokens) are automatically redacted from before/after data.
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.foundation import AuditLog

SENSITIVE_FIELDS = frozenset({
    "hashed_password", "password", "token", "refresh_token",
    "access_token", "secret", "secret_key",
})


def _redact(data: Optional[dict]) -> Optional[str]:
    """Serialize dict to JSON string, redacting sensitive fields."""
    if data is None:
        return None
    safe = {}
    for k, v in data.items():
        if k.lower() in SENSITIVE_FIELDS:
            safe[k] = "***REDACTED***"
        elif isinstance(v, (uuid.UUID, datetime)):
            safe[k] = str(v)
        else:
            safe[k] = v
    return json.dumps(safe, default=str)


async def write_audit_log(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    actor_id: uuid.UUID,
    action: str,
    entity_type: str,
    entity_id: str,
    school_id: Optional[uuid.UUID] = None,
    before_data: Optional[dict] = None,
    after_data: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """
    Write a single audit log entry.

    Args:
        db: Active async database session.
        tenant_id: The tenant scope.
        actor_id: The user performing the action.
        action: Event code, e.g. USER_CREATED, ROLE_UPDATED.
        entity_type: Type of entity, e.g. "User", "Role", "AcademicYear".
        entity_id: UUID (as string) of the affected entity.
        school_id: School scope if applicable.
        before_data: Snapshot before mutation (optional).
        after_data: Snapshot after mutation (optional).
        ip_address: Client IP if available.

    Returns:
        The created AuditLog record.
    """
    log = AuditLog(
        tenant_id=tenant_id,
        school_id=school_id,
        user_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        before_data=_redact(before_data),
        after_data=_redact(after_data),
        ip_address=ip_address,
    )
    db.add(log)
    # Flush so the log gets an ID, but don't commit — let the caller's transaction handle that.
    await db.flush()
    return log
