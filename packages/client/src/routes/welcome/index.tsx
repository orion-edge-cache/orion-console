import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Text } from '@tremor/react';
import { WelcomeWizard } from './-WelcomeWizard';
import { useSystemState } from '../../hooks';

export const Route = createFileRoute('/welcome/')({
  component: WelcomePage,
});

function WelcomePage() {
  const navigate = useNavigate();
  const { state, isLoading } = useSystemState();

  // Redirect to dashboard if infrastructure is already deployed
  useEffect(() => {
    if (isLoading) return;

    if (state === 'ACTIVE' || state === 'DEGRADED') {
      navigate({ to: '/dashboard' });
    }
  }, [state, isLoading, navigate]);

  // Show loading while checking state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh">
        <div className="text-center">
          <Loader2
            className="w-8 h-8 animate-spin mx-auto mb-4"
            style={{ color: 'var(--color-accent)' }}
          />
          <Text style={{ color: 'var(--color-text-secondary)' }}>
            Checking system status...
          </Text>
        </div>
      </div>
    );
  }

  // Show loading while redirecting (ACTIVE/DEGRADED states)
  if (state === 'ACTIVE' || state === 'DEGRADED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: 'var(--color-accent)' }}
        />
      </div>
    );
  }

  // IDLE, DEPLOYING, DESTROYING, BACKEND_DOWN - show wizard
  return <WelcomeWizard />;
}
