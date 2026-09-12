#!/usr/bin/env bash
# Daily backup for the Directus SQLite database + uploads, with 7-day retention.
#
# Runs from anywhere (cds into its own dir), so the same command works when
# invoked from cron:
#   0 3 * * * /root/hosting/portifolio-worker/deploy/directus/backup.sh >> /root/hosting/portifolio-worker/deploy/directus/backups/backup.log 2>&1
#
# Requires: docker (host lacks sqlite3; uses the nouchka/sqlite3 image).

set -euo pipefail

cd "$(dirname "$0")"

mkdir -p database backups

if [ ! -f database/data.db ]; then
	echo "$(date -Is) ERROR: database/data.db not found (run docker compose up -d first)" >&2
	exit 1
fi

DAY="$(date +%F)"
BACKUP_DB="backups/data-${DAY}.db"
BACKUP_GZ="backups/data-${DAY}.db.gz"
UPLOADS_TAR="backups/uploads-${DAY}.tar.gz"

echo "$(date -Is) backup start"

# SQLite online backup via the sqlite3 docker image (no host package needed).
# `$(pwd)` must stay inside deploy/directus so the volume mounts line up.
docker run --rm \
	-v "$(pwd)/database:/db" \
	-v "$(pwd)/backups:/backups" \
	nouchka/sqlite3 "/db/data.db" ".backup '/backups/data-${DAY}.db'"

if [ ! -s "$BACKUP_DB" ]; then
	echo "$(date -Is) ERROR: empty backup file ${BACKUP_DB}" >&2
	exit 1
fi

gzip -f "$BACKUP_DB"
echo "$(date -Is) database backup: ${BACKUP_GZ}"

tar czf "$UPLOADS_TAR" uploads/
echo "$(date -Is) uploads backup: ${UPLOADS_TAR}"

# Prune backups older than 7 days (keeps the newest db.gz + uploads tarball).
find backups -maxdepth 1 -type f -mtime +7 -delete
echo "$(date -Is) backups pruned (retention: 7 days)"

echo "$(date -Is) backup done"