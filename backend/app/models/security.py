import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, DateTime, Text, JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, INET, ARRAY
from app.models.base import Base, UUIDMixin, TimestampMixin
from datetime import datetime

class SecurityPolicy(UUIDMixin, TimestampMixin, Base):
    __tablename__ = 'security_policies'
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), unique=True)
    
    password_min_length: Mapped[int] = mapped_column(Integer, default=8)
    password_require_uppercase: Mapped[bool] = mapped_column(Boolean, default=True)
    password_require_lowercase: Mapped[bool] = mapped_column(Boolean, default=True)
    password_require_number: Mapped[bool] = mapped_column(Boolean, default=True)
    password_require_special: Mapped[bool] = mapped_column(Boolean, default=False)
    password_history_count: Mapped[int] = mapped_column(Integer, default=3)
    password_expiry_days: Mapped[int] = mapped_column(Integer, default=0) # 0 means never expires
    
    max_failed_attempts: Mapped[int] = mapped_column(Integer, default=5)
    lockout_minutes: Mapped[int] = mapped_column(Integer, default=15)
    
    ip_restriction_mode: Mapped[str] = mapped_column(String, default='DISABLED') # ALLOW, DENY, DISABLED
    require_2fa_for_admins: Mapped[bool] = mapped_column(Boolean, default=False)

class UserTwoFactor(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "user_two_factor"
    
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    totp_secret: Mapped[str] = mapped_column(String) # Stored encrypted!
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    
class UserRecoveryCode(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "user_recovery_codes"
    
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    hashed_code: Mapped[str] = mapped_column(String)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)

class UserPasswordHistory(UUIDMixin, Base):
    __tablename__ = 'user_password_history'
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    hashed_password: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

class UserSession(UUIDMixin, TimestampMixin, Base):
    __tablename__ = 'user_sessions'
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    refresh_token_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey('refresh_tokens.id', ondelete='CASCADE'), nullable=True)
    
    ip_address: Mapped[str | None] = mapped_column(String, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    device_category: Mapped[str | None] = mapped_column(String, nullable=True) # e.g. Desktop, Mobile
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)

class IpRestriction(UUIDMixin, TimestampMixin, Base):
    __tablename__ = 'ip_restrictions'
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'))
    school_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey('schools.id', ondelete='CASCADE'), nullable=True)
    
    network_cidr: Mapped[str] = mapped_column(String) # We will use string to avoid issues, validate locally using ipaddress module
    rule_type: Mapped[str] = mapped_column(String) # ALLOW, DENY
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)

class SecurityEvent(UUIDMixin, Base):
    __tablename__ = 'security_events'
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'))
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    event_type: Mapped[str] = mapped_column(String)
    severity: Mapped[str] = mapped_column(String, default="INFO")
    ip_address: Mapped[str | None] = mapped_column(String, nullable=True)
    metadata_info: Mapped[str | None] = mapped_column(String, nullable=True) # Stored as JSON string
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

class PasswordResetToken(UUIDMixin, TimestampMixin, Base):
    __tablename__ = 'password_reset_tokens'
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    token_hash: Mapped[str] = mapped_column(String, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
