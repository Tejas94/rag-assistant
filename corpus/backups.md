# Backups and recovery

## Automatic backups

Every database is backed up automatically once every 24 hours. Starter keeps 7 days of backups, Team keeps 30 days and Enterprise keeps 90 days.

## Point-in-time recovery

Point-in-time recovery (PITR) is available on Team and Enterprise. It lets you restore a database to any second in the last 7 days. PITR is not available on Starter.

## Restoring

Restores always create a new database; the original is never overwritten. Use `nw db restore --at "2026-05-01T10:00:00Z"` for PITR or `nw db restore --backup <id>` for a daily backup. A 20 GB restore usually completes in about 12 minutes.

## Deleting backups

Backups are deleted automatically at the end of the retention period. When you delete a project, its backups are kept for 7 more days and then removed permanently.
