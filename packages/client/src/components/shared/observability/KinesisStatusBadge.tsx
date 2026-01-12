/**
 * Kinesis Status Badge
 *
 * Shared component for displaying Kinesis stream status.
 * Consolidated from dashboard/index.tsx, dashboard/analytics.tsx, and dashboard/logs.tsx
 */

import { Badge } from '@tremor/react';
import { Database } from 'lucide-react';

interface KinesisStatus {
  running: boolean;
  lastRecordTime?: string | null;
}

interface KinesisStatusBadgeProps {
  status?: KinesisStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function KinesisStatusBadge({ status, size = 'lg' }: KinesisStatusBadgeProps) {
  if (!status) {
    return (
      <Badge icon={Database} color="gray" size={size}>
        Kinesis Unknown
      </Badge>
    );
  }

  if (!status.running) {
    return (
      <Badge icon={Database} color="yellow" size={size}>
        Kinesis Starting...
      </Badge>
    );
  }

  // Check if we've received data recently (within last 60s)
  const lastRecordAge = status.lastRecordTime
    ? Date.now() - new Date(status.lastRecordTime).getTime()
    : null;
  const isReceivingData = lastRecordAge !== null && lastRecordAge < 60000;

  if (isReceivingData) {
    return (
      <Badge icon={Database} color="emerald" size={size}>
        Kinesis Active
      </Badge>
    );
  }

  return (
    <Badge icon={Database} color="blue" size={size}>
      Kinesis Ready
    </Badge>
  );
}
