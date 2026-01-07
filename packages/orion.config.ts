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
    "maxAge": 300,
    "staleWhileRevalidate": 0,
    "staleIfError": 0
  },
  "rules": [
    {
      "types": [
        "User"
      ],
      "maxAge": 300,
      "staleWhileRevalidate": 60,
      "staleIfError": 300,
      "scope": "private"
    },
    {
      "types": [
        "Post"
      ],
      "maxAge": 300,
      "staleWhileRevalidate": 60,
      "staleIfError": 300,
      "scope": "public"
    },
    {
      "types": [
        "Comment"
      ],
      "maxAge": 300,
      "staleWhileRevalidate": 60,
      "staleIfError": 300,
      "scope": "public"
    },
    {
      "types": [
        "DatabaseResetResponse"
      ],
      "maxAge": 0,
      "scope": "private",
      "passthrough": true
    }
  ],
  "invalidations": {
    "createUser": [
      "User"
    ],
    "createPost": [
      "Post"
    ],
    "createComment": [
      "Comment"
    ],
    "updateUser": [
      "User"
    ],
    "updatePost": [
      "Post"
    ],
    "updateComment": [
      "Comment"
    ],
    "deleteUser": [
      "User"
    ],
    "deletePost": [
      "Post"
    ],
    "deleteComment": [
      "Comment"
    ],
    "reset": [
      "User",
      "Post",
      "Comment"
    ]
  }
};

export default config;
