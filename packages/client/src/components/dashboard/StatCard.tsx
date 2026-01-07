import { Card, Metric, Text, Flex } from "@tremor/react";

interface StatCardProps {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string;
  description: string;
}

export function StatCard({ icon, iconColor, label, value, description }: StatCardProps) {
  return (
    <Card decoration="top" decorationColor="slate">
      <Flex alignItems="center" className="gap-2 mb-3">
        <span className={iconColor}>{icon}</span>
        <Text className="text-sm font-medium">{label}</Text>
      </Flex>
      <Metric className="font-display">{value}</Metric>
      <Text className="text-xs mt-1">{description}</Text>
    </Card>
  );
}
