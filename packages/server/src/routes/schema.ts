/**
 * Schema Routes
 *
 * API endpoints for GraphQL schema analysis and AI-powered cache config generation.
 * Uses @orion/schema package for core functionality.
 */

import express from 'express';
import {
  getEndpoint,
  testEndpoint,
  getCredentialsStatus,
  resolveCredentials,
  saveCredentials,
  validateCredentials,
  getProviders,
  analyzeSchemaHandler,
  generateConfigHandler,
  generateBasicHandler,
} from './schema/handlers/index.js';

const router = express.Router();

// =============================================================================
// ENDPOINT ROUTES
// =============================================================================

router.get('/schema/endpoint', getEndpoint);
router.post('/schema/endpoint/test', testEndpoint);

// =============================================================================
// CREDENTIAL ROUTES
// =============================================================================

router.get('/schema/credentials/status', getCredentialsStatus);
router.post('/schema/credentials/resolve', resolveCredentials);
router.post('/schema/credentials/save', saveCredentials);
router.post('/schema/credentials/validate', validateCredentials);

// =============================================================================
// PROVIDER ROUTES
// =============================================================================

router.get('/schema/providers', getProviders);

// =============================================================================
// SCHEMA ANALYSIS ROUTES
// =============================================================================

router.post('/schema/analyze', analyzeSchemaHandler);

// =============================================================================
// CONFIG GENERATION ROUTES
// =============================================================================

router.post('/schema/generate-config', generateConfigHandler);
router.post('/schema/generate-basic', generateBasicHandler);

export default router;
