import { Card, Text, Badge, Button } from '@tremor/react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

interface SystemHealthCardProps {
  deployed: boolean;
}

export function SystemHealthCard({ deployed }: SystemHealthCardProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <Text className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        System Health
      </Text>
      <div className="flex items-center gap-4 flex-wrap">
        {deployed ? (
          <>
            <Badge icon={CheckCircle} color="emerald" size="lg">
              Infrastructure Active
            </Badge>
            <Text className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Terraform state: Deployed
            </Text>
          </>
        ) : (
          <>
            <Badge icon={XCircle} color="slate" size="lg">
              Not Deployed
            </Badge>
            <Button variant="light" onClick={() => navigate({ to: '/welcome' })}>
              Deploy now
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
