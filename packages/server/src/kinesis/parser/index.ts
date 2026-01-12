/**
 * Parser module exports
 */

export {
  parseTimestamp,
  detectSource,
  extractCacheStatus,
  extractStatusCode,
  determineLevel,
  extractLatency,
} from './field-extractors.js';

export { extractVclFields, type VclFields } from './vcl-fields.js';

export {
  buildRequestCompletionMessage,
  buildVclDebugMessage,
  buildComputeMessage,
  buildMessage,
} from './message-builder.js';
