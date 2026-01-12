/**
 * VCL-specific field extraction
 */

import type { RawKinesisRecord } from '../types.js';

export interface VclFields {
  vcl_subroutine?: string | undefined;
  vcl_title?: string | undefined;
  vcl_step?: string | undefined;
  vcl_version?: string | undefined;
  vcl_host?: string | undefined;
  vcl_path?: string | undefined;
  vcl_body?: string | undefined;
  vcl_graphql_query?: string | undefined;
  vcl_restarts?: number | undefined;
  vcl_backend?: string | undefined;
  vcl_cacheable?: boolean | undefined;
}

/**
 * Extract VCL-specific fields from record
 */
export function extractVclFields(record: RawKinesisRecord): VclFields {
  const restarts = record.Restarts;
  const cacheable = record.Cacheable;

  return {
    vcl_subroutine: record.Subroutine?.replace(/==/g, '').trim() || undefined,
    vcl_title: record.Title,
    vcl_step: record.Step,
    vcl_version: record['CDN Version'],
    vcl_host: record.Host,
    vcl_path: record.Path || record.PATH,
    vcl_body: record.Body,
    vcl_graphql_query: record['X-GraphQL-Query'],
    vcl_restarts:
      restarts !== undefined
        ? typeof restarts === 'number'
          ? restarts
          : parseInt(String(restarts), 10)
        : undefined,
    vcl_backend: record.Backend,
    vcl_cacheable:
      cacheable !== undefined
        ? typeof cacheable === 'boolean'
          ? cacheable
          : cacheable === 'true'
        : undefined,
  };
}
