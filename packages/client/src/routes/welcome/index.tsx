import { createFileRoute } from '@tanstack/react-router';
import { WelcomeWizard } from './WelcomeWizard';

export const Route = createFileRoute('/welcome/')({
  component: WelcomePage,
});

function WelcomePage() {
  return <WelcomeWizard />;
}
