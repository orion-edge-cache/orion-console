/**
 * Root Index Route - Smart Router
 *
 * Routes based on SystemState from /api/status:
 * - BACKEND_DOWN → Show connection error screen with retry
 * - IDLE → Redirect to /welcome
 * - DEPLOYING/DESTROYING → Show operation overlay
 * - ACTIVE/DEGRADED → Redirect to /dashboard/overview
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Loader2, Rocket, Trash2 } from 'lucide-react';
import { Button, Card, Text, Title } from '@tremor/react';
import { useSystemState } from '../hooks';

export const Route = createFileRoute('/')({
  component: IndexPage,
});

function IndexPage() {
  const navigate = useNavigate();
  const {
    state,
    isLoading,
    refetch,
    isRefetching,
    currentOperation,
  } = useSystemState({ refetchInterval: 3000 });

  // Handle routing based on state
  useEffect(() => {
    if (isLoading) return;

    switch (state) {
      case 'IDLE':
        navigate({ to: '/welcome' });
        break;
      case 'ACTIVE':
      case 'DEGRADED':
        navigate({ to: '/dashboard' });
        break;
      // DEPLOYING, DESTROYING, CHECKING, BACKEND_DOWN handled by UI below
    }
  }, [state, isLoading, navigate]);

  // Loading state
  if (isLoading || state === 'CHECKING') {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-mesh"
      >
        <div className="text-center">
          <Loader2
            className="w-8 h-8 animate-spin mx-auto mb-4"
            style={{ color: 'var(--color-accent)' }}
          />
          <Text style={{ color: 'var(--color-text-secondary)' }}>Checking system status...</Text>
        </div>
      </div>
    );
  }

  // Connection error - show error screen
  if (state === 'BACKEND_DOWN') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-mesh">
        <Card className="max-w-md w-full p-8 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'var(--color-error-muted)' }}
          >
            <AlertCircle className="w-8 h-8" style={{ color: 'var(--color-error)' }} />
          </div>
          <Title className="font-display text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Connection Error
          </Title>
          <Text className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Unable to connect to the Orion backend server. Make sure the server is running.
          </Text>
          <div
            className="rounded-lg p-4 mb-6 text-left"
            style={{ background: 'var(--color-bg-tertiary)' }}
          >
            <Text
              className="text-xs font-mono mb-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Try running:
            </Text>
            <code
              className="text-sm font-mono"
              style={{ color: 'var(--color-text-primary)' }}
            >
              npm run dev:backend
            </code>
          </div>
          <Button
            onClick={() => refetch()}
            disabled={isRefetching}
            icon={isRefetching ? Loader2 : RefreshCw}
            loading={isRefetching}
            className="w-full"
          >
            {isRefetching ? 'Checking...' : 'Retry Connection'}
          </Button>
        </Card>
      </div>
    );
  }

  // Deploying overlay
  if (state === 'DEPLOYING') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-8"
        style={{ background: 'var(--color-bg-primary)' }}
      >
        <div className="max-w-lg w-full text-center">
          <div className="mx-auto mb-6 animate-pulse">
            <img
              src="/assets/logos/orion-symbol.png"
              alt="Orion"
              className="w-20 h-20"
            />
          </div>
          <Title className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Deploying Infrastructure
          </Title>
          <Text className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {currentOperation === 'repair'
              ? 'Repairing infrastructure...'
              : 'Setting up your GraphQL edge cache...'}
          </Text>
          <div className="flex items-center justify-center gap-2" style={{ color: 'var(--color-accent)' }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">This may take a few minutes</span>
          </div>
        </div>
      </div>
    );
  }

  // Destroying overlay
  if (state === 'DESTROYING') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-8"
        style={{ background: 'var(--color-bg-primary)' }}
      >
        <div className="max-w-lg w-full text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse"
            style={{ background: 'var(--color-error)' }}
          >
            <Trash2 className="w-10 h-10 text-white" />
          </div>
          <Title className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Destroying Infrastructure
          </Title>
          <Text className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Removing all deployed resources...
          </Text>
          <div className="flex items-center justify-center gap-2" style={{ color: 'var(--color-error)' }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">This may take a few minutes</span>
          </div>
        </div>
      </div>
    );
  }

  // Fallback loading state (waiting for navigation)
  return (
    <div className="min-h-screen flex items-center justify-center bg-mesh">
      <Loader2
        className="w-8 h-8 animate-spin"
        style={{ color: 'var(--color-accent)' }}
      />
    </div>
  );
}
