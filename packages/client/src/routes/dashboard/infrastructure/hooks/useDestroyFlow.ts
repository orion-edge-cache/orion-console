import { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { planDestroy } from '../../../../hooks';
import { API_BASE_URL } from '../../../../utils';

interface DestroyCredentials {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  fastlyApiToken: string;
  awsRegion: string;
}

interface PlanResult {
  resources: Array<{ type: string; name: string; provider: string }>;
  warning: string;
}

export function useDestroyFlow() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Plan state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planResult, setPlanResult] = useState<PlanResult | null>(null);
  const [isPlanningDestroy, setIsPlanningDestroy] = useState(false);

  // Confirm state
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [useSavedCreds, setUseSavedCreds] = useState(true);
  const [destroyCredentials, setDestroyCredentials] = useState<DestroyCredentials>({
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    fastlyApiToken: '',
    awsRegion: 'us-east-1',
  });

  // Destroy state
  const [destroyLogs, setDestroyLogs] = useState<string[]>([]);
  const [isDestroying, setIsDestroying] = useState(false);

  const handlePlanDestroy = useCallback(async () => {
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
  }, []);

  const handleDestroy = useCallback(async (hasSavedCreds: boolean) => {
    if (confirmText !== 'DESTROY') return;

    setIsDestroying(true);
    setDestroyLogs([]);

    try {
      const body = useSavedCreds && hasSavedCreds
        ? { useSavedCredentials: true }
        : destroyCredentials;

      const response = await fetch(`${API_BASE_URL}/infrastructure/destroy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Destroy failed');
      }

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
      setDestroyLogs((prev) => [
        ...prev,
        `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      ]);
    } finally {
      setIsDestroying(false);
    }
  }, [confirmText, useSavedCreds, destroyCredentials, queryClient, navigate]);

  const closePlanModal = useCallback(() => {
    setShowPlanModal(false);
  }, []);

  const proceedFromPlan = useCallback(() => {
    setShowPlanModal(false);
    setShowDestroyConfirm(true);
  }, []);

  const cancelDestroy = useCallback(() => {
    setShowDestroyConfirm(false);
    setConfirmText('');
  }, []);

  const updateDestroyCredential = useCallback((key: keyof DestroyCredentials, value: string) => {
    setDestroyCredentials((prev) => ({ ...prev, [key]: value }));
  }, []);

  return {
    // Plan
    showPlanModal,
    planResult,
    isPlanningDestroy,
    handlePlanDestroy,
    closePlanModal,
    proceedFromPlan,

    // Confirm
    showDestroyConfirm,
    confirmText,
    setConfirmText,
    useSavedCreds,
    setUseSavedCreds,
    destroyCredentials,
    updateDestroyCredential,
    cancelDestroy,

    // Destroy
    destroyLogs,
    isDestroying,
    handleDestroy,
  };
}
