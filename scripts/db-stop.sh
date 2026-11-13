#!/usr/bin/env bash
# LeadPilot Database Shutdown Helper

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PG_DATA="${PG_DATA:-$PROJECT_DIR/.postgres/data}"

find_pg_bin() {
    local bin="$1"
    if command -v "$bin" >/dev/null 2>&1; then
        command -v "$bin"
        return 0
    fi
    for p in /usr/lib/postgresql/*/bin/"$bin"; do
        if [ -x "$p" ]; then
            echo "$p"
            return 0
        fi
    done
    return 1
}

PG_CTL_BIN=$(find_pg_bin pg_ctl) || { echo "pg_ctl not found"; exit 1; }

if [ -d "$PG_DATA" ]; then
    echo "Stopping PostgreSQL server..."
    "$PG_CTL_BIN" -D "$PG_DATA" stop -m fast || true
    echo "PostgreSQL stopped."
else
    echo "Data directory $PG_DATA does not exist."
fi

