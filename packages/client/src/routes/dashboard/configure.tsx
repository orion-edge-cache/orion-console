/**
 * Configuration Page - /dashboard/configure
 *
 * JSON-only config editor - no forms.
 * Using Tremor components for data-rich dashboard UI.
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, AlertCircle, CheckCircle, Loader2, Info, RotateCcw } from 'lucide-react';
import {
  Card,
  Title,
  Text,
  Button,
  Flex,
  Badge,
  Callout,
  Textarea,
} from '@tremor/react';
import { getConfig, saveConfig, resetConfig } from '../../services';
import type { OrionConfig } from '../../types';

export const Route = createFileRoute('/dashboard/configure')({
  component: ConfigurePage,
});

function ConfigurePage() {
  const queryClient = useQueryClient();
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [configText, setConfigText] = useState('');
  const [syncedToEdge, setSyncedToEdge] = useState(false);
  const lastSyncedConfig = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: configData, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: getConfig,
  });

  // Sync config text when server data changes
  useEffect(() => {
    if (configData?.config) {
      const newConfigStr = JSON.stringify(configData.config, null, 2);
      if (lastSyncedConfig.current !== newConfigStr) {
        lastSyncedConfig.current = newConfigStr;
        setConfigText(newConfigStr);
      }
    }
  }, [configData]);

  const saveMutation = useMutation({
    mutationFn: saveConfig,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      setSaveSuccess(true);
      setSyncedToEdge(data.configStoreUpdated || false);
      setTimeout(() => setSaveSuccess(false), 5000);
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetConfig,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      setConfigText(JSON.stringify(data.config, null, 2));
      setSaveSuccess(true);
      setSyncedToEdge(data.configStoreUpdated || false);
      setTimeout(() => setSaveSuccess(false), 5000);
    },
  });

  const handleSave = () => {
    try {
      const parsed: OrionConfig = JSON.parse(configText);
      setJsonError(null);
      saveMutation.mutate(parsed);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  return (
    <div
      className="h-full flex flex-col animate-fade-in"
      style={{ background: 'var(--color-bg-primary)' }}
    >
      {/* Header */}
      <header
        className="px-8 py-6 border-b"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Configuration
            </Title>
            <Text style={{ color: 'var(--color-text-tertiary)' }}>
              Define cache rules and TTL settings
            </Text>
          </div>
          <div className="flex gap-3">
            <Button
              icon={resetMutation.isPending ? Loader2 : RotateCcw}
              variant="secondary"
              loading={resetMutation.isPending}
              onClick={() => {
                if (confirm('Reset configuration to defaults? This will discard any unsaved changes.')) {
                  resetMutation.mutate();
                }
              }}
            >
              {resetMutation.isPending ? 'Resetting...' : 'Reset to Defaults'}
            </Button>
            <Button
              icon={saveMutation.isPending ? Loader2 : Save}
              loading={saveMutation.isPending}
              onClick={handleSave}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </Flex>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto">
          {/* Success Message */}
          {saveSuccess && (
            <Callout
              className="mb-4"
              title="Configuration saved successfully"
              icon={CheckCircle}
              color="emerald"
            >
              {syncedToEdge
                ? 'Synced to Fastly edge - changes take effect immediately'
                : 'Saved locally only - deploy infrastructure to sync to edge'}
            </Callout>
          )}

          {/* Error Message */}
          {jsonError && (
            <Callout
              className="mb-4"
              title="Invalid JSON"
              icon={AlertCircle}
              color="red"
            >
              {jsonError}
            </Callout>
          )}

          {saveMutation.isError && (
            <Callout
              className="mb-4"
              title="Save Failed"
              icon={AlertCircle}
              color="red"
            >
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : 'Failed to save configuration'}
            </Callout>
          )}

          {resetMutation.isError && (
            <Callout
              className="mb-4"
              title="Reset Failed"
              icon={AlertCircle}
              color="red"
            >
              {resetMutation.error instanceof Error
                ? resetMutation.error.message
                : 'Failed to reset configuration'}
            </Callout>
          )}

          {/* JSON Editor */}
          <Card className="overflow-hidden p-0">
            <div
              className="px-4 py-2 flex items-center justify-between border-b"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border-subtle)'
              }}
            >
              <Text className="text-sm font-medium">$HOME/.config/orion/config.json</Text>
              <Badge color="cyan" size="sm">JSON</Badge>
            </div>
            <Textarea
              ref={textareaRef}
              className="w-full h-[600px] p-4 text-sm focus:outline-none resize-none border-none rounded-none font-mono"
              style={{
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
              }}
              value={configText}
              onChange={(e) => {
                setConfigText(e.target.value);
                setJsonError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const textarea = textareaRef.current;
                  if (!textarea) return;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const spaces = '  ';
                  const newValue = configText.substring(0, start) + spaces + configText.substring(end);
                  setConfigText(newValue);
                  requestAnimationFrame(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
                  });
                }
              }}
              placeholder={isLoading ? 'Loading configuration...' : 'Paste your configuration JSON here...'}
            />
          </Card>

          {/* Help Text */}
          <Callout
            className="mt-6"
            title="Configuration Guide"
            icon={Info}
            color="blue"
          >
            <div className="text-sm space-y-4 mt-2">
              {/* Defaults */}
              <div>
                <strong>Defaults</strong>
                <ul className="mt-1 space-y-1 ml-4">
                  <li><code className="px-1 rounded bg-blue-100 text-blue-700">maxAge</code> - Default cache TTL in seconds</li>
                  <li><code className="px-1 rounded bg-blue-100 text-blue-700">staleWhileRevalidate</code> - Serve stale while fetching fresh</li>
                  <li><code className="px-1 rounded bg-blue-100 text-blue-700">staleIfError</code> - Serve stale if origin errors</li>
                </ul>
              </div>

              {/* Rule Options */}
              <div>
                <strong>Rule Options</strong>
                <ul className="mt-1 space-y-1 ml-4">
                  <li><code className="px-1 rounded bg-blue-100 text-blue-700">types</code> - Array of GraphQL types this rule applies to</li>
                  <li><code className="px-1 rounded bg-blue-100 text-blue-700">maxAge</code> - Cache TTL in seconds (overrides default)</li>
                  <li><code className="px-1 rounded bg-blue-100 text-blue-700">staleWhileRevalidate</code> - SWR duration in seconds</li>
                  <li><code className="px-1 rounded bg-blue-100 text-blue-700">staleIfError</code> - SIE duration in seconds</li>
                  <li><code className="px-1 rounded bg-blue-100 text-blue-700">scope</code> - "public" or "private"</li>
                  <li><code className="px-1 rounded bg-blue-100 text-blue-700">passthrough</code> - Bypass cache entirely (boolean)</li>
                </ul>
                <div className="mt-2 p-2 rounded bg-blue-50 font-mono text-xs">
                  {'{ "types": ["Post"], "maxAge": 300, "staleWhileRevalidate": 60 }'}
                </div>
              </div>

              {/* Invalidations */}
              <div>
                <strong>Invalidations</strong>
                <p className="mt-1 ml-4">Map mutation names to types that should be invalidated when the mutation runs.</p>
                <div className="mt-2 p-2 rounded bg-blue-50 font-mono text-xs">
                  {'"createPost": ["Post", "User"]'}
                </div>
              </div>
            </div>
          </Callout>
        </div>
      </div>
    </div>
  );
}
