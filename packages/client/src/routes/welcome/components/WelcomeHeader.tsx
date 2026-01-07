import { Title, Text } from '@tremor/react';

export function WelcomeHeader() {
  return (
    <div
      className="border-b"
      style={{
        background: 'var(--glass-bg-strong)',
        backdropFilter: 'blur(var(--glass-blur))',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      <div className="max-w-3xl mx-auto px-6 py-6">
        <div className="flex items-center gap-4">
          <img
            src="/assets/logos/orion-symbol.png"
            alt="Orion"
            className="w-12 h-12"
          />
          <div>
            <Title
              className="font-display text-2xl font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Welcome to Orion
            </Title>
            <Text style={{ color: 'var(--color-text-secondary)' }}>
              Let's set up your GraphQL edge cache
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
