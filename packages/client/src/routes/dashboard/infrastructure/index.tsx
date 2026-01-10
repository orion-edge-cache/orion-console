import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Title, Text, Callout } from '@tremor/react';
import {
  getInfrastructureStatus,
  getCredentialsStatus,
  getDestroyRequirements,
  checkCLIDependencies,
} from '../../../services';
import { useSystemState } from '../../../hooks';
import { SystemHealthCard, CLIDependenciesCard, ResourcesGrid } from './components';
import { DangerZone } from './danger-zone';
import { useDestroyFlow } from './hooks';

export const Route = createFileRoute('/dashboard/infrastructure/')({
  component: InfrastructurePage,
});

function InfrastructurePage() {
  const { canMutate, isLocked, currentOperation } = useSystemState();
  const destroyFlow = useDestroyFlow();

  const { data: infraData, isLoading } = useQuery({
    queryKey: ['infrastructure-status'],
    queryFn: getInfrastructureStatus,
    refetchInterval: 10000,
  });

  const { data: credsData } = useQuery({
    queryKey: ['credentials'],
    queryFn: getCredentialsStatus,
  });

  const { data: cliDependencies, isLoading: isCheckingCLI } = useQuery({
    queryKey: ['cli-dependencies'],
    queryFn: checkCLIDependencies,
  });

  const services = infraData?.status?.services;
  const deployed = infraData?.status?.deployed;
  const hasSavedCreds = credsData?.saved && credsData?.hasAws && credsData?.hasFastly;

  const { data: destroyRequirements } = useQuery({
    queryKey: ['destroy-requirements'],
    queryFn: getDestroyRequirements,
    enabled: deployed === true,
  });

  const requiredDestroyCreds = destroyRequirements?.required;
  const needsManualCredentials = !!(
    requiredDestroyCreds?.awsAccessKeyId ||
    requiredDestroyCreds?.awsSecretAccessKey ||
    requiredDestroyCreds?.fastlyApiToken
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto animate-fade-in" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <header className="px-8 py-6 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <Title className="font-display text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          Infrastructure
        </Title>
        <Text style={{ color: 'var(--color-text-tertiary)' }}>
          Manage your deployed resources
        </Text>
      </header>

      <div className="p-8 space-y-6">
        {/* Global Lock Warning */}
        {isLocked && (
          <Callout title="Operation in progress" icon={Loader2} color="amber">
            Operation: {currentOperation}. Changes are locked until complete.
          </Callout>
        )}

        <SystemHealthCard deployed={deployed ?? false} />

        <CLIDependenciesCard status={cliDependencies ?? null} isLoading={isCheckingCLI} />

        {deployed && services && <ResourcesGrid services={services} demoApp={infraData?.status?.demoApp} />}

        {deployed && (
          <DangerZone
            canMutate={canMutate}
            cliDependencies={cliDependencies ?? null}
            hasSavedCreds={hasSavedCreds ?? false}
            savedCredsInfo={credsData}
            needsManualCredentials={needsManualCredentials}
            requiredCredentials={requiredDestroyCreds}
            {...destroyFlow}
          />
        )}
      </div>
    </div>
  );
}
