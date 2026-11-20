#!/usr/bin/env bash
# LeadPilot Database Startup Helper
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Postgres data directory inside the workspace
PG_DATA="${PG_DATA:-$PROJECT_DIR/.postgres/data}"
PG_LOG="${PG_LOG:-$PROJECT_DIR/.postgres/logfile}"

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

INITDB_BIN=$(find_pg_bin initdb) || { echo "initdb not found"; exit 1; }
PG_CTL_BIN=$(find_pg_bin pg_ctl) || { echo "pg_ctl not found"; exit 1; }
PG_ISREADY_BIN=$(find_pg_bin pg_isready) || { echo "pg_isready not found"; exit 1; }
CREATEDB_BIN=$(find_pg_bin createdb) || { echo "createdb not found"; exit 1; }
PSQL_BIN=$(find_pg_bin psql) || { echo "psql not found"; exit 1; }

# Initialize data directory if not present
if [ ! -d "$PG_DATA" ] || [ ! -f "$PG_DATA/PG_VERSION" ]; then
    echo "Initializing PostgreSQL database cluster at $PG_DATA..."
    mkdir -p "$PG_DATA"
    "$INITDB_BIN" -D "$PG_DATA" -U postgres -A trust
fi

# Clean up stale socket lock if previous server process was killed
if [ -f /tmp/.s.PGSQL.5432.lock ]; then
    LOCK_PID=$(head -n 1 /tmp/.s.PGSQL.5432.lock 2>/dev/null || true)
    if [ -n "$LOCK_PID" ] && ! kill -0 "$LOCK_PID" 2>/dev/null; then
        rm -f /tmp/.s.PGSQL.5432 /tmp/.s.PGSQL.5432.lock 2>/dev/null || true
    fi
fi

# Clean up stale postmaster.pid and shared memory if previous server was killed
if [ -f "$PG_DATA/postmaster.pid" ]; then
    PID_IN_FILE=$(head -n 1 "$PG_DATA/postmaster.pid" 2>/dev/null || true)
    if [ -n "$PID_IN_FILE" ] && ! kill -0 "$PID_IN_FILE" 2>/dev/null; then
        echo "Cleaning up stale postmaster.pid (PID $PID_IN_FILE is not running)..."
        rm -f "$PG_DATA/postmaster.pid" 2>/dev/null || true
        ipcrm --all=shm 2>/dev/null || true
    fi
fi

# Check if PostgreSQL is already running
if "$PG_ISREADY_BIN" -h 127.0.0.1 -p 5432 >/dev/null 2>&1 || "$PG_ISREADY_BIN" -h localhost -p 5432 >/dev/null 2>&1 || "$PG_ISREADY_BIN" -h /tmp -p 5432 >/dev/null 2>&1; then
    echo "PostgreSQL is already running."
    exit 0
fi
    echo "Starting PostgreSQL server on port 5432..."
    mkdir -p "$(dirname "$PG_LOG")"
    "$PG_CTL_BIN" -D "$PG_DATA" -l "$PG_LOG" -o "-p 5432 -k /tmp" start
    
    # Wait for ready
    READY=0
    for i in {1..20}; do
        if "$PG_ISREADY_BIN" -h /tmp -p 5432 >/dev/null 2>&1 || "$PG_ISREADY_BIN" -h localhost -p 5432 >/dev/null 2>&1; then
            READY=1
            break
        fi
        sleep 0.5
    done

    if [ "$READY" -eq 1 ]; then
        echo "PostgreSQL started successfully."
    else
        echo "PostgreSQL did not start in time. Check $PG_LOG"
        exit 1
    fi

# Ensure database 'leadpilot' exists
DB_EXISTS=$("$PSQL_BIN" -h 127.0.0.1 -p 5432 -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw leadpilot && echo 1 || echo 0)
if [ "$DB_EXISTS" -eq 0 ]; then
    echo "Creating database 'leadpilot'..."
    "$CREATEDB_BIN" -h 127.0.0.1 -p 5432 -U postgres leadpilot 2>/dev/null || true
    echo "Database 'leadpilot' created."
fi

echo "Database environment is ready."
