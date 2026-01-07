/**
 * Infrastructure Page - /dashboard/infrastructure
 *
 * System management hub: status, resources, and danger zone for destroy.
 * Minimal light design with glassmorphism.
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Server,
  Cloud,
  Database,
  Archive,
  ExternalLink,
  AlertTriangle,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Key,
  FileSearch,
  Terminal,
} from 'lucide-react';
import {
  Badge,
  Button,
  Callout,
  Card,
  Grid,
  Select,
  SelectItem,
  Text,
  TextInput,
  Title,
} from '@tremor/react';
import {
  getInfrastructureStatus,
  getCredentialsStatus,
  getDestroyRequirements,
  checkCLIDependencies,
} from '../../services';
import { useSystemState, planDestroy } from '../../hooks';

export const Route = createFileRoute('/dashboard/infrastructure')({
  component: InfrastructurePage,
});

interface DestroyFormData {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  fastlyApiToken: string;
  awsRegion: string;
}

function InfrastructurePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canMutate, isLocked, currentOperation } = useSystemState();

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planResult, setPlanResult] = useState<{ resources: Array<{ type: string; name: string; provider: string }>; warning: string } | null>(null);
  const [isPlanningDestroy, setIsPlanningDestroy] = useState(false);

  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [useSavedCreds, setUseSavedCreds] = useState(true);
  const [destroyCredentials, setDestroyCredentials] = useState<DestroyFormData>({
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    fastlyApiToken: '',
    awsRegion: 'us-east-1',
  });
  const [destroyLogs, setDestroyLogs] = useState<string[]>([]);
  const [isDestroying, setIsDestroying] = useState(false);

  const { data: infraData, isLoading } = useQuery({
    queryKey: ['infrastructure-status'],
    queryFn: getInfrastructureStatus,
    refetchInterval: 10000,
  });

  const { data: credsData } = useQuery({
    queryKey: ['credentials'],
    queryFn: getCredentialsStatus,
  });

  const services = infraData?.status?.services;
  const deployed = infraData?.status?.deployed;
  const hasSavedCreds = credsData?.saved && credsData?.hasAws && credsData?.hasFastly;

  const { data: destroyRequirements } = useQuery({
    queryKey: ['destroy-requirements'],
    queryFn: getDestroyRequirements,
    enabled: deployed === true,
  });

  // CLI dependencies check
  const { data: cliDependencies, isLoading: isCheckingCLI } = useQuery({
    queryKey: ['cli-dependencies'],
    queryFn: checkCLIDependencies,
  });

  const requiredDestroyCreds = destroyRequirements?.required;
  const needsManualCredentials = !!(
    requiredDestroyCreds?.awsAccessKeyId ||
    requiredDestroyCreds?.awsSecretAccessKey ||
    requiredDestroyCreds?.fastlyApiToken
  );

  const handlePlanDestroy = async () => {
    setIsPlanningDestroy(true);
    try {
      const result = await planDestroy();
      setPlanResult(result);
      setShowPlanModal(true);
    } catch (err) {
      console.error('Plan destroy failed:', err);
    } finally {
      setIsPlanningDestroy(false);
    }
  };

  const handleDestroy = async () => {
    if (confirmText !== 'DESTROY') return;

    setIsDestroying(true);
    setDestroyLogs([]);

    try {
      const body = useSavedCreds && hasSavedCreds
        ? { useSavedCredentials: true }
        : destroyCredentials;

      const response = await fetch('/api/infrastructure/destroy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Destroy failed');
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.message) {
                  setDestroyLogs((prev) => [...prev, data.message]);
                }
                if (data.step === 'done') {
                  // Success - redirect to welcome
                  queryClient.invalidateQueries({ queryKey: ['infrastructure-status'] });
                  setDestroyLogs((prev) => [...prev, 'Redirecting to setup...']);
                  setTimeout(() => navigate({ to: '/welcome' }), 2000);
                }
                if (data.step === 'error') {
                  setDestroyLogs((prev) => [...prev, `Error: ${data.error}`]);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (err) {
      setDestroyLogs((prev) => [...prev, `Error: ${err instanceof Error ? err.message : 'Unknown error'}`]);
    } finally {
      setIsDestroying(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ background: 'var(--color-bg-primary)' }}
      >
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: 'var(--color-accent)' }}
        />
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-auto animate-fade-in"
      style={{ background: 'var(--color-bg-primary)' }}
    >
      {/* Header */}
      <header
        className="px-8 py-6 border-b"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
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
          <Callout
            title="Operation in progress"
            icon={Loader2}
            color="amber"
          >
            Operation: {currentOperation}. Changes are locked until complete.
          </Callout>
        )}

        {/* Health Status */}
        <Card>
          <Text className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            System Health
          </Text>
          <div className="flex items-center gap-4 flex-wrap">
            {deployed ? (
              <>
                <Badge icon={CheckCircle} color="emerald" size="lg">
                  Infrastructure Active
                </Badge>
                <Text className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Terraform state: Deployed
                </Text>
              </>
            ) : (
              <>
                <Badge icon={XCircle} color="slate" size="lg">
                  Not Deployed
                </Badge>
                <Button variant="light" onClick={() => navigate({ to: '/welcome' })}>
                  Deploy now
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* CLI Dependencies Status */}
        <Card>
          <Text className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            CLI Dependencies
          </Text>
          {isCheckingCLI ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
              <Text className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Checking CLI tools...
              </Text>
            </div>
          ) : cliDependencies?.allInstalled ? (
            <div className="flex items-center gap-4 flex-wrap">
              <Badge icon={CheckCircle} color="emerald" size="lg">
                All CLI Tools Installed
              </Badge>
              <div className="flex gap-2">
                {cliDependencies.dependencies.map((dep) => (
                  <Badge key={dep.command} icon={Terminal} color="slate" size="sm">
                    {dep.name}: {dep.version?.split('\n')[0] || 'OK'}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge icon={XCircle} color="red" size="lg">
                  Missing CLI Tools
                </Badge>
              </div>
              <div className="space-y-2">
                {cliDependencies?.dependencies.map((dep) => (
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

        {/* Resources */}
        {deployed && services && (
          <Card>
            <Text className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Deployed Resources
            </Text>
            <Grid numItemsSm={1} numItemsMd={2} className="gap-4">
              <ResourceCard
                icon={<Server className="w-5 h-5" />}
                label="CDN Service"
                value={services.cdn || 'N/A'}
                provider="fastly"
                link={services.cdn ? `https://${services.cdn}` : undefined}
              />
              <ResourceCard
                icon={<Cloud className="w-5 h-5" />}
                label="Compute Service"
                value={services.compute || 'N/A'}
                provider="fastly"
                link={services.compute ? `https://manage.fastly.com/compute/services` : undefined}
              />
              <ResourceCard
                icon={<Database className="w-5 h-5" />}
                label="Kinesis Stream"
                value={services.kinesis || 'N/A'}
                provider="aws"
                link={services.kinesis ? `https://console.aws.amazon.com/kinesis/home` : undefined}
              />
              <ResourceCard
                icon={<Archive className="w-5 h-5" />}
                label="S3 Bucket"
                value={services.s3 || 'N/A'}
                provider="aws"
                link={services.s3 ? `https://s3.console.aws.amazon.com/s3/buckets/${services.s3}` : undefined}
              />
            </Grid>
          </Card>
        )}

        {/* Danger Zone */}
        {deployed && (
          <Card decoration="left" decorationColor="red" className="border border-red-200">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
              <Text className="text-lg font-semibold" style={{ color: 'var(--color-error)' }}>
                Danger Zone
              </Text>
            </div>

            {!showDestroyConfirm && !isDestroying && destroyLogs.length === 0 && (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <Text className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Permanently delete all infrastructure resources.
                  </Text>
                  <Text className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    This will destroy: CDN service, Compute service, Kinesis stream, S3 bucket
                  </Text>
                  {!cliDependencies?.allInstalled && (
                    <Text className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                      Missing CLI tools - install Fastly CLI and Terraform to enable destruction
                    </Text>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handlePlanDestroy}
                    disabled={!canMutate || isPlanningDestroy || !cliDependencies?.allInstalled}
                    variant="secondary"
                    icon={FileSearch}
                    loading={isPlanningDestroy}
                  >
                    Plan Destruction
                  </Button>
                  <Button
                    onClick={() => setShowDestroyConfirm(true)}
                    disabled={!canMutate || !cliDependencies?.allInstalled}
                    color="red"
                    icon={Trash2}
                  >
                    Destroy Infrastructure
                  </Button>
                </div>
              </div>
            )}

            {showDestroyConfirm && !isDestroying && destroyLogs.length === 0 && (
              <div className="space-y-4">
                {/* Saved credentials option */}
                {hasSavedCreds && (
                  <Card className="p-4 bg-emerald-50 ring-emerald-200">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Key className="w-5 h-5 text-emerald-600" />
                      <div className="flex-1">
                        <Text className="text-sm font-medium text-emerald-700">
                          Saved credentials found
                        </Text>
                        <Text className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          AWS: {credsData?.awsKeyHint} ({credsData?.awsRegion})
                        </Text>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useSavedCreds}
                          onChange={(e) => setUseSavedCreds(e.target.checked)}
                          className="w-4 h-4 rounded"
                          style={{ accentColor: 'var(--color-success)' }}
                        />
                        <Text className="text-sm font-medium text-emerald-700">
                          Use saved
                        </Text>
                      </label>
                    </div>
                  </Card>
                )}

                {/* Manual credentials form (hidden if using saved) */}
                {(!hasSavedCreds || !useSavedCreds) && needsManualCredentials && (
                  <>
                    <Text className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>
                      Enter your credentials and type "DESTROY" to confirm.
                    </Text>

                    <Grid numItemsSm={1} numItemsMd={2} className="gap-4">
                      {requiredDestroyCreds?.awsAccessKeyId && (
                        <div>
                          <Text className="text-sm mb-1">AWS Access Key ID</Text>
                          <TextInput
                            value={destroyCredentials.awsAccessKeyId}
                            onValueChange={(value) =>
                              setDestroyCredentials((prev) => ({ ...prev, awsAccessKeyId: value }))
                            }
                            placeholder="AKIA..."
                          />
                        </div>
                      )}
                      {requiredDestroyCreds?.awsSecretAccessKey && (
                        <div>
                          <Text className="text-sm mb-1">AWS Secret Access Key</Text>
                          <TextInput
                            type="password"
                            value={destroyCredentials.awsSecretAccessKey}
                            onValueChange={(value) =>
                              setDestroyCredentials((prev) => ({ ...prev, awsSecretAccessKey: value }))
                            }
                            placeholder="Secret key"
                          />
                        </div>
                      )}
                      {requiredDestroyCreds?.fastlyApiToken && (
                        <div>
                          <Text className="text-sm mb-1">Fastly API Token</Text>
                          <TextInput
                            type="password"
                            value={destroyCredentials.fastlyApiToken}
                            onValueChange={(value) =>
                              setDestroyCredentials((prev) => ({ ...prev, fastlyApiToken: value }))
                            }
                            placeholder="Fastly token"
                          />
                        </div>
                      )}
                      <div>
                        <Text className="text-sm mb-1">AWS Region</Text>
                        <Select
                          value={destroyCredentials.awsRegion}
                          onValueChange={(value) =>
                            setDestroyCredentials((prev) => ({ ...prev, awsRegion: value }))
                          }
                        >
                          <SelectItem value="us-east-1">us-east-1</SelectItem>
                          <SelectItem value="us-west-2">us-west-2</SelectItem>
                          <SelectItem value="eu-west-1">eu-west-1</SelectItem>
                          <SelectItem value="ap-southeast-1">ap-southeast-1</SelectItem>
                        </Select>
                      </div>
                    </Grid>
                  </>
                )}

                {/* Confirmation */}
                {(hasSavedCreds && useSavedCreds) && (
                  <Text className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>
                    Type "DESTROY" to confirm deletion.
                  </Text>
                )}

                {(!hasSavedCreds || !useSavedCreds) && !needsManualCredentials && (
                  <Text className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Server credentials detected. Type "DESTROY" to confirm.
                  </Text>
                )}

                <div>
                  <Text className="text-sm mb-1">Type "DESTROY" to confirm</Text>
                  <TextInput
                    value={confirmText}
                    onValueChange={(value) => setConfirmText(value.toUpperCase())}
                    placeholder="DESTROY"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setShowDestroyConfirm(false);
                      setConfirmText('');
                    }}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDestroy}
                    disabled={
                      confirmText !== 'DESTROY' ||
                      (!hasSavedCreds && !useSavedCreds && needsManualCredentials && (
                        (requiredDestroyCreds?.awsAccessKeyId && !destroyCredentials.awsAccessKeyId) ||
                        (requiredDestroyCreds?.awsSecretAccessKey && !destroyCredentials.awsSecretAccessKey) ||
                        (requiredDestroyCreds?.fastlyApiToken && !destroyCredentials.fastlyApiToken)
                      ))
                    }
                    color="red"
                    icon={Trash2}
                  >
                    Confirm Destroy
                  </Button>
                </div>
              </div>
            )}

            {(isDestroying || destroyLogs.length > 0) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {isDestroying && (
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-error)' }} />
                  )}
                  <span className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>
                    {isDestroying ? 'Destroying infrastructure...' : 'Destroy complete'}
                  </span>
                </div>
                <div
                  className="rounded-lg p-4 max-h-64 overflow-y-auto text-xs"
                  style={{
                    background: 'var(--color-bg-primary)',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {destroyLogs.map((log, i) => (
                    <div key={i} className="whitespace-pre-wrap">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Plan Destroy Modal */}
      {showPlanModal && planResult && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0, 0, 0, 0.4)' }}
        >
          <Card className="max-w-lg w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <FileSearch className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
              <Text className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Destruction Plan
              </Text>
            </div>

            <Callout title="Warning" icon={AlertTriangle} color="red" className="mb-4">
              {planResult.warning}
            </Callout>

            <div className="space-y-2 mb-6">
              <Text className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Resources to be destroyed:
              </Text>
              <div
                className="rounded-lg p-3 max-h-48 overflow-y-auto"
                style={{ background: 'var(--color-bg-tertiary)' }}
              >
                {planResult.resources.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 border-b last:border-0"
                    style={{ borderColor: 'var(--color-border-subtle)' }}
                  >
                    <div>
                      <Text className="text-sm font-mono" style={{ color: 'var(--color-text-primary)' }}>
                        {r.name}
                      </Text>
                      <Text className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {r.type}
                      </Text>
                    </div>
                    <Badge color={r.provider === 'aws' ? 'amber' : 'rose'} size="sm">
                      {r.provider}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={() => setShowPlanModal(false)} variant="secondary">
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowPlanModal(false);
                  setShowDestroyConfirm(true);
                }}
                color="red"
                icon={Trash2}
              >
                Proceed to Destroy
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   RESOURCE CARD COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */

function ResourceCard({
  icon,
  label,
  value,
  provider,
  link,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  provider: 'aws' | 'fastly';
  link?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ color: 'var(--color-text-muted)' }}>{icon}</div>
          <div>
            <Text className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</Text>
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
