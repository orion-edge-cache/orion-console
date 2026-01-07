import { Card, Title, Text, Button } from '@tremor/react';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

export function SuccessStep() {
  const navigate = useNavigate();

  return (
    <Card className="text-center">
      <div className="py-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <Title className="font-display text-2xl font-bold mb-2">
          You're all set!
        </Title>
        <Text className="mb-8">
          Your GraphQL edge cache is now deployed and ready to use.
        </Text>
        <Button size="lg" onClick={() => navigate({ to: '/dashboard' })}>
          Enter Dashboard
        </Button>
      </div>
    </Card>
  );
}
