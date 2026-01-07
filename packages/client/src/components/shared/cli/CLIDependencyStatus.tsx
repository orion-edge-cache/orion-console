import { Callout, Text, Flex } from '@tremor/react';
import { Terminal, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import type { CLIDependencyStatus as CLIStatus } from '../../../services/cli-dependencies-api';

interface CLIDependencyStatusProps {
  status: CLIStatus | null;
  isLoading: boolean;
  variant?: 'callout' | 'card' | 'inline';
}

export function CLIDependencyStatus({
  status,
  isLoading,
  variant = 'callout',
}: CLIDependencyStatusProps) {
  if (isLoading) {
    return (
      <Callout icon={Terminal} color="slate">
        <Flex alignItems="center" className="gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <Text>Checking CLI dependencies...</Text>
        </Flex>
      </Callout>
    );
  }

  if (!status) {
    return null;
  }

  if (status.allInstalled) {
    return (
      <Callout icon={Terminal} color="emerald">
        <Flex alignItems="center" className="gap-2">
          <CheckCircle className="w-4 h-4" />
          <Text>CLI dependencies verified (Fastly CLI, Terraform)</Text>
        </Flex>
      </Callout>
    );
  }

  return (
    <Callout title="Missing CLI Tools" icon={AlertTriangle} color="red">
      <div className="space-y-2">
        <Text>
          The following CLI tools are required but not installed:
        </Text>
        <ul className="list-disc list-inside text-sm">
          {status.dependencies
            .filter((dep) => !dep.installed)
            .map((dep) => (
              <li key={dep.command}>
                <span className="font-medium">{dep.name}</span>
                {dep.error && (
                  <span className="text-slate-500 ml-1">- {dep.error}</span>
                )}
              </li>
            ))}
        </ul>
        <div className="pt-2 text-sm">
          <Text className="font-medium">Installation links:</Text>
          <ul className="list-disc list-inside">
            <li>
              <a
                href="https://developer.fastly.com/reference/cli/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 hover:underline"
              >
                Fastly CLI
              </a>
            </li>
            <li>
              <a
                href="https://developer.hashicorp.com/terraform/install"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 hover:underline"
              >
                Terraform
              </a>
            </li>
          </ul>
        </div>
      </div>
    </Callout>
  );
}
