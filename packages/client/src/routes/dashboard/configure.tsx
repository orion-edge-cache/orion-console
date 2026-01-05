/**
 * Configuration Page - /dashboard/configure
 *
 * JSON-only config editor - no forms.
 * Using Tremor components for data-rich dashboard UI.
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, AlertCircle, CheckCircle, Loader2, Info } from 'lucide-react';
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
import { getConfig, saveConfig } from '../../services';
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

  const { data: configData, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: getConfig,
  });

  // Initialize config text when data loads
  useEffect(() => {
    if (configData?.config && !configText) {
      setConfigText(JSON.stringify(configData.config, null, 2));
    }
  }, [configData, configText]);

  const saveMutation = useMutation({
    mutationFn: saveConfig,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
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
          <Button
            icon={saveMutation.isPending ? Loader2 : Save}
            loading={saveMutation.isPending}
            onClick={handleSave}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
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
            <ul className="text-sm space-y-1 mt-2">
              <li>
                <code className="px-1 rounded bg-blue-100 text-blue-700">
                  defaults.maxAge
                </code>
                {' '}- Default cache TTL in seconds
              </li>
              <li>
                <code className="px-1 rounded bg-blue-100 text-blue-700">
                  rules
                </code>
                {' '}- Per-type cache rules (overrides defaults)
              </li>
              <li>
                <code className="px-1 rounded bg-blue-100 text-blue-700">
                  invalidations
                </code>
                {' '}- Mutation to Type invalidation mappings
              </li>
            </ul>
          </Callout>
        </div>
      </div>
    </div>
  );
}
