/**
 * Dashboard Layout Route
 *
 * Parent route for all dashboard child routes.
 * Provides the DashboardLayout wrapper with sidebar navigation.
 */

import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
});

function DashboardLayout() {
  return <Outlet />;
}
