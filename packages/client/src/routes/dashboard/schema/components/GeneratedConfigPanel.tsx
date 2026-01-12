/**
 * GeneratedConfigPanel Component
 *
 * Displays generated cache configuration with AI explanations,
 * copy/download/save actions, and rule explanations.
 */

import { CheckCircle, Copy, Download, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import {
  Card,
  Title,
  Text,
  Flex,
  Badge,
  Button,
  Callout,
} from '@tremor/react';
import type { OrionCacheConfig, AIConfigResponse } from '../../../../services';

interface GeneratedConfigPanelProps {
  config: OrionCacheConfig;
  aiResponse: AIConfigResponse | null;
  copySuccess: boolean;
  saveSuccess: boolean;
  isSaving: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onSave: () => void;
}

export function GeneratedConfigPanel({
  config,
  aiResponse,
  copySuccess,
  saveSuccess,
  isSaving,
  onCopy,
  onDownload,
  onSave,
}: GeneratedConfigPanelProps) {
  return (
    <Card>
      <Flex justifyContent="between" alignItems="center" className="mb-4">
        <div>
          <Title>Generated Configuration</Title>
          {aiResponse && (
            <Flex className="gap-2 mt-1">
              <Badge color="emerald">
                Confidence: {(aiResponse.confidence * 100).toFixed(0)}%
              </Badge>
              <Badge color="slate">
                {aiResponse.rules.length} rules
              </Badge>
            </Flex>
          )}
        </div>
        <Flex className="gap-2">
          <Button
            variant="secondary"
            icon={copySuccess ? CheckCircle : Copy}
            onClick={onCopy}
          >
            {copySuccess ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            variant="secondary"
            icon={Download}
            onClick={onDownload}
          >
            Download
          </Button>
          <Button
            icon={saveSuccess ? CheckCircle : RefreshCw}
            color="emerald"
            onClick={onSave}
            loading={isSaving}
          >
            {saveSuccess ? 'Saved!' : 'Apply Config'}
          </Button>
        </Flex>
      </Flex>

      {/* AI Explanation */}
      {aiResponse?.explanation && (
        <Callout
          title="AI Analysis"
          icon={Sparkles}
          color="blue"
          className="mb-4"
        >
          {aiResponse.explanation}
        </Callout>
      )}

      {/* Warnings */}
      {aiResponse?.warnings && aiResponse.warnings.length > 0 && (
        <Callout
          title="Considerations"
          icon={AlertCircle}
          color="amber"
          className="mb-4"
        >
          <ul className="list-disc list-inside mt-2">
            {aiResponse.warnings.map((warning, i) => (
              <li key={i} className="text-sm">{warning}</li>
            ))}
          </ul>
        </Callout>
      )}

      {/* Config Preview */}
      <div
        className="rounded-lg overflow-hidden border"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <div
          className="px-4 py-2 flex items-center justify-between border-b"
          style={{
            background: 'var(--color-bg-tertiary)',
            borderColor: 'var(--color-border-subtle)',
          }}
        >
          <Text className="text-sm font-medium">orion.config.json</Text>
          <Badge color="cyan" size="sm">JSON</Badge>
        </div>
        <pre
          className="p-4 text-sm overflow-auto max-h-96 font-mono"
          style={{
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
          }}
        >
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>

      {/* Rule Explanations */}
      {aiResponse?.rules && aiResponse.rules.length > 0 && (
        <div className="mt-6">
          <Title className="text-base mb-3">Rule Explanations</Title>
          <div className="space-y-2">
            {aiResponse.rules.map((rule, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-slate-50"
              >
                <Flex className="gap-2 items-center mb-1">
                  <Text className="font-mono text-sm font-medium">
                    {rule.types.join(', ')}
                  </Text>
                  <Badge color="slate" size="xs">
                    {rule.maxAge}s TTL
                  </Badge>
                  {rule.scope && (
                    <Badge color={rule.scope === 'private' ? 'amber' : 'emerald'} size="xs">
                      {rule.scope}
                    </Badge>
                  )}
                  {rule.passthrough && (
                    <Badge color="red" size="xs">
                      passthrough
                    </Badge>
                  )}
                </Flex>
                <Text className="text-xs text-slate-600">
                  {rule.reasoning}
                </Text>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
