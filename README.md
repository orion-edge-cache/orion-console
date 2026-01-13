# Orion Console

Web-based dashboard for managing and monitoring Orion GraphQL Edge Cache infrastructure.

## Overview

Orion Console is a full-stack TypeScript monorepo providing a user-friendly web interface for deploying, configuring, and monitoring edge caching solutions across AWS and Fastly. It serves as the control center for the Orion ecosystem.

## Architecture

This is a monorepo containing:

- **packages/client** - React frontend with Vite, TanStack Router, and Tremor components
- **packages/server** - Express backend API with SSE streaming and SQLite database
- **packages/shared** - Shared TypeScript type definitions

## Features

- **Infrastructure Management** - Deploy and destroy AWS + Fastly infrastructure via Terraform
- **Real-time Monitoring** - Live metrics (hit rate, latency, requests/sec) via Server-Sent Events
- **Log Streaming** - Stream and search logs from AWS Kinesis with VCL field parsing
- **Credentials Management** - Securely store AWS and Fastly credentials
- **Configuration Editor** - Manage cache rules, TTL settings, and GraphQL endpoints
- **GraphQL Playground** - Test queries against your GraphQL API
- **Schema Visualization** - Introspect and view GraphQL schemas
- **Health Monitoring** - Track database, Kinesis, and Fastly service health

## Quick Start

```bash
# Install dependencies
npm install

# Start development servers (client + server)
npm run dev

# Build for production
npm run build
```

## Development

```bash
# Start client only (port 5173)
npm run dev:client

# Start server only (port 3001)
npm run dev:server

# Build all packages
npm run build
```

## API Routes

The server exposes the following endpoints:

| Route | Description |
|-------|-------------|
| `/api/status` | System health and state |
| `/api/credentials/*` | Credential management |
| `/api/infrastructure/*` | Infrastructure deploy/destroy/status |
| `/api/config/*` | Configuration management |
| `/api/observability/*` | Monitoring and health data |
| `/api/stream/*` | Real-time event streaming (SSE) |
| `/api/logs/*` | Log retrieval and filtering |
| `/api/schema/*` | GraphQL schema introspection |
| `/api/playground/*` | GraphQL playground proxy |
| `/api/cache/*` | Cache management |
| `/api/demo-tools/*` | Demo tooling integration |
| `/api/demo-app/*` | Demo application management |

## UI Routes

| Route | Description |
|-------|-------------|
| `/` | Smart router (redirects based on system state) |
| `/welcome` | Initial setup and deployment wizard |
| `/dashboard/overview` | Health metrics and system status |
| `/dashboard/analytics` | Performance metrics and charts |
| `/dashboard/infrastructure/*` | Infrastructure management |
| `/dashboard/logs` | Log streaming and search |
| `/dashboard/configure` | Configuration management |
| `/dashboard/playground` | GraphQL playground |
| `/dashboard/schema` | Schema visualization |

## Environment Variables

Server configuration:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `AWS_ACCESS_KEY_ID` | AWS access key | (optional) |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | (optional) |
| `FASTLY_API_TOKEN` | Fastly API token | (optional) |

## Technologies

**Frontend:**
- React 18 with Vite
- TanStack Router (file-based routing)
- TanStack React Query (data fetching)
- Tremor React (dashboard components)
- Recharts (data visualization)
- Tailwind CSS

**Backend:**
- Express.js
- AWS SDK v3 (CloudFormation, Kinesis, STS)
- better-sqlite3 (observability database)
- Server-Sent Events for real-time streaming

## License

ISC
