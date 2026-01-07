import { Badge } from '@tremor/react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface VerificationBadgeProps {
  tested: boolean;
  testing: boolean;
  valid: boolean;
}

export function VerificationBadge({ tested, testing, valid }: VerificationBadgeProps) {
  if (testing) {
    return (
      <Badge icon={Loader2} color="slate" size="sm">
        Verifying...
      </Badge>
    );
  }

  if (!tested) {
    return null;
  }

  return (
    <Badge
      icon={valid ? CheckCircle : XCircle}
      color={valid ? 'emerald' : 'red'}
      size="sm"
    >
      {valid ? 'Verified' : 'Failed'}
    </Badge>
  );
}
