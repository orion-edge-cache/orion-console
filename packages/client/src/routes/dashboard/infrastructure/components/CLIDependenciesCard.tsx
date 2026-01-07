import { Card, Text, Badge, Callout } from '@tremor/react';
import { Terminal, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import type { CLIDependencyStatus } from '../../../../services/cli-dependencies-api';

interface CLIDependenciesCardProps {
  status: CLIDependencyStatus | null;
  isLoading: boolean;
}

export function CLIDependenciesCard({ status, isLoading }: CLIDependenciesCardProps) {
  return (
    <Card>
      <Text className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        CLI Dependencies
      </Text>

      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
          <Text className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Checking CLI tools...
          </Text>
        </div>
      ) : status?.allInstalled ? (
        <div className="flex items-center gap-4 flex-wrap">
          <Badge icon={CheckCircle} color="emerald" size="lg">
            All CLI Tools Installed
          </Badge>
          <div className="flex gap-2">
            {status.dependencies.map((dep) => (
              <Badge key={dep.command} icon={Terminal} color="slate" size="sm">
                {dep.name}: {dep.version?.split('\n')[0] || 'OK'}
              </Badge>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Badge icon={XCircle} color="red" size="lg">
            Missing CLI Tools
          </Badge>
          <div className="space-y-2">
            {status?.dependencies.map((dep) => (
              <div key={dep.command} className="flex items-center gap-2">
                {dep.installed ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <Text className="text-sm">
                  {dep.name}: {dep.installed ? dep.version?.split('\n')[0] : dep.error}
                </Text>
              </div>
            ))}
          </div>
          <Callout color="amber" icon={AlertTriangle}>
            <Text className="text-sm">
              Install missing CLI tools to enable infrastructure operations.{' '}
              <a
                href="https://developer.fastly.com/reference/cli/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 hover:underline"
              >
                Fastly CLI
              </a>
              {' | '}
              <a
                href="https://developer.hashicorp.com/terraform/install"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 hover:underline"
              >
                Terraform
              </a>
            </Text>
          </Callout>
        </div>
      )}
    </Card>
  );
}
