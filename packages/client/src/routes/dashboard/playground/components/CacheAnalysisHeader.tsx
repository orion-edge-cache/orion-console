/**
 * CacheAnalysisHeader Component
 *
 * Displays cache status badges and warnings.
 */

import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { Badge, Flex, Callout } from '@tremor/react';
import type { CacheAnalysis, ResponseData } from '../types';

interface CacheAnalysisHeaderProps {
  analysis: CacheAnalysis;
  response: ResponseData;
}

export function CacheAnalysisHeader({ analysis, response }: CacheAnalysisHeaderProps) {
  return (
    <div
      className="p-4 border-b"
      style={{
        background: 'var(--color-bg-tertiary)',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      {response._meta?.usedFallback && (
        <Callout
          className="mb-3"
          title="CDN unavailable"
          icon={AlertTriangle}
          color="amber"
        >
          Using backend URL directly (no caching)
        </Callout>
      )}
      <Flex className="gap-4 flex-wrap">
        {/* Cache Status Badge */}
        <Badge
          icon={analysis.isHit ? CheckCircle : AlertTriangle}
          color={analysis.isHit ? 'emerald' : 'amber'}
          size="lg"
        >
          {analysis.isHit ? 'CACHE HIT' : 'CACHE MISS'}
        </Badge>

        {/* TTL */}
        {analysis.ttl !== null && (
          <Badge icon={Clock} color="slate" size="md">
            TTL: {analysis.ttl}s
          </Badge>
        )}

        {/* Age */}
        {analysis.age !== null && (
          <Badge color="slate" size="md">
            Age: {analysis.age}s
          </Badge>
        )}

        {/* Response Time */}
        <Badge color="slate" size="md">
          {response.duration.toFixed(0)}ms
        </Badge>
      </Flex>

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {analysis.warnings.map((warning, i) => (
            <Callout key={i} icon={AlertTriangle} color="amber" title="">
              {warning}
            </Callout>
          ))}
        </div>
      )}
    </div>
  );
}
