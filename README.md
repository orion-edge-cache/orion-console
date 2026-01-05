# Orion Console

Web-based dashboard for managing and monitoring Orion GraphQL Edge Cache infrastructure.

## Architecture

This is a monorepo containing:
- **packages/client** - React frontend (Vite + TanStack Router)
- **packages/server** - Express backend API
- **packages/shared** - Shared TypeScript types

## Features

- **Infrastructure Management** - Deploy and destroy AWS + Fastly infrastructure
- **Real-time Monitoring** - Live metrics via Server-Sent Events (SSE)
- **Logs Viewer** - Stream and search logs from Kinesis
- **Credentials Management** - Securely store AWS and Fastly credentials
- **Configuration** - Manage GraphQL backend endpoints
- **Observability** - Monitor Kinesis consumer and SSE connections

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
# Start client only
npm run dev:client

# Start server only
npm run dev:server

# Build all packages
npm run build
```

## Environment Variables

Server requires:
- `PORT` - Server port (default: 3001)
- Optional: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `FASTLY_API_TOKEN`

## Deployment

The console is designed to run locally or on a private network. It provides a web interface for managing infrastructure deployed by the Orion CLI.

## License

ISC
