/**
 * ORION Cache Configuration
 *
 * This file defines caching rules, TTLs, and invalidation mappings
 * for your GraphQL edge cache.
 */

const config = {
  "version": "1.0",
  "name": "orion",
  "defaults": {
    "maxAge": 90,
    "staleWhileRevalidate": 0,
    "staleIfError": 0
  },
  "rules": [],
  "invalidations": {}
};

export default config;
