import { createRootRouteWithContext, Outlet, useRouterState } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Button, Text, Title } from '@tremor/react'
import { Layout } from '@/components/Layout'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  const router = useRouterState()
  const currentPath = router.location.pathname

  // Standalone pages (no sidebar): welcome wizard and root router
  const standalonePages = ['/', '/welcome']
  const showLayout = !standalonePages.includes(currentPath)

  return (
    <div className="flex flex-col h-screen">
      {showLayout ? (
        <Layout>
          <Outlet />
        </Layout>
      ) : (
        <Outlet />
      )}
    </div>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-mesh">
      <div className="text-center">
        <Title className="font-display text-6xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          404
        </Title>
        <Text className="text-xl mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          Page not found
        </Text>
        <Button onClick={() => { window.location.href = '/' }}>
          Go Home
        </Button>
      </div>
    </div>
  )
}
