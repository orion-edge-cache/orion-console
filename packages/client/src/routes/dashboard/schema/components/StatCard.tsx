/**
 * StatCard Component
 *
 * Simple stat display card for schema analysis metrics.
 */

import { Flex, Text } from '@tremor/react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

export function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="p-4 rounded-lg bg-slate-50">
      <Flex className="gap-2 items-center mb-2">
        <span className="text-slate-500">{icon}</span>
        <Text className="text-sm text-slate-600">{label}</Text>
      </Flex>
      <Text className="text-2xl font-bold">{value}</Text>
    </div>
  );
}
