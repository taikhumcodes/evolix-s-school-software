import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        await db.execute(text("""
            UPDATE branding_configurations 
            SET logo_storage_key = 'schools/0dcc308f-b67c-484b-baa7-093fe05416c8/branding/cec793e8557f475abfb845f274961ffb',
                logo_file_id = 'cec793e8557f475abfb845f274961ffb',
                logo_content_type = 'image/png',
                logo_size = 936262
            WHERE school_id = '0dcc308f-b67c-484b-baa7-093fe05416c8'
        """))
        await db.commit()
        print("Logo restored successfully!")

if __name__ == "__main__":
    asyncio.run(main())
