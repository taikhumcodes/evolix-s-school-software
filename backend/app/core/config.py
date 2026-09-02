import os
class Settings:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres@127.0.0.1:5432/postgres")
    TRUSTED_PROXY_CIDRS = os.getenv("TRUSTED_PROXY_CIDRS", "")
settings = Settings()
