if (-not (Test-Path -Path "backup/calendar_db_backup.sql")) {
    Write-Host "Error: Backup file backup/calendar_db_backup.sql not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Starting database restoration..." -ForegroundColor Yellow

# 1. Drop existing database (forcefully closing connections)
Write-Host "Dropping existing database..." -ForegroundColor Gray
docker compose exec -T db psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS calendar_db WITH (FORCE);"

# 2. Create fresh database
Write-Host "Creating fresh database..." -ForegroundColor Gray
docker compose exec -T db psql -U postgres -d postgres -c "CREATE DATABASE calendar_db;"

# 3. Restore from backup file
Write-Host "Restoring data from backup..." -ForegroundColor Gray
Get-Content backup/calendar_db_backup.sql -Raw | docker compose exec -T db psql -U postgres -d calendar_db

if ($LASTEXITCODE -eq 0) {
    Write-Host "Restoration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Restoration failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}
