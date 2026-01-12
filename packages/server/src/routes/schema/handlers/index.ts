/**
 * Schema route handlers
 */

export { getEndpoint, testEndpoint } from './endpoint-handlers.js';
export {
  getCredentialsStatus,
  resolveCredentials,
  saveCredentials,
  validateCredentials,
} from './credential-handlers.js';
export { getProviders } from './provider-handlers.js';
export {
  analyzeSchemaHandler,
  generateConfigHandler,
  generateBasicHandler,
} from './analysis-handlers.js';
