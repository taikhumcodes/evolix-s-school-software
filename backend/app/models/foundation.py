import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, ForeignKey, Table, Integer, Date, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base, UUIDMixin, TimestampMixin, SoftDeleteMixin

role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', UUID(as_uuid=True), ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
    Column('permission_id', UUID(as_uuid=True), ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True)
)

user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('role_id', UUID(as_uuid=True), ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)
)

user_schools = Table(
    'user_schools',
    Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('school_id', UUID(as_uuid=True), ForeignKey('schools.id', ondelete='CASCADE'), primary_key=True)
)

class Tenant(UUIDMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = 'tenants'
    name: Mapped[str] = mapped_column(String)
    domain: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class School(UUIDMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = 'schools'
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'))
    code: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class Permission(UUIDMixin, Base):
    __tablename__ = 'permissions'
    code: Mapped[str] = mapped_column(String, unique=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)

class Role(UUIDMixin, TimestampMixin, Base):
    __tablename__ = 'roles'
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'))
    name: Mapped[str] = mapped_column(String)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    permissions: Mapped[list["Permission"]] = relationship(secondary=role_permissions, lazy="selectin")

class User(UUIDMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = 'users'
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'))
    email: Mapped[str] = mapped_column(String, unique=True)
    hashed_password: Mapped[str] = mapped_column(String)
    first_name: Mapped[str] = mapped_column(String)
    last_name: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    tenant: Mapped["Tenant"] = relationship("Tenant", lazy="selectin")
    roles: Mapped[list["Role"]] = relationship(secondary=user_roles, lazy="selectin")
    schools: Mapped[list["School"]] = relationship(secondary=user_schools, lazy="selectin")

class AcademicYear(UUIDMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = 'academic_years'
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('schools.id', ondelete='CASCADE'))
    name: Mapped[str] = mapped_column(String)
    start_date: Mapped[Date] = mapped_column(Date)
    end_date: Mapped[Date] = mapped_column(Date)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False)

class NumberSeries(UUIDMixin, TimestampMixin, Base):
    __tablename__ = 'number_series'
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'))
    school_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    code: Mapped[str] = mapped_column(String)
    prefix: Mapped[str | None] = mapped_column(String, nullable=True)
    suffix: Mapped[str | None] = mapped_column(String, nullable=True)
    padding: Mapped[int] = mapped_column(Integer, default=4)
    current_value: Mapped[int] = mapped_column(Integer, default=0)
    reset_strategy: Mapped[str | None] = mapped_column(String, nullable=True)

class AuditLog(UUIDMixin, TimestampMixin, Base):
    __tablename__ = 'audit_logs'
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=True)
    school_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    action: Mapped[str] = mapped_column(String)
    entity_type: Mapped[str] = mapped_column(String)
    entity_id: Mapped[str | None] = mapped_column(String, nullable=True)
    before_data: Mapped[str | None] = mapped_column(String, nullable=True)
    after_data: Mapped[str | None] = mapped_column(String, nullable=True)
    metadata_info: Mapped[str | None] = mapped_column(String, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String, nullable=True)

class RefreshToken(UUIDMixin, TimestampMixin, Base):
    __tablename__ = 'refresh_tokens'
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    token: Mapped[str] = mapped_column(String, unique=True)
    expires_at: Mapped[int] = mapped_column(Integer)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    replaced_by: Mapped[str | None] = mapped_column(String, nullable=True)
