/**
 * Events Database Operations
 *
 * Functions for inserting and querying system events.
 */

import { db } from './schema.js';
import type { SystemEvent } from '../types/system.js';

// Re-export SystemEvent for convenience
export type { SystemEvent };

const insertEventStmt = db.prepare(`
  INSERT INTO events (timestamp, type, message, metadata_json)
  VALUES (@timestamp, @type, @message, @metadata_json)
`);

/**
 * Insert a system event into the database
 */
export function insertEvent(event: SystemEvent): void {
  insertEventStmt.run({
    timestamp: event.timestamp,
    type: event.type,
    message: event.message,
    metadata_json: event.metadata ? JSON.stringify(event.metadata) : null,
  });
}

const getEventsStmt = db.prepare(`
  SELECT * FROM events
  WHERE timestamp > @since
  ORDER BY timestamp DESC
  LIMIT @limit
`);

/**
 * Get events since a given timestamp
 */
export function getEvents(since: number = Date.now() - 86400000, limit: number = 100): SystemEvent[] {
  const rows = getEventsStmt.all({ since, limit }) as any[];
  return rows.map(row => ({
    id: row.id,
    timestamp: row.timestamp,
    type: row.type,
    message: row.message,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
  }));
}
