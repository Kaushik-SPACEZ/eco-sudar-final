# Eco Sudar Backup Restore Runbook

## Create A Backup

1. In admin, call `POST /admin/backup/run` before every production migration.
2. Confirm `GET /admin/backup/status` shows the latest run as `completed`.
3. Copy the generated `api/backups/*.sql.gz` file off the server at least weekly.

## Restore Drill

1. Create a fresh staging database.
2. Download the latest `.sql.gz` backup.
3. Decompress it locally or in hosting file manager.
4. Import the SQL into the staging database using phpMyAdmin or MySQL CLI.
5. Point a staging `.env`/database config at the restored database.
6. Verify login, products, orders, invoices, employees, attendance, and finance reports.

## Recovery Targets

- RPO: latest completed backup.
- RTO: time to import the dump and switch database config.
- A backup is not considered proven until a restore drill has passed.
