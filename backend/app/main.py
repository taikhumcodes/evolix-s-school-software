from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.services.security_service import SecurityService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Enforce that TOTP_ENCRYPTION_KEY is configured and valid on startup
    SecurityService._get_fernet()
    yield

app = FastAPI(title="Evolix School ERP", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
