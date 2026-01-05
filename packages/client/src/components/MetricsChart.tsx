/**
 * MetricsChart Component
 *
 * Real-time metrics visualization using Recharts.
 * Brand: Navy (#1f395f) + Cyan (#63c9d6)
 */

import { memo, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from 'recharts';
import type { DataPoint } from '@orion-console/shared';

// Brand-aligned chart colors
const COLORS = {
  // Brand cyan for primary metrics
  accent: '#63c9d6',
  accentLight: 'rgba(99, 201, 214, 0.15)',
  // Brand navy for secondary lines
  navy: '#1f395f',
  navyLight: 'rgba(31, 57, 95, 0.15)',
  // Success for positive metrics (hits, hit rate)
  success: '#10b981',
  successLight: 'rgba(16, 185, 129, 0.15)',
  // Error for negative metrics (misses)
  error: '#ef4444',
  errorLight: 'rgba(239, 68, 68, 0.15)',
  // Amber for highlights (use sparingly)
  highlight: '#f59e0b',
  // Grid and axis - navy-tinted
  grid: 'rgba(31, 57, 95, 0.06)',
  axis: 'rgba(31, 57, 95, 0.10)',
  tickText: '#4a5e78',
  // Tooltip
  tooltipBg: '#ffffff',
  tooltipBorder: 'rgba(31, 57, 95, 0.10)',
  tooltipText: '#1f395f',
};

// ═══════════════════════════════════════════════════════════════════════
// Hit Rate Chart
// ═══════════════════════════════════════════════════════════════════════

interface HitRateChartProps {
  dataPoints: DataPoint[];
  height?: number;
}

export const HitRateChart = memo(function HitRateChart({
  dataPoints,
  height = 200,
}: HitRateChartProps) {
  const data = useMemo(() => {
    return dataPoints.map((p) => ({
      time: new Date(p.time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
      hitRate: Math.round(p.hitRate * 100),
    }));
  }, [dataPoints]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full text-sm"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Waiting for data...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="hitRateGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.2} />
            <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis
          dataKey="time"
          tick={{ fill: COLORS.tickText, fontSize: 10 }}
          tickLine={{ stroke: COLORS.axis }}
          axisLine={{ stroke: COLORS.axis }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: COLORS.tickText, fontSize: 10 }}
          tickLine={{ stroke: COLORS.axis }}
          axisLine={{ stroke: COLORS.axis }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: COLORS.tooltipBg,
            border: `1px solid ${COLORS.tooltipBorder}`,
            borderRadius: '8px',
            color: COLORS.tooltipText,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          formatter={(value: number) => [`${value}%`, 'Hit Rate']}
        />
        <Area
          type="monotone"
          dataKey="hitRate"
          stroke={COLORS.success}
          strokeWidth={2}
          fill="url(#hitRateGradient)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// Requests Chart
// ═══════════════════════════════════════════════════════════════════════

interface RequestsChartProps {
  dataPoints: DataPoint[];
  height?: number;
}

export const RequestsChart = memo(function RequestsChart({
  dataPoints,
  height = 200,
}: RequestsChartProps) {
  const data = useMemo(() => {
    return dataPoints.map((p) => ({
      time: new Date(p.time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
      hits: p.hits,
      misses: p.misses,
      total: p.requests,
    }));
  }, [dataPoints]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full text-sm"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Waiting for data...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="hitsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.25} />
            <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="missesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.error} stopOpacity={0.25} />
            <stop offset="95%" stopColor={COLORS.error} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis
          dataKey="time"
          tick={{ fill: COLORS.tickText, fontSize: 10 }}
          tickLine={{ stroke: COLORS.axis }}
          axisLine={{ stroke: COLORS.axis }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: COLORS.tickText, fontSize: 10 }}
          tickLine={{ stroke: COLORS.axis }}
          axisLine={{ stroke: COLORS.axis }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: COLORS.tooltipBg,
            border: `1px solid ${COLORS.tooltipBorder}`,
            borderRadius: '8px',
            color: COLORS.tooltipText,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        />
        <Legend
          wrapperStyle={{ paddingTop: '10px' }}
          formatter={(value) => (
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{value}</span>
          )}
        />
        <Area
          type="monotone"
          dataKey="hits"
          name="Cache Hits"
          stroke={COLORS.success}
          fill="url(#hitsGradient)"
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="misses"
          name="Cache Misses"
          stroke={COLORS.error}
          fill="url(#missesGradient)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// Latency Chart
// ═══════════════════════════════════════════════════════════════════════

interface LatencyChartProps {
  dataPoints: DataPoint[];
  height?: number;
}

export const LatencyChart = memo(function LatencyChart({
  dataPoints,
  height = 200,
}: LatencyChartProps) {
  const data = useMemo(() => {
    return dataPoints.map((p) => ({
      time: new Date(p.time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
      latency: Math.round(p.avgLatency),
    }));
  }, [dataPoints]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full text-sm"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Waiting for data...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis
          dataKey="time"
          tick={{ fill: COLORS.tickText, fontSize: 10 }}
          tickLine={{ stroke: COLORS.axis }}
          axisLine={{ stroke: COLORS.axis }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: COLORS.tickText, fontSize: 10 }}
          tickLine={{ stroke: COLORS.axis }}
          axisLine={{ stroke: COLORS.axis }}
          tickFormatter={(v) => `${v}ms`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: COLORS.tooltipBg,
            border: `1px solid ${COLORS.tooltipBorder}`,
            borderRadius: '8px',
            color: COLORS.tooltipText,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          formatter={(value: number) => [`${value}ms`, 'Avg Latency']}
        />
        <Line
          type="monotone"
          dataKey="latency"
          stroke={COLORS.accent}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// Combined Metrics Panel
// ═══════════════════════════════════════════════════════════════════════

interface MetricsPanelProps {
  dataPoints: DataPoint[];
}

export const MetricsPanel = memo(function MetricsPanel({ dataPoints }: MetricsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Hit Rate Chart */}
      <div className="card p-4">
        <h3
          className="text-sm font-medium mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Cache Hit Rate
        </h3>
        <HitRateChart dataPoints={dataPoints} height={180} />
      </div>

      {/* Requests Chart */}
      <div className="card p-4">
        <h3
          className="text-sm font-medium mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Requests per Second
        </h3>
        <RequestsChart dataPoints={dataPoints} height={180} />
      </div>

      {/* Latency Chart */}
      <div className="card p-4">
        <h3
          className="text-sm font-medium mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Average Latency
        </h3>
        <LatencyChart dataPoints={dataPoints} height={180} />
      </div>
    </div>
  );
});
