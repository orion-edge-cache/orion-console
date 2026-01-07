import { Card, Text, Badge } from '@tremor/react';
import { ExternalLink } from 'lucide-react';

interface ResourceCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  provider: 'aws' | 'fastly';
  link?: string;
}

export function ResourceCard({ icon, label, value, provider, link }: ResourceCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ color: 'var(--color-text-muted)' }}>{icon}</div>
          <div>
            <Text className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {label}
            </Text>
            <Text
              className="text-sm font-mono truncate max-w-[200px]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {value}
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={provider === 'aws' ? 'amber' : 'rose'} size="sm">
            {provider === 'aws' ? 'AWS' : 'Fastly'}
          </Badge>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
