import { Flex, Badge } from '@tremor/react';
import { Key, Settings, Rocket, CheckCircle, ChevronRight } from 'lucide-react';
import type { WizardStep } from '../hooks';

interface ProgressStepsProps {
  currentStep: WizardStep;
}

const steps: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'credentials', label: 'Credentials', icon: <Key className="w-4 h-4" /> },
  { id: 'config', label: 'Configuration', icon: <Settings className="w-4 h-4" /> },
  { id: 'deploy', label: 'Deploy', icon: <Rocket className="w-4 h-4" /> },
];

export function ProgressSteps({ currentStep }: ProgressStepsProps) {
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <Flex justifyContent="between" alignItems="center">
        {steps.map((step, index) => (
          <Flex key={step.id} alignItems="center" className="gap-2">
            <Badge
              icon={index < currentStepIndex ? CheckCircle : undefined}
              color={
                index < currentStepIndex
                  ? 'emerald'
                  : index === currentStepIndex
                    ? 'cyan'
                    : 'slate'
              }
              size="lg"
            >
              <Flex alignItems="center" className="gap-1">
                {index >= currentStepIndex && step.icon}
                {step.label}
              </Flex>
            </Badge>
            {index < steps.length - 1 && (
              <ChevronRight className="w-5 h-5 text-slate-300" />
            )}
          </Flex>
        ))}
      </Flex>
    </div>
  );
}
