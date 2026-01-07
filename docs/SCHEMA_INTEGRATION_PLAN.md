# @orion/schema Integration Plan for orion-console

## Overview

This document outlines the complete strategy for integrating the `@orion/schema` package into the orion-console web application. The integration will enable users to analyze GraphQL schemas and generate optimal cache configurations through a web-based UI.

**Status:** Planning Phase - Ready for discussion and refinement

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Implementation Phases](#implementation-phases)
3. [Design Decisions](#design-decisions)
4. [File Structure](#file-structure)
5. [Success Criteria](#success-criteria)
6. [Optional Enhancements](#optional-enhancements)
7. [Dependencies](#dependencies)
8. [Timeline & Effort](#timeline--effort)

---

## Architecture Overview

The integration follows a **3-layer architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│  Client Layer (React)                                   │
│  - Schema Analysis UI Component                         │
│  - Config Generation UI Component                       │
│  - Real-time feedback & progress                        │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────────────────┐
│  Server Layer (Express)                                 │
│  - POST /api/schema/analyze                             │
│  - POST /api/schema/generate-config                     │
│  - GET /api/schema/providers (list AI providers)        │
└────────────────────┬────────────────────────────────────┘
                     │ Direct Import
┌────────────────────▼────────────────────────────────────┐
│  @orion/schema Package                                  │
│  - fetchSchema()                                        │
│  - analyzeSchema()                                      │
│  - generateCacheConfig()                                │
│  - generateBasicConfig()                                │
└─────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

**Client Layer:**
- User input validation (endpoint URL, preferences)
- Real-time UI feedback and progress indicators
- Display analysis results and generated configs
- Handle user interactions (save, copy, edit)

**Server Layer:**
- Fetch GraphQL schemas (avoids CORS issues)
- Perform schema analysis
- Generate cache configurations
- Manage AI provider credentials securely
- Stream long-running operations

**@orion/schema Package:**
- Pure schema analysis logic
- AI provider integrations
- Config generation algorithms
- Reusable across CLI and web

---

## Implementation Phases

### Phase 1: Server Setup (Backend API)

**Duration:** ~30 minutes | **Complexity:** Low

#### 1.1 Add @orion/schema Dependency

Update `packages/server/package.json`:

```json
{
  "dependencies": {
    "@orion/schema": "file:../../orion-schema"
  }
}
```

Then run:
```bash
cd packages/server
npm install
```

#### 1.2 Create Schema Routes

**File:** `packages/server/src/routes/schema.ts`

```typescript
import express from 'express';
import {
  fetchSchema,
  analyzeSchema,
  generateCacheConfig,
  generateBasicConfig,
  isOllamaAvailable,
  getOllamaModels,
  PROVIDER_INFO,
  type AIProviderConfig,
  type ConfigPreferences,
} from '@orion/schema';

const router = express.Router();

/**
 * POST /api/schema/analyze
 * 
 * Analyze a GraphQL schema without generating config
 * 
 * Request body:
 * {
 *   endpoint: string  // GraphQL endpoint URL
 * }
 * 
 * Response:
 * {
 *   entities: Entity[],
 *   relationships: Relationship[],
 *   characteristics: Characteristics,
 *   summary: string
 * }
 */
router.post('/schema/analyze', async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    // Validate URL
    try {
      new URL(endpoint);
    } catch {
      return res.status(400).json({ error: 'Invalid endpoint URL' });
    }

    // Fetch and analyze schema
    const schema = await fetchSchema(endpoint);
    const analysis = await analyzeSchema(schema);

    res.json(analysis);
  } catch (error) {
    console.error('Schema analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze schema',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/schema/generate-config
 * 
 * Generate cache configuration for a GraphQL schema
 * 
 * Request body:
 * {
 *   endpoint: string,
 *   preferences: {
 *     defaultTTL?: number,
 *     defaultScope?: 'public' | 'private',
 *     enableInvalidation?: boolean
 *   },
 *   aiProvider?: {
 *     type: 'anthropic' | 'openai' | 'ollama' | 'groq' | 'huggingface',
 *     apiKey?: string,
 *     model?: string,
 *     baseUrl?: string
 *   }
 * }
 * 
 * Response:
 * {
 *   config: OrionCacheConfig,
 *   analysis: SchemaAnalysis,
 *   generatedAt: string
 * }
 */
router.post('/schema/generate-config', async (req, res) => {
  try {
    const { endpoint, preferences, aiProvider } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    // Validate URL
    try {
      new URL(endpoint);
    } catch {
      return res.status(400).json({ error: 'Invalid endpoint URL' });
    }

    // Fetch schema
    const schema = await fetchSchema(endpoint);
    const analysis = await analyzeSchema(schema);

    // Generate config
    let config;
    if (aiProvider) {
      config = await generateCacheConfig(schema, analysis, preferences, aiProvider);
    } else {
      config = generateBasicConfig(analysis, preferences);
    }

    res.json({
      config,
      analysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Config generation error:', error);
    res.status(500).json({
      error: 'Failed to generate config',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/schema/providers
 * 
 * Get available AI providers and their status
 * 
 * Response:
 * {
 *   providers: {
 *     name: string,
 *     type: string,
 *     requiresApiKey: boolean,
 *     description: string
 *   }[],
 *   ollamaAvailable: boolean,
 *   ollamaModels: string[]
 * }
 */
router.get('/schema/providers', async (req, res) => {
  try {
    const ollamaAvailable = await isOllamaAvailable();
    let ollamaModels: string[] = [];

    if (ollamaAvailable) {
      ollamaModels = await getOllamaModels();
    }

    res.json({
      providers: Object.values(PROVIDER_INFO),
      ollamaAvailable,
      ollamaModels,
    });
  } catch (error) {
    console.error('Provider info error:', error);
    res.status(500).json({
      error: 'Failed to get provider info',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
```

#### 1.3 Register Routes in Server

**File:** `packages/server/src/index.ts`

Add the import and route registration:

```typescript
import schemaRoutes from "./routes/schema.js";

// ... existing code ...

app.use("/api", schemaRoutes);
```

#### 1.4 Add Types to Shared Package

**File:** `packages/shared/src/types/schema.ts`

Export types from @orion/schema for client-side usage:

```typescript
export type {
  SchemaAnalysis,
  Entity,
  Relationship,
  Characteristics,
  OrionCacheConfig,
  AIProviderConfig,
  ConfigPreferences,
  ProviderInfo,
} from '@orion/schema';
```

Update `packages/shared/src/types/index.ts` to export schema types:

```typescript
export * from './schema.js';
```

---

### Phase 2: Client UI Components (Frontend)

**Duration:** ~2-3 hours | **Complexity:** Medium

#### 2.1 Create Schema Analysis Service

**File:** `packages/client/src/services/schema-api.ts`

```typescript
import type {
  SchemaAnalysis,
  OrionCacheConfig,
  AIProviderConfig,
  ConfigPreferences,
} from '@orion-console/shared';

export interface AnalyzeResponse {
  entities: any[];
  relationships: any[];
  characteristics: any;
  summary: string;
}

export interface GenerateConfigResponse {
  config: OrionCacheConfig;
  analysis: SchemaAnalysis;
  generatedAt: string;
}

export interface ProvidersResponse {
  providers: any[];
  ollamaAvailable: boolean;
  ollamaModels: string[];
}

export const analyzeSchema = async (endpoint: string): Promise<AnalyzeResponse> => {
  const response = await fetch('/api/schema/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to analyze schema');
  }

  return response.json();
};

export const generateCacheConfig = async (
  endpoint: string,
  preferences: ConfigPreferences,
  aiProvider?: AIProviderConfig
): Promise<GenerateConfigResponse> => {
  const response = await fetch('/api/schema/generate-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, preferences, aiProvider }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate config');
  }

  return response.json();
};

export const getProviders = async (): Promise<ProvidersResponse> => {
  const response = await fetch('/api/schema/providers');

  if (!response.ok) {
    throw new Error('Failed to fetch providers');
  }

  return response.json();
};
```

#### 2.2 Create Schema Analyzer Component

**File:** `packages/client/src/components/SchemaAnalyzer.tsx`

Features:
- GraphQL endpoint input with URL validation
- Real-time introspection availability check
- Display analysis results:
  - Entity types and fields
  - Relationships between types
  - Characteristics (volatile, user-specific, sensitive data)
  - Auto-generated summary
- Error handling with user-friendly messages
- Loading states with spinners

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Title, Text, Button, TextInput, Badge, Flex, Grid, Col } from '@tremor/react';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { analyzeSchema } from '../services/schema-api';

export function SchemaAnalyzer() {
  const [endpoint, setEndpoint] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data, error, isLoading } = useQuery({
    queryKey: ['schema-analysis', endpoint],
    queryFn: () => analyzeSchema(endpoint),
    enabled: false,
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    // Trigger query
  };

  return (
    <Card>
      <Title>Schema Analysis</Title>
      <Text>Analyze your GraphQL schema to understand its structure</Text>
      
      {/* Input section */}
      <Flex gap="2" className="mt-4">
        <TextInput
          placeholder="https://api.example.com/graphql"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          disabled={isLoading}
        />
        <Button onClick={handleAnalyze} disabled={!endpoint || isLoading}>
          {isLoading ? <Loader className="animate-spin" /> : 'Analyze'}
        </Button>
      </Flex>

      {/* Results section */}
      {data && (
        <Grid className="mt-6">
          <Col>
            <Card>
              <Title>Entities Found</Title>
              {/* Display entities */}
            </Card>
          </Col>
          <Col>
            <Card>
              <Title>Relationships</Title>
              {/* Display relationships */}
            </Card>
          </Col>
          <Col>
            <Card>
              <Title>Characteristics</Title>
              {/* Display characteristics */}
            </Card>
          </Col>
        </Grid>
      )}

      {/* Error section */}
      {error && (
        <Card className="mt-4 border-red-200 bg-red-50">
          <Flex>
            <AlertCircle className="text-red-600" />
            <Text className="text-red-600">{error.message}</Text>
          </Flex>
        </Card>
      )}
    </Card>
  );
}
```

#### 2.3 Create Config Generator Component

**File:** `packages/client/src/components/ConfigGenerator.tsx`

Features:
- AI provider selection dropdown
- Auto-detection of Ollama availability
- Config preference options:
  - Default TTL (seconds)
  - Default scope (public/private)
  - Enable invalidation rules
- Real-time config generation
- JSON preview with syntax highlighting
- Copy-to-clipboard functionality
- Save to file option

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Title, Text, Button, Select, SelectItem, NumberInput, Toggle, ToggleItem } from '@tremor/react';
import { Copy, Download, Loader } from 'lucide-react';
import { generateCacheConfig, getProviders } from '../services/schema-api';
import type { ConfigPreferences, AIProviderConfig } from '@orion-console/shared';

export function ConfigGenerator({ endpoint }: { endpoint: string }) {
  const [preferences, setPreferences] = useState<ConfigPreferences>({
    defaultTTL: 3600,
    defaultScope: 'public',
    enableInvalidation: true,
  });
  const [selectedProvider, setSelectedProvider] = useState<string>('heuristic');
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: providers } = useQuery({
    queryKey: ['schema-providers'],
    queryFn: getProviders,
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Generate config
  };

  return (
    <Card>
      <Title>Generate Cache Configuration</Title>
      <Text>Configure optimal caching rules for your schema</Text>

      {/* Preferences section */}
      <div className="mt-4 space-y-4">
        <div>
          <Text>Default TTL (seconds)</Text>
          <NumberInput
            value={preferences.defaultTTL}
            onChange={(val) => setPreferences({ ...preferences, defaultTTL: val })}
          />
        </div>

        <div>
          <Text>Default Scope</Text>
          <Select value={preferences.defaultScope} onValueChange={(val) => setPreferences({ ...preferences, defaultScope: val as any })}>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </Select>
        </div>

        <div>
          <Text>Enable Invalidation Rules</Text>
          <Toggle value={preferences.enableInvalidation ? 'on' : 'off'} onValueChange={(val) => setPreferences({ ...preferences, enableInvalidation: val === 'on' })}>
            <ToggleItem value="on" text="Enabled" />
            <ToggleItem value="off" text="Disabled" />
          </Toggle>
        </div>
      </div>

      {/* AI Provider section */}
      <div className="mt-6">
        <Text>AI Provider (Optional)</Text>
        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
          <SelectItem value="heuristic">Heuristic (No AI)</SelectItem>
          {providers?.providers.map((p) => (
            <SelectItem key={p.type} value={p.type}>
              {p.name}
            </SelectItem>
          ))}
        </Select>

        {selectedProvider !== 'heuristic' && (
          <TextInput
            placeholder="API Key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="mt-2"
          />
        )}
      </div>

      {/* Generate button */}
      <Button onClick={handleGenerate} disabled={!endpoint || isGenerating} className="mt-6">
        {isGenerating ? <Loader className="animate-spin" /> : 'Generate Config'}
      </Button>

      {/* Config preview section */}
      {/* Display generated config with copy/download options */}
    </Card>
  );
}
```

#### 2.4 Create Schema Route

**File:** `packages/client/src/routes/dashboard/schema.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { Card, Title, Text, Grid, Col } from '@tremor/react';
import { SchemaAnalyzer } from '../../components/SchemaAnalyzer';
import { ConfigGenerator } from '../../components/ConfigGenerator';

export const Route = createFileRoute('/dashboard/schema')({
  component: SchemaPage,
});

function SchemaPage() {
  return (
    <div className="space-y-6">
      <div>
        <Title>Schema Analysis & AI Config Generation</Title>
        <Text>Analyze your GraphQL schema and generate optimal cache configurations</Text>
      </div>

      <Grid>
        <Col>
          <SchemaAnalyzer />
        </Col>
      </Grid>

      <Grid>
        <Col>
          <ConfigGenerator />
        </Col>
      </Grid>
    </div>
  );
}
```

#### 2.5 Add Navigation Link

**File:** `packages/client/src/routes/dashboard/index.tsx`

Add a new card to the dashboard linking to the schema analysis page:

```typescript
<Link to="/dashboard/schema">
  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
    <Flex>
      <div>
        <Title>Schema Analysis</Title>
        <Text>Analyze GraphQL schemas and generate cache configs</Text>
      </div>
      <ArrowRight className="text-blue-600" />
    </Flex>
  </Card>
</Link>
```

---

### Phase 3: Integration & Testing

**Duration:** ~30 minutes | **Complexity:** Low

#### 3.1 Update Workspace Dependencies

```bash
cd orion-console
npm install
```

#### 3.2 Build Both Packages

```bash
npm run build
```

#### 3.3 Test Locally

```bash
npm run dev
```

Navigate to `http://localhost:5173/dashboard/schema`

#### 3.4 Test Checklist

- [ ] Analyze a real GraphQL endpoint (e.g., GitHub GraphQL API)
- [ ] Generate config with heuristics (no AI)
- [ ] Generate config with Ollama (if available locally)
- [ ] Generate config with API key (Anthropic/OpenAI)
- [ ] Copy generated config to clipboard
- [ ] Download config as JSON file
- [ ] Error handling for invalid endpoints
- [ ] Error handling for introspection disabled
- [ ] Error handling for API failures
- [ ] Loading states display correctly
- [ ] No TypeScript errors
- [ ] No console errors

---

## Design Decisions

### 1. Server-Side Schema Fetching

**Decision:** Fetch GraphQL schemas on the server, not the client.

**Rationale:**
- Avoids CORS issues with GraphQL endpoints
- Keeps API keys secure (never sent to client)
- Enables caching of schema fetches
- Allows for rate limiting and monitoring

### 2. Streaming for Long Operations

**Decision:** Use Server-Sent Events (SSE) for long-running AI operations.

**Rationale:**
- Real-time progress feedback to user
- Better UX for slow AI providers
- Prevents request timeouts
- Allows cancellation of operations

**Implementation:**
```typescript
// Server
res.setHeader('Content-Type', 'text/event-stream');
res.write(`data: ${JSON.stringify({ status: 'analyzing' })}\n\n`);
// ... long operation ...
res.write(`data: ${JSON.stringify({ status: 'complete', config })}\n\n`);
res.end();

// Client
const eventSource = new EventSource('/api/schema/generate-config-stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Update UI
};
```

### 3. Provider Auto-Detection

**Decision:** Auto-detect Ollama availability and list available models.

**Rationale:**
- Seamless UX for local development
- No manual configuration needed
- Graceful fallback to heuristics
- Secure (no API keys needed for Ollama)

### 4. Config Preview Before Save

**Decision:** Show generated config in UI before saving to file.

**Rationale:**
- Users can review and edit if needed
- Prevents accidental overwrites
- Allows copying to clipboard
- Enables comparison with existing config

### 5. Error Handling Strategy

**Decision:** Clear, actionable error messages for common failures.

**Rationale:**
- Introspection disabled → "Enable introspection in your GraphQL server"
- Invalid endpoint → "Check URL format and CORS settings"
- API key invalid → "Verify API key and provider selection"
- Network error → "Check internet connection and endpoint availability"

---

## File Structure

After integration, the orion-console repository will have this structure:

```
orion-console/
├── docs/
│   ├── SCHEMA_INTEGRATION_PLAN.md    ← This file
│   └── ...
│
├── packages/
│   ├── server/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── schema.ts          ← NEW: Schema API endpoints
│   │   │   │   ├── config.ts
│   │   │   │   ├── credentials.ts
│   │   │   │   └── ...
│   │   │   ├── types/
│   │   │   │   ├── schema.ts          ← NEW: Schema types (if needed)
│   │   │   │   └── ...
│   │   │   └── index.ts               ← UPDATED: Register schema routes
│   │   ├── package.json               ← UPDATED: Add @orion/schema
│   │   └── ...
│   │
│   ├── client/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── SchemaAnalyzer.tsx ← NEW: Schema analysis UI
│   │   │   │   ├── ConfigGenerator.tsx ← NEW: Config generation UI
│   │   │   │   └── ...
│   │   │   ├── services/
│   │   │   │   ├── schema-api.ts      ← NEW: Schema API client
│   │   │   │   └── ...
│   │   │   ├── routes/
│   │   │   │   └── dashboard/
│   │   │   │       ├── schema.tsx     ← NEW: Schema page route
│   │   │   │       ├── index.tsx      ← UPDATED: Add schema link
│   │   │   │       └── ...
│   │   │   └── ...
│   │   └── ...
│   │
│   └── shared/
│       ├── src/
│       │   ├── types/
│       │   │   ├── schema.ts          ← NEW: Export @orion/schema types
│       │   │   └── index.ts           ← UPDATED: Export schema types
│       │   └── ...
│       └── ...
│
└── package.json
```

---

## Success Criteria

### Functional Requirements

✅ Server API endpoints respond correctly to all requests
✅ Client can analyze GraphQL endpoints
✅ Config generation works with heuristics (no AI)
✅ Config generation works with all AI providers
✅ UI displays analysis results clearly
✅ UI displays generated config with syntax highlighting
✅ Generated config can be copied to clipboard
✅ Generated config can be downloaded as JSON
✅ Error messages are clear and actionable
✅ Loading states display correctly

### Technical Requirements

✅ No TypeScript errors or warnings
✅ All imports resolve correctly
✅ No circular dependencies
✅ Code follows existing patterns in codebase
✅ All tests pass (if applicable)
✅ No console errors or warnings

### User Experience Requirements

✅ Schema analysis completes in < 5 seconds
✅ Config generation completes in < 10 seconds (heuristic) or < 30 seconds (AI)
✅ UI is responsive and doesn't freeze during operations
✅ Error messages appear within 2 seconds
✅ Navigation to schema page is intuitive

---

## Optional Enhancements (Phase 4)

These features can be added after the core integration is complete:

### 1. Schema Visualization

Display entity relationships as an interactive graph:
- Nodes: Entity types
- Edges: Relationships
- Colors: Entity characteristics (volatile, sensitive, etc.)
- Hover: Show field details

**Libraries:** `react-flow-renderer`, `vis-network`, or `cytoscape.js`

### 2. Config Comparison

Compare generated config with existing config:
- Side-by-side view
- Highlight differences
- Show impact of changes
- Merge/apply changes

### 3. Batch Analysis

Analyze multiple GraphQL endpoints at once:
- Upload CSV with endpoints
- Generate configs for all
- Download batch results
- Compare across endpoints

### 4. Config Templates

Save and load common config patterns:
- Save current config as template
- Apply template to new endpoints
- Share templates with team
- Version control templates

### 5. AI Provider Management

UI for managing API keys and provider settings:
- Add/remove API keys
- Test provider connectivity
- View usage statistics
- Configure rate limits

### 6. Export Options

Export generated config in multiple formats:
- JSON (current)
- YAML
- TypeScript (as code)
- Terraform (HCL)
- Environment variables

### 7. Config History

Track and manage config versions:
- View config history
- Rollback to previous version
- Diff between versions
- Annotate changes

---

## Dependencies

### New Dependencies to Add

**Server Package (`packages/server/package.json`):**
```json
{
  "dependencies": {
    "@orion/schema": "file:../../orion-schema"
  }
}
```

**Client Package (`packages/client/package.json`):**
- No new dependencies required
- Uses existing: `@tanstack/react-query`, `@tremor/react`, `lucide-react`

**Shared Package (`packages/shared/package.json`):**
- No new dependencies required
- Re-exports types from `@orion/schema`

### Existing Dependencies Used

**Server:**
- `express` - HTTP server
- `cors` - CORS middleware
- `@orion/infra` - Infrastructure utilities

**Client:**
- `@tanstack/react-query` - Data fetching and caching
- `@tanstack/react-router` - Routing
- `@tremor/react` - UI components
- `lucide-react` - Icons
- `react` - UI framework

---

## Timeline & Effort

### Implementation Breakdown

| Phase | Component | Effort | Time | Complexity |
|-------|-----------|--------|------|-----------|
| 1 | Add dependency | Very Low | 5 min | Low |
| 1 | Create routes | Low | 20 min | Low |
| 1 | Register routes | Very Low | 5 min | Low |
| 2 | Create service | Low | 15 min | Low |
| 2 | Analyzer component | Medium | 45 min | Medium |
| 2 | Generator component | Medium | 60 min | Medium |
| 2 | Schema route | Low | 15 min | Low |
| 2 | Navigation link | Very Low | 5 min | Low |
| 3 | Integration | Low | 15 min | Low |
| 3 | Testing | Medium | 30 min | Medium |
| **Total** | | **Medium** | **3-4 hrs** | **Medium** |

### Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| CORS issues | Medium | Medium | Server-side fetching |
| AI provider failures | Medium | Low | Fallback to heuristics |
| Long operation timeouts | Low | Medium | Use SSE for streaming |
| Type mismatches | Low | Low | Strict TypeScript |
| Performance issues | Low | Medium | Caching, pagination |

---

## Discussion Points

Before implementation, please discuss and confirm:

1. **Streaming vs. Polling:** Should we use SSE for long operations or simple polling?
2. **Config Saving:** Should generated configs auto-save or require user confirmation?
3. **Provider Credentials:** How should API keys be stored? (env vars, secure storage, session-only?)
4. **Rate Limiting:** Should we limit schema analysis requests per user/IP?
5. **Caching:** Should we cache schema analysis results? For how long?
6. **Permissions:** Should schema analysis be available to all users or require specific roles?
7. **Logging:** What events should be logged for audit trails?
8. **Monitoring:** What metrics should we track? (analysis time, success rate, etc.)

---

## Next Steps

1. **Review this plan** with the team
2. **Discuss design decisions** and adjust as needed
3. **Identify any changes needed to @orion/schema** before implementation
4. **Confirm timeline and resource allocation**
5. **Create GitHub issues** for each phase
6. **Begin Phase 1 implementation** once approved

---

## References

- [@orion/schema Documentation](../../orion-schema/README.md)
- [Schema Extraction Plan](../../orion-schema/docs/extraction-operation/SCHEMA_EXTRACTION_PLAN.md)
- [orion-console Architecture](./README.md)
- [Express.js Documentation](https://expressjs.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Tremor React Components](https://www.tremor.so/docs)

---

**Document Version:** 1.0  
**Last Updated:** January 6, 2026  
**Status:** Ready for Review

---

## Appendix: Changes to @orion/schema

### Overview

Before integrating @orion/schema into orion-console, the following changes must be made to the package to remove free AI providers and support only commercial providers.

### Required Changes

See `orion-schema/docs/REQUIRED_CHANGES.md` for complete details.

**Summary:**
1. **Remove free AI providers** - Delete `src/free-ai-providers.ts`
2. **Update AIProviderConfig** - Support only: Anthropic, OpenAI, Gemini, Grok
3. **Add Gemini & Grok implementations** - New provider support
4. **Update PROVIDER_INFO** - Better metadata for commercial providers
5. **Make AI provider required** - No more heuristic-only option
6. **Update documentation** - Remove free provider references

### Provider Support Matrix

| Provider | Type | API Key | Model Selection | Status |
|----------|------|---------|-----------------|--------|
| Anthropic | Paid | Required | Claude 3 family | ✅ Existing |
| OpenAI | Paid | Required | GPT-4 family | ✅ Existing |
| Gemini | Paid/Free | Required | Gemini 2.0 family | 🆕 New |
| Grok | Paid | Required | Grok 2 family | 🆕 New |
| Ollama | Local | Optional | Various | ❌ Removed |
| Groq | Free | Optional | Mixtral | ❌ Removed |
| Hugging Face | Free | Optional | Various | ❌ Removed |

### Implementation Timeline

**Phase 0: Update @orion/schema** (Before console integration)
- Duration: ~1-2 hours
- Complexity: Medium
- Blocker: Yes (must complete before Phase 1)

**Phase 1-3: Console Integration** (After @orion/schema updates)
- Duration: 3-4 hours
- Complexity: Medium
- Depends on: Phase 0 completion

### Breaking Changes

⚠️ **Version 2.0.0** will include breaking changes:

1. `generateCacheConfig` now requires `aiProvider` parameter
2. Free AI provider functions removed
3. `FreeAIProvider`, `FreeAIConfig` types removed
4. `callFreeAI`, `isOllamaAvailable`, `getOllamaModels` removed

**Migration:** Consumers must update to use paid providers or `generateBasicConfig`

### Console Integration Adjustments

Due to these changes, the console integration plan has these adjustments:

#### 1. Provider Selection UI

**Updated:** Only show commercial providers in dropdown

```typescript
// In ConfigGenerator.tsx
const providers = [
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'openai', label: 'OpenAI GPT' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'grok', label: 'xAI Grok' },
];
```

#### 2. API Key Management

**Updated:** All providers require API keys (no local option)

```typescript
// In ConfigGenerator.tsx
const [apiKey, setApiKey] = useState('');

// Always show API key input
<TextInput
  placeholder="Enter your API key"
  type="password"
  value={apiKey}
  onChange={(e) => setApiKey(e.target.value)}
  required
/>
```

#### 3. Provider Info Endpoint

**Updated:** Server endpoint returns only commercial providers

```typescript
// GET /api/schema/providers
// Response:
{
  "providers": [
    {
      "name": "Anthropic Claude",
      "description": "...",
      "requiresApiKey": true,
      "models": ["claude-opus-4-1", "claude-sonnet-4-20250514", ...],
      "pricing": "Pay-as-you-go",
      "setupUrl": "https://console.anthropic.com/"
    },
    // ... other providers
  ]
}
```

#### 4. Config Generation

**Updated:** AI provider is now required (no heuristic-only option)

```typescript
// In server route
router.post('/schema/generate-config', async (req, res) => {
  const { endpoint, preferences, aiProvider } = req.body;

  if (!aiProvider) {
    return res.status(400).json({
      error: 'AI provider is required',
      message: 'Select a provider and enter your API key'
    });
  }

  // ... generate config with AI provider
});
```

#### 5. Error Handling

**Updated:** Clear messages for API key issues

```typescript
// Common errors:
- "Anthropic API key invalid" → "Check your API key at console.anthropic.com"
- "OpenAI API key invalid" → "Check your API key at platform.openai.com"
- "Gemini API key invalid" → "Check your API key at ai.google.dev"
- "Grok API key invalid" → "Check your API key at console.x.ai"
```

### Heuristic-Only Option

**Note:** The heuristic-only config generation (`generateBasicConfig`) is still available and doesn't require an AI provider.

**UI Option:** Add toggle in ConfigGenerator

```typescript
<Toggle>
  <ToggleItem value="heuristic" text="Heuristic (No AI)" />
  <ToggleItem value="ai" text="AI-Powered" />
</Toggle>

{selectedMode === 'ai' && (
  // Show provider selection and API key input
)}
```

### Setup Instructions for Users

Users will need to obtain API keys from:

1. **Anthropic**: https://console.anthropic.com/
2. **OpenAI**: https://platform.openai.com/account/api-keys
3. **Google Gemini**: https://ai.google.dev/
4. **xAI Grok**: https://console.x.ai/

These should be documented in:
- Console UI help text
- README.md
- Setup guide

---

**End of Appendix**

---

## Appendix B: Credential & Endpoint Management

### Overview

This appendix documents the credential and endpoint management requirements that were added after the initial planning phase.

**Key Changes:**
1. AI API keys stored in `~/.config/orion/credentials.json`
2. GraphQL endpoint auto-discovered from `~/.config/orion/terraform.tfstate`
3. Lookup flow: credentials.json → env vars → prompt user
4. No manual endpoint override allowed
5. Simple error handling for missing terraform state

---

### Credential Management Flow

```
User selects AI provider
    ↓
1. Check ~/.config/orion/credentials.json
    ↓ Found? Use it
    ↓ Not found?
2. Check environment variables
    ↓ Found? Use it
    ↓ Not found?
3. Prompt user for API key
    ↓
4. Validate format
    ↓
5. Save to credentials.json (0600 permissions)
    ↓
6. Use for schema analysis
```

**Environment Variables:**
- Anthropic: `ANTHROPIC_API_KEY`
- OpenAI: `OPENAI_API_KEY`
- Gemini: `GEMINI_API_KEY` (primary), `GOOGLE_API_KEY` (fallback)
- Grok: `XAI_API_KEY` (primary), `GROK_API_KEY` (backup)

---

### Endpoint Discovery Flow

```
1. Check if terraform.tfstate exists
    ↓ Not found? Show error
    ↓ Found?
2. Read ~/.config/orion/terraform.tfstate
    ↓
3. Extract outputs.compute_service.value.backend_domain
    ↓ Not found? Show error
    ↓ Found?
4. Test endpoint reachability (5s timeout)
    ↓ Not reachable? Show error
    ↓ Reachable?
5. Use for schema introspection
```

**Terraform Output Path:**
- Always: `outputs.compute_service.value.backend_domain`
- Driven by @orion-infra package
- No fallback paths, no manual override

---

### Updated Server Routes

#### New Endpoint: GET /api/schema/endpoint

```typescript
/**
 * GET /api/schema/endpoint
 * 
 * Get GraphQL endpoint from terraform state
 * 
 * Response:
 * {
 *   endpoint: string,
 *   source: "terraform"
 * }
 */
router.get('/schema/endpoint', async (req, res) => {
  try {
    // Check if terraform state exists
    if (!existsSync(TFSTATE_PATH)) {
      return res.status(400).json({
        error: 'Terraform state not found',
        message: 'Deploy infrastructure first using "orion deploy"'
      });
    }
    
    // Get endpoint from terraform state
    const endpoint = await getGraphQLEndpointFromTerraform();
    
    if (!endpoint) {
      return res.status(400).json({
        error: 'GraphQL endpoint not found in terraform state',
        message: 'Check terraform outputs for compute_service.backend_domain'
      });
    }
    
    res.json({ endpoint, source: 'terraform' });
  } catch (error) {
    console.error('Endpoint discovery error:', error);
    res.status(500).json({
      error: 'Failed to get endpoint',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

#### New Endpoint: GET /api/schema/credentials/status

```typescript
/**
 * GET /api/schema/credentials/status
 * 
 * Check which AI providers have saved credentials
 * 
 * Response:
 * {
 *   anthropic: boolean,
 *   openai: boolean,
 *   gemini: boolean,
 *   grok: boolean
 * }
 */
router.get('/schema/credentials/status', async (req, res) => {
  try {
    const credentials = await getSavedCredentials();
    
    res.json({
      anthropic: !!credentials?.ai?.anthropic,
      openai: !!credentials?.ai?.openai,
      gemini: !!credentials?.ai?.gemini,
      grok: !!credentials?.ai?.grok
    });
  } catch (error) {
    console.error('Credentials status error:', error);
    res.status(500).json({
      error: 'Failed to check credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

#### New Endpoint: POST /api/schema/credentials/save

```typescript
/**
 * POST /api/schema/credentials/save
 * 
 * Save AI provider credentials
 * 
 * Request body:
 * {
 *   provider: 'anthropic' | 'openai' | 'gemini' | 'grok',
 *   apiKey: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string
 * }
 */
router.post('/schema/credentials/save', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    
    if (!provider || !apiKey) {
      return res.status(400).json({
        error: 'Provider and API key are required'
      });
    }
    
    // Validate provider
    const validProviders = ['anthropic', 'openai', 'gemini', 'grok'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        error: 'Invalid provider',
        message: `Provider must be one of: ${validProviders.join(', ')}`
      });
    }
    
    // Validate API key format
    const validation = validateAPIKey(provider, apiKey);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid API key format',
        message: validation.error
      });
    }
    
    // Save credentials
    await saveAIKeyToCredentials(provider, apiKey);
    
    res.json({
      success: true,
      message: `${provider} credentials saved successfully`
    });
  } catch (error) {
    console.error('Save credentials error:', error);
    res.status(500).json({
      error: 'Failed to save credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

#### Updated: POST /api/schema/analyze

```typescript
/**
 * POST /api/schema/analyze
 * 
 * Analyze a GraphQL schema
 * 
 * Request body:
 * {
 *   // Endpoint is optional - will use terraform state if not provided
 *   endpoint?: string
 * }
 */
router.post('/schema/analyze', async (req, res) => {
  try {
    let { endpoint } = req.body;
    
    // If no endpoint provided, get from terraform state
    if (!endpoint) {
      if (!existsSync(TFSTATE_PATH)) {
        return res.status(400).json({
          error: 'Terraform state not found',
          message: 'Deploy infrastructure first or provide endpoint'
        });
      }
      
      endpoint = await getGraphQLEndpointFromTerraform();
      
      if (!endpoint) {
        return res.status(400).json({
          error: 'GraphQL endpoint not found',
          message: 'Endpoint not in terraform state and not provided'
        });
      }
    }
    
    // Validate URL
    try {
      new URL(endpoint);
    } catch {
      return res.status(400).json({ error: 'Invalid endpoint URL' });
    }
    
    // Test endpoint reachability
    const { reachable, error: reachError } = await testEndpointReachability(endpoint);
    if (!reachable) {
      return res.status(400).json({
        error: 'Endpoint unreachable',
        message: reachError
      });
    }
    
    // Fetch and analyze schema
    const schema = await fetchSchema(endpoint);
    const analysis = await analyzeSchema(schema);
    
    res.json(analysis);
  } catch (error) {
    console.error('Schema analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze schema',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

#### Updated: POST /api/schema/generate-config

```typescript
/**
 * POST /api/schema/generate-config
 * 
 * Generate cache configuration
 * 
 * Request body:
 * {
 *   endpoint?: string,  // Optional - uses terraform state if not provided
 *   preferences: ConfigPreferences,
 *   aiProvider: {
 *     provider: 'anthropic' | 'openai' | 'gemini' | 'grok',
 *     apiKey: string,  // Now required
 *     model?: string
 *   }
 * }
 */
router.post('/schema/generate-config', async (req, res) => {
  try {
    let { endpoint, preferences, aiProvider } = req.body;
    
    // Get endpoint from terraform if not provided
    if (!endpoint) {
      if (!existsSync(TFSTATE_PATH)) {
        return res.status(400).json({
          error: 'Terraform state not found',
          message: 'Deploy infrastructure first or provide endpoint'
        });
      }
      
      endpoint = await getGraphQLEndpointFromTerraform();
      
      if (!endpoint) {
        return res.status(400).json({
          error: 'GraphQL endpoint not found'
        });
      }
    }
    
    // Validate AI provider
    if (!aiProvider || !aiProvider.apiKey) {
      return res.status(400).json({
        error: 'AI provider with API key is required'
      });
    }
    
    // Fetch schema
    const schema = await fetchSchema(endpoint);
    const analysis = await analyzeSchema(schema);
    
    // Generate config
    const config = await generateCacheConfig(
      schema,
      analysis,
      preferences,
      aiProvider
    );
    
    res.json({
      config,
      analysis,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Config generation error:', error);
    res.status(500).json({
      error: 'Failed to generate config',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

---

### Updated Client Components

#### SchemaAnalyzer Component Updates

```typescript
// Auto-populate endpoint from terraform
useEffect(() => {
  async function loadEndpoint() {
    try {
      const response = await fetch('/api/schema/endpoint');
      if (response.ok) {
        const data = await response.json();
        setEndpoint(data.endpoint);
        setEndpointSource('terraform');
      }
    } catch (error) {
      console.error('Failed to load endpoint:', error);
    }
  }
  
  loadEndpoint();
}, []);

// Show endpoint with source hint
<div>
  <label>GraphQL Endpoint</label>
  <input
    value={endpoint}
    readOnly
    disabled
  />
  <Text className="text-sm text-gray-500">
    From: ~/.config/orion/terraform.tfstate
  </Text>
</div>
```

#### ConfigGenerator Component Updates

```typescript
// Check credential status on mount
useEffect(() => {
  async function checkCredentials() {
    try {
      const response = await fetch('/api/schema/credentials/status');
      if (response.ok) {
        const status = await response.json();
        setCredentialStatus(status);
      }
    } catch (error) {
      console.error('Failed to check credentials:', error);
    }
  }
  
  checkCredentials();
}, []);

// Show provider badges
<Select value={selectedProvider} onValueChange={setSelectedProvider}>
  <SelectItem value="anthropic">
    Anthropic Claude
    {credentialStatus.anthropic && <Badge>✓ Saved</Badge>}
    {!credentialStatus.anthropic && <Badge variant="warning">⚠ Missing</Badge>}
  </SelectItem>
  <SelectItem value="openai">
    OpenAI GPT
    {credentialStatus.openai && <Badge>✓ Saved</Badge>}
    {!credentialStatus.openai && <Badge variant="warning">⚠ Missing</Badge>}
  </SelectItem>
  <SelectItem value="gemini">
    Google Gemini
    {credentialStatus.gemini && <Badge>✓ Saved</Badge>}
    {!credentialStatus.gemini && <Badge variant="warning">⚠ Missing</Badge>}
  </SelectItem>
  <SelectItem value="grok">
    xAI Grok
    {credentialStatus.grok && <Badge>✓ Saved</Badge>}
    {!credentialStatus.grok && <Badge variant="warning">⚠ Missing</Badge>}
  </SelectItem>
</Select>

// Show API key input with validation
{!credentialStatus[selectedProvider] && (
  <div>
    <TextInput
      type="password"
      placeholder="Enter API key"
      value={apiKey}
      onChange={(e) => setApiKey(e.target.value)}
    />
    <Checkbox
      checked={saveCredentials}
      onCheckedChange={setSaveCredentials}
    >
      Save to ~/.config/orion/credentials.json
    </Checkbox>
  </div>
)}

// Save credentials if checkbox checked
if (saveCredentials && apiKey) {
  await fetch('/api/schema/credentials/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: selectedProvider,
      apiKey
    })
  });
}
```

---

### Updated Success Criteria

#### Functional Requirements

✅ Server API endpoints respond correctly
✅ Client can analyze GraphQL endpoints
✅ **Endpoint auto-populated from terraform state**
✅ **Credentials loaded from credentials.json**
✅ **Environment variables checked as fallback**
✅ **API key validation works**
✅ **Credentials saved with 0600 permissions**
✅ Config generation works with all 4 providers
✅ UI displays analysis results clearly
✅ UI displays generated config
✅ Generated config can be copied/downloaded
✅ Error messages are clear and actionable
✅ Loading states display correctly

#### Technical Requirements

✅ No TypeScript errors or warnings
✅ All imports resolve correctly
✅ No circular dependencies
✅ Code follows existing patterns
✅ **Credential file permissions set correctly**
✅ **Terraform state path correct**
✅ All tests pass

---

### Updated Testing Checklist

#### Credential Management
- [ ] Can load credentials from credentials.json
- [ ] Can load credentials from environment variables
- [ ] Can save credentials to credentials.json
- [ ] File permissions set to 0600
- [ ] API key validation works for all providers
- [ ] Masked keys display correctly
- [ ] Environment variable priority correct

#### Endpoint Discovery
- [ ] Endpoint loaded from terraform state
- [ ] Correct path: outputs.compute_service.value.backend_domain
- [ ] Endpoint reachability test works
- [ ] Error shown if terraform state missing
- [ ] Error shown if endpoint unreachable

#### Integration
- [ ] Endpoint auto-populates in UI
- [ ] Provider badges show correct status
- [ ] API key input shown when needed
- [ ] Save credentials checkbox works
- [ ] Credentials persist across sessions

---

**Appendix Version:** 1.0  
**Last Updated:** January 6, 2026  
**Status:** Integrated with Main Plan
