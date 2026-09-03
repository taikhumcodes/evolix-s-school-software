from fastapi import APIRouter
from app.api.v1.endpoints import users, roles, auth, permissions, number_series, academic_years, audit_logs, schools, security, configuration

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["permissions"])
api_router.include_router(security.router, prefix="/security", tags=["security"])
api_router.include_router(schools.router, prefix="/schools", tags=["schools"])
api_router.include_router(academic_years.router, prefix="/academic-years", tags=["academic-years"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])
api_router.include_router(number_series.router, prefix="/number-series", tags=["number-series"])
api_router.include_router(configuration.router, prefix="/configuration", tags=["configuration"])
