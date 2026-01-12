/**
 * Dashboard Layout Route
 *
 * Parent route for all dashboard child routes.
 * Provides the DashboardLayout wrapper with sidebar navigation.
 * Redirects to /welcome if no infrastructure is deployed.
 */

import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Text } from '@tremor/react';
import { useSystemState } from '../hooks';

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = useNavigate();
  const { state, isLoading } = useSystemState();

  // Redirect to welcome if no infrastructure deployed
  useEffect(() => {
    if (isLoading) return;

    if (state === 'IDLE') {
      navigate({ to: '/welcome' });
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

  // Show loading while redirecting (IDLE state)
  if (state === 'IDLE') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: 'var(--color-accent)' }}
        />
      </div>
    );
  }

  // ACTIVE, DEGRADED, DEPLOYING, DESTROYING, BACKEND_DOWN - show dashboard
  return <Outlet />;
}
