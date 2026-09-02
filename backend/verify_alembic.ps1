$env:PYTHONPATH="."
Write-Host "Running Alembic Downgrade Base..."
..\venv311\Scripts\alembic downgrade base
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host "Running Alembic Upgrade Head..."
..\venv311\Scripts\alembic upgrade head
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host "Re-seeding database..."
..\venv311\Scripts\python scripts\seed.py
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host "Alembic verification successful."
