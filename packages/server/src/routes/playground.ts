import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const router = express.Router();

const ORION_CONFIG_DIR = path.join(os.homedir(), '.config/orion');
const TFSTATE_PATH = path.join(ORION_CONFIG_DIR, 'terraform.tfstate');
const BACKEND_URL_PATH = path.join(ORION_CONFIG_DIR, 'backend-url.txt');

function analyzeCacheBehavior(
  headers: Record<string, string | null>,
  reqHeaders: express.Request['headers']
): { isHit: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const xCache = headers['x-cache']?.toUpperCase();
  const isHit = xCache?.includes('HIT') || false;
  const cacheControl = headers['cache-control'] || '';

  if (!isHit) {
    if (cacheControl.includes('private')) {
      warnings.push('Origin sent "Cache-Control: private" header - response cannot be cached');
    }
    if (cacheControl.includes('no-store')) {
      warnings.push('Origin sent "Cache-Control: no-store" header - response cannot be cached');
    }
    if (cacheControl.includes('no-cache')) {
      warnings.push('Origin sent "Cache-Control: no-cache" header - must revalidate');
    }
    if (reqHeaders['authorization']) {
      warnings.push('Request contains Authorization header - may bypass cache');
    }
    if (!headers['surrogate-control'] && !cacheControl) {
      warnings.push('No caching headers present - default behavior applies');
    }
  }

  return { isHit, warnings };
}

router.post('/proxy/graphql', async (req, res) => {
  try {
    let targetUrl: string | undefined;
    const debugInfo: Record<string, unknown> = {};

    const stateExists = await fs.access(TFSTATE_PATH).then(() => true).catch(() => false);
    if (stateExists) {
      const stateContent = await fs.readFile(TFSTATE_PATH, 'utf-8');
      const state = JSON.parse(stateContent);
      const outputs = state.outputs || {};

      debugInfo.terraformStateExists = true;
      debugInfo.outputsKeys = Object.keys(outputs);

      const cdnService = outputs.cdn_service?.value;
      const cdnDomain = cdnService?.domain_name;

      debugInfo.cdnService = cdnService ? { hasDomain: !!cdnDomain, domain: cdnDomain } : 'not found';

      if (cdnDomain) {
        targetUrl = `https://${cdnDomain}/graphql`;
      } else {
        targetUrl = outputs.backend_url?.value;
        debugInfo.fallbackToBackend = true;
      }
    } else {
      debugInfo.terraformStateExists = false;
    }

    if (!targetUrl) {
      try {
        targetUrl = (await fs.readFile(BACKEND_URL_PATH, 'utf-8')).trim();
        debugInfo.usedBackendUrlFile = true;
      } catch {
        debugInfo.backendUrlFileExists = false;
      }
    }

    if (!targetUrl) {
      console.error('GraphQL proxy: No endpoint found', debugInfo);
      return res.status(400).json({
        error: 'No GraphQL endpoint available. Deploy infrastructure first.',
        debug: debugInfo,
      });
    }

    console.log(`GraphQL proxy: Using endpoint ${targetUrl}`);

    const { query, variables, operationName } = req.body;
    console.log(`GraphQL proxy: Query:`, query?.substring(0, 100));

    let response: Response;
    let usedFallback = false;
    let cdnError: string | null = null;

    try {
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Orion-Playground/1.0',
        },
        body: JSON.stringify({ query, variables, operationName }),
        signal: AbortSignal.timeout(30000),
      });

      if (response.status === 500 && targetUrl.includes('fastly.net')) {
        const stateContent = await fs.readFile(TFSTATE_PATH, 'utf-8').catch(() => null);
        let backendUrl: string | undefined;

        if (stateContent) {
          const state = JSON.parse(stateContent);
          backendUrl = state.outputs?.backend_url?.value;
        }

        if (!backendUrl) {
          try {
            backendUrl = (await fs.readFile(BACKEND_URL_PATH, 'utf-8')).trim();
          } catch {
            // No backend URL available
          }
        }

        if (backendUrl) {
          const errorText = await response.text();
          cdnError = errorText.substring(0, 200);
          console.log(`CDN returned 500, error: ${errorText.substring(0, 500)}`);
          console.log(`CDN response headers:`, Object.fromEntries(response.headers.entries()));
          console.log(`Falling back to backend URL: ${backendUrl}`);

          response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Orion-Playground/1.0',
            },
            body: JSON.stringify({ query, variables, operationName }),
            signal: AbortSignal.timeout(30000),
          });
          usedFallback = true;
          targetUrl = backendUrl;
        }
      }
    } catch (fetchError) {
      console.error('GraphQL proxy fetch error:', fetchError);
      throw fetchError;
    }

    const cacheHeaders = {
      'x-cache': response.headers.get('x-cache'),
      'cache-control': response.headers.get('cache-control'),
      'age': response.headers.get('age'),
      'surrogate-control': response.headers.get('surrogate-control'),
      'surrogate-key': response.headers.get('surrogate-key'),
    };

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || `HTTP ${response.status}` };
      }

      console.error(`GraphQL proxy error: ${response.status} from ${targetUrl}`, {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500),
        headers: Object.fromEntries(response.headers.entries()),
      });

      let errorMessage = errorData.error || `Request failed with status ${response.status}`;
      if (response.status === 500 && targetUrl.includes('fastly.net') && !usedFallback) {
        errorMessage += '. The CDN endpoint is reachable but may not be fully configured. Check that:\n' +
          '1. The Compute service is deployed\n' +
          '2. The origin GraphQL server is configured and reachable\n' +
          '3. The backend URL is set in the Compute service config';
      }

      return res.status(response.status).json({
        error: errorMessage,
        statusCode: response.status,
        headers: cacheHeaders,
        targetUrl,
        usedFallback,
        cdnError: cdnError || undefined,
        rawError: errorText.substring(0, 500),
      });
    }

    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      const text = await response.text();
      return res.status(502).json({
        error: 'Invalid JSON response from GraphQL endpoint',
        rawResponse: text.substring(0, 500),
      });
    }

    const analysis = analyzeCacheBehavior(cacheHeaders, req.headers);

    const responsePayload = {
      data,
      _meta: {
        statusCode: response.status,
        headers: cacheHeaders,
        analysis,
        targetUrl,
        usedFallback: usedFallback || undefined,
        cdnError: cdnError || undefined,
      },
    };
    console.log(`GraphQL proxy: Response - usedFallback: ${usedFallback}, x-cache: ${cacheHeaders['x-cache']}`);
    res.json(responsePayload);
  } catch (error) {
    console.error('Error proxying GraphQL request:', error);
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Proxy error',
    });
  }
});

export default router;
