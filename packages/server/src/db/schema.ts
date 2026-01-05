/**
 * Database Schema and Initialization
 *
 * Sets up SQLite database with tables for logs, metrics, and events.
 */

import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Database path in config directory
const ORION_CONFIG_DIR = path.join(os.homedir(), '.config/orion');
const DB_PATH = path.join(ORION_CONFIG_DIR, 'observability.db');

// Ensure directory exists
fs.mkdirSync(ORION_CONFIG_DIR, { recursive: true });

// Initialize database
const db: Database.Database = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // Better concurrent access
db.pragma('synchronous = NORMAL'); // Faster writes, still safe

// Create schema
db.exec(`
  -- Raw request logs (kept for 24 hours)
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,          -- Unix ms
    level TEXT DEFAULT 'info',           -- info, warn, error
    source TEXT DEFAULT 'cdn',           -- cdn, compute, backend, system

    -- Request data
    request_method TEXT,
    url TEXT,
    status_code INTEGER,
    latency_ms REAL,
    cache_status TEXT,                   -- HIT, MISS, PASS, etc.

    -- GraphQL specific
    operation_type TEXT,                 -- query, mutation
    operation_name TEXT,

    -- Raw message for non-request logs
    message TEXT,

    -- Full JSON for debugging
    raw_json TEXT
  );

  -- Index for time-based queries
  CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_logs_cache_status ON logs(cache_status, timestamp);

  -- Pre-aggregated metrics (1-second buckets)
  CREATE TABLE IF NOT EXISTS metrics_1s (
    bucket INTEGER PRIMARY KEY,          -- Unix second
    total_requests INTEGER DEFAULT 0,
    cache_hits INTEGER DEFAULT 0,
    cache_misses INTEGER DEFAULT 0,
    cache_passes INTEGER DEFAULT 0,
    errors_4xx INTEGER DEFAULT 0,
    errors_5xx INTEGER DEFAULT 0,
    sum_latency_ms REAL DEFAULT 0,
    min_latency_ms REAL,
    max_latency_ms REAL,

    -- For percentile calculation (store sorted latencies as JSON)
    latencies_json TEXT DEFAULT '[]'
  );

  -- Pre-aggregated metrics (1-minute buckets, for longer retention)
  CREATE TABLE IF NOT EXISTS metrics_1m (
    bucket INTEGER PRIMARY KEY,          -- Unix minute
    total_requests INTEGER DEFAULT 0,
    cache_hits INTEGER DEFAULT 0,
    cache_misses INTEGER DEFAULT 0,
    cache_passes INTEGER DEFAULT 0,
    errors_4xx INTEGER DEFAULT 0,
    errors_5xx INTEGER DEFAULT 0,
    sum_latency_ms REAL DEFAULT 0,
    min_latency_ms REAL,
    max_latency_ms REAL,
    p50_latency_ms REAL,
    p95_latency_ms REAL,
    p99_latency_ms REAL
  );

  -- System events (deployments, errors, etc.)
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    type TEXT NOT NULL,                  -- deploy, destroy, error, config_change
    message TEXT,
    metadata_json TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
`);

export { db, DB_PATH, ORION_CONFIG_DIR };
export default db;
