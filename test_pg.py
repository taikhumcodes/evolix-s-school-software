import asyncio
import asyncpg
import sys

async def main():
    passwords = ["", "postgres", "admin", "password"]
    users = ["postgres", "root"]
    
    for u in users:
        for p in passwords:
            try:
                conn = await asyncpg.connect(user=u, password=p, host='127.0.0.1', port=5432, database='postgres', timeout=2)
                print(f"SUCCESS: user={u}, password={p}")
                await conn.close()
                return
            except asyncpg.exceptions.InvalidAuthorizationSpecificationError:
                pass
            except asyncpg.exceptions.InvalidPasswordError:
                pass
            except Exception as e:
                print(f"Error for {u}:{p} -> {e}")
                
    print("FAILED TO CONNECT")

if __name__ == '__main__':
    asyncio.run(main())
