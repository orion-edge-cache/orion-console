/**
 * Orion Layout
 *
 * Clean, modern app shell with frosted glass sidebar.
 * Brand: Navy (#1f395f) + Cyan (#63c9d6)
 */

import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  BarChart3,
  Play,
  FileCode,
  ScrollText,
  Server,
  ExternalLink
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/dashboard/playground', label: 'Playground', icon: Play },
  { path: '/dashboard/configure', label: 'Rules', icon: FileCode },
  { path: '/dashboard/logs', label: 'Logs', icon: ScrollText },
  { path: '/dashboard/infrastructure', label: 'Infrastructure', icon: Server },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <div className="flex h-screen" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Sidebar - Glass effect */}
      <aside
        className="w-64 flex flex-col border-r"
        style={{
          background: 'var(--glass-bg-strong)',
          backdropFilter: 'blur(var(--glass-blur))',
          WebkitBackdropFilter: 'blur(var(--glass-blur))',
          borderColor: 'var(--color-border-default)'
        }}
      >
        {/* Logo */}
        <div
          className="p-5 border-b"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <img
              src="/assets/logos/orion-symbol.png"
              alt="Orion"
              className="w-10 h-10"
            />
            <div>
              <h1 className="font-display text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Orion
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                GraphQL Edge Cache
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/dashboard'
              ? currentPath === '/dashboard' || currentPath === '/dashboard/'
              : currentPath.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="p-4 border-t"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Orion v1.0
            </span>
            <a
              href="https://github.com/orion"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs transition-colors hover:underline"
              style={{ color: 'var(--color-accent)' }}
            >
              Docs
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content - with mesh gradient for glassmorphism refraction */}
      <main className="flex-1 overflow-auto bg-mesh">
        {children}
      </main>
    </div>
  );
}
