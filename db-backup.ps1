# Create backup directory if it doesn't exist
if (-not (Test-Path -Path "backup")) {
    New-Item -ItemType Directory -Path "backup"
    Write-Host "Created backup directory." -ForegroundColor Cyan
}

Write-Host "Starting database backup..." -ForegroundColor Yellow

# Run pg_dump inside the docker container and save to backup/calendar_db_backup.sql
# Using -T to disable pseudo-TTY allocation (important for redirection)
docker compose exec -T db sh -c "PGPASSWORD=mayzer pg_dump -U postgres calendar_db" > backup/calendar_db_backup.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completed successfully: backup/calendar_db_backup.sql" -ForegroundColor Green
} else {
    Write-Host "Backup failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}
