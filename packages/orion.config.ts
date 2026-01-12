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
    "maxAge": 60,
    "staleWhileRevalidate": 0,
    "staleIfError": 0
  },
  "rules": [
    {
      "types": [
        "Users"
      ],
      "maxAge": 0,
      "scope": "private"
    }
  ],
  "invalidations": {}
};

export default config;
