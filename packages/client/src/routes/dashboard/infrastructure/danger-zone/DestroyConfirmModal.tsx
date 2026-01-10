import { Card, Text, Button, TextInput, Select, SelectItem, Grid } from '@tremor/react';
import { Key, Trash2, X, AlertTriangle } from 'lucide-react';

interface DestroyCredentials {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  fastlyApiToken: string;
  awsRegion: string;
}

interface RequiredCredentials {
  awsAccessKeyId?: boolean;
  awsSecretAccessKey?: boolean;
  fastlyApiToken?: boolean;
}

interface SavedCredsInfo {
  hasAws: boolean;
  hasFastly: boolean;
  awsKeyHint?: string;
  awsRegion?: string;
}

interface DestroyConfirmModalProps {
  hasSavedCreds: boolean;
  savedCredsInfo?: SavedCredsInfo;
  useSavedCreds: boolean;
  setUseSavedCreds: (value: boolean) => void;
  needsManualCredentials: boolean;
  requiredCredentials?: RequiredCredentials;
  destroyCredentials: DestroyCredentials;
  updateCredential: (key: keyof DestroyCredentials, value: string) => void;
  confirmText: string;
  setConfirmText: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DestroyConfirmModal({
  hasSavedCreds,
  savedCredsInfo,
  useSavedCreds,
  setUseSavedCreds,
  needsManualCredentials,
  requiredCredentials,
  destroyCredentials,
  updateCredential,
  confirmText,
  setConfirmText,
  onCancel,
  onConfirm,
}: DestroyConfirmModalProps) {
  const isConfirmDisabled =
    confirmText !== 'DESTROY' ||
    (!hasSavedCreds &&
      !useSavedCreds &&
      needsManualCredentials &&
      ((requiredCredentials?.awsAccessKeyId && !destroyCredentials.awsAccessKeyId) ||
        (requiredCredentials?.awsSecretAccessKey && !destroyCredentials.awsSecretAccessKey) ||
        (requiredCredentials?.fastlyApiToken && !destroyCredentials.fastlyApiToken)));

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onCancel}
    >
      <Card
        className="max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
            <Text className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Confirm Destroy
            </Text>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
                    AWS: {savedCredsInfo?.awsKeyHint} ({savedCredsInfo?.awsRegion})
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
                  <Text className="text-sm font-medium text-emerald-700">Use saved</Text>
                </label>
              </div>
            </Card>
          )}

          {/* Manual credentials form */}
          {(!hasSavedCreds || !useSavedCreds) && needsManualCredentials && (
            <>
              <Text className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>
                Enter your credentials and type "DESTROY" to confirm.
              </Text>

              <Grid numItemsSm={1} numItemsMd={2} className="gap-4">
                {requiredCredentials?.awsAccessKeyId && (
                  <div>
                    <Text className="text-sm mb-1">AWS Access Key ID</Text>
                    <TextInput
                      value={destroyCredentials.awsAccessKeyId}
                      onValueChange={(value) => updateCredential('awsAccessKeyId', value)}
                      placeholder="AKIA..."
                    />
                  </div>
                )}
                {requiredCredentials?.awsSecretAccessKey && (
                  <div>
                    <Text className="text-sm mb-1">AWS Secret Access Key</Text>
                    <TextInput
                      type="password"
                      value={destroyCredentials.awsSecretAccessKey}
                      onValueChange={(value) => updateCredential('awsSecretAccessKey', value)}
                      placeholder="Secret key"
                    />
                  </div>
                )}
                {requiredCredentials?.fastlyApiToken && (
                  <div>
                    <Text className="text-sm mb-1">Fastly API Token</Text>
                    <TextInput
                      type="password"
                      value={destroyCredentials.fastlyApiToken}
                      onValueChange={(value) => updateCredential('fastlyApiToken', value)}
                      placeholder="Fastly token"
                    />
                  </div>
                )}
                <div>
                  <Text className="text-sm mb-1">AWS Region</Text>
                  <Select
                    value={destroyCredentials.awsRegion}
                    onValueChange={(value) => updateCredential('awsRegion', value)}
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

          {/* Confirmation messages */}
          {(!hasSavedCreds || !useSavedCreds) && (
            <Text className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {needsManualCredentials ? 'Using manual credentials' : 'Using environment variables'}
            </Text>
          )}

          {/* Confirm input */}
          <div>
            <Text className="text-sm mb-1">Type "DESTROY" to confirm</Text>
            <TextInput
              value={confirmText}
              onValueChange={(value) => setConfirmText(value.toUpperCase())}
              placeholder="DESTROY"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={onCancel} variant="secondary">
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={isConfirmDisabled} color="red" icon={Trash2}>
              Confirm Destroy
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
