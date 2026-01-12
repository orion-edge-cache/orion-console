/**
 * EndpointSection Component
 *
 * Displays the GraphQL endpoint discovered from terraform state.
 */

import { Loader2, AlertCircle } from 'lucide-react';
import { Card, Title, Text, Flex, Badge, TextInput, Callout } from '@tremor/react';

interface EndpointSectionProps {
  endpoint: string;
  endpointSource: string;
  isLoading: boolean;
}

export function EndpointSection({ endpoint, endpointSource, isLoading }: EndpointSectionProps) {
  return (
    <Card>
      <Title className="mb-4">GraphQL Endpoint</Title>

      {isLoading ? (
        <Flex className="gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <Text>Loading endpoint from terraform state...</Text>
        </Flex>
      ) : endpoint ? (
        <div>
          <Flex className="gap-2 items-center">
            <TextInput value={endpoint} disabled className="flex-1 font-mono" />
            <Badge color="emerald" size="sm">
              {endpointSource}
            </Badge>
          </Flex>
          <Text className="text-xs mt-2 text-slate-500">
            Endpoint auto-discovered from ~/.config/orion/terraform.tfstate
          </Text>
        </div>
      ) : (
        <Callout title="No endpoint found" icon={AlertCircle} color="amber">
          Deploy infrastructure first using &quot;orion deploy&quot; to discover the GraphQL endpoint automatically.
        </Callout>
      )}
    </Card>
  );
}
