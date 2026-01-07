import { Card, Text, Button } from '@tremor/react';
import { AlertTriangle, Trash2, FileSearch } from 'lucide-react';
import { DestroyConfirmForm } from './DestroyConfirmForm';
import { DestroyProgress } from './DestroyProgress';
import { PlanDestroyModal } from './PlanDestroyModal';
import type { CLIDependencyStatus } from '../../../../services/cli-dependencies-api';

interface DangerZoneProps {
  canMutate: boolean;
  cliDependencies: CLIDependencyStatus | null;
  hasSavedCreds: boolean;
  savedCredsInfo?: {
    hasAws: boolean;
    hasFastly: boolean;
    awsKeyHint?: string;
    awsRegion?: string;
  };
  needsManualCredentials: boolean;
  requiredCredentials?: {
    awsAccessKeyId?: boolean;
    awsSecretAccessKey?: boolean;
    fastlyApiToken?: boolean;
  };
  // From useDestroyFlow
  showPlanModal: boolean;
  planResult: { resources: Array<{ type: string; name: string; provider: string }>; warning: string } | null;
  isPlanningDestroy: boolean;
  handlePlanDestroy: () => void;
  closePlanModal: () => void;
  proceedFromPlan: () => void;
  showDestroyConfirm: boolean;
  confirmText: string;
  setConfirmText: (value: string) => void;
  useSavedCreds: boolean;
  setUseSavedCreds: (value: boolean) => void;
  destroyCredentials: {
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    fastlyApiToken: string;
    awsRegion: string;
  };
  updateDestroyCredential: (key: 'awsAccessKeyId' | 'awsSecretAccessKey' | 'fastlyApiToken' | 'awsRegion', value: string) => void;
  cancelDestroy: () => void;
  destroyLogs: string[];
  isDestroying: boolean;
  handleDestroy: (hasSavedCreds: boolean) => void;
}

export function DangerZone(props: DangerZoneProps) {
  const {
    canMutate,
    cliDependencies,
    hasSavedCreds,
    savedCredsInfo,
    needsManualCredentials,
    requiredCredentials,
    showPlanModal,
    planResult,
    isPlanningDestroy,
    handlePlanDestroy,
    closePlanModal,
    proceedFromPlan,
    showDestroyConfirm,
    confirmText,
    setConfirmText,
    useSavedCreds,
    setUseSavedCreds,
    destroyCredentials,
    updateDestroyCredential,
    cancelDestroy,
    destroyLogs,
    isDestroying,
    handleDestroy,
  } = props;

  const showInitialState = !showDestroyConfirm && !isDestroying && destroyLogs.length === 0;

  return (
    <>
      <Card decoration="left" decorationColor="red" className="border border-red-200">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
          <Text className="text-lg font-semibold" style={{ color: 'var(--color-error)' }}>
            Danger Zone
          </Text>
        </div>

        {showInitialState && (
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
                onClick={proceedFromPlan}
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
          <DestroyConfirmForm
            hasSavedCreds={hasSavedCreds}
            savedCredsInfo={savedCredsInfo}
            useSavedCreds={useSavedCreds}
            setUseSavedCreds={setUseSavedCreds}
            needsManualCredentials={needsManualCredentials}
            requiredCredentials={requiredCredentials}
            destroyCredentials={destroyCredentials}
            updateCredential={updateDestroyCredential}
            confirmText={confirmText}
            setConfirmText={setConfirmText}
            onCancel={cancelDestroy}
            onConfirm={() => handleDestroy(hasSavedCreds)}
          />
        )}

        {(isDestroying || destroyLogs.length > 0) && (
          <DestroyProgress isDestroying={isDestroying} logs={destroyLogs} />
        )}
      </Card>

      {/* Plan Modal */}
      {showPlanModal && planResult && (
        <PlanDestroyModal
          planResult={planResult}
          onClose={closePlanModal}
          onProceed={proceedFromPlan}
        />
      )}
    </>
  );
}
