import { useState } from 'react';
import { Card, Text, Flex, Button } from '@tremor/react';
import { Terminal, CheckCircle, XCircle, Loader2, AlertTriangle, Download, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import type { CLIDependencyStatus } from '../../../services/cli-dependencies-api';

interface CLIToolStatusCardProps {
  status: CLIDependencyStatus | null;
  isLoading: boolean;
}

const installationLinks = {
  'Fastly CLI': {
    url: 'https://developer.fastly.com/reference/cli/',
    description: 'Fastly Command Line Interface for managing your edge infrastructure'
  },
  'Terraform': {
    url: 'https://developer.hashicorp.com/terraform/install',
    description: 'Infrastructure as Code tool for provisioning AWS resources'
  }
};

export function CLIToolStatusCard({ status, isLoading }: CLIToolStatusCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (isLoading) {
    return (
      <Card className="card animate-fade-in">
        <Flex alignItems="center" className="gap-3">
          <div className="relative">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
            <div className="absolute inset-0 bg-cyan-500 rounded-full opacity-20 animate-pulse" />
          </div>
          <div>
            <Text className="font-medium text-sm">Checking CLI tools...</Text>
            <Text className="text-xs text-slate-500">Verifying Fastly CLI and Terraform</Text>
          </div>
        </Flex>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  if (status.allInstalled) {
    return (
      <Card className="card animate-fade-in">
        <Flex alignItems="center" className="gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <Text className="font-medium text-sm text-emerald-700">All CLI tools verified</Text>
            <Text className="text-xs text-slate-500">Ready to deploy</Text>
          </div>
        </Flex>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {status.dependencies.map((dep) => (
            <div
              key={dep.command}
              className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-600" />
              <div className="flex-1 min-w-0">
                <Text className="text-xs font-medium text-emerald-800 truncate">{dep.name}</Text>
                <Text className="text-[10px] text-emerald-600">{dep.version || 'Installed'}</Text>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const missingTools = status.dependencies.filter((dep) => !dep.installed);

  return (
    <Card className="card animate-fade-in">
      <Flex alignItems="center" className="gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <Text className="font-medium text-sm text-amber-700">
            {missingTools.length} CLI tool{missingTools.length > 1 ? 's' : ''} missing
          </Text>
          <Text className="text-xs text-slate-500">Required for deployment</Text>
        </div>
        <Button
          variant="light"
          size="xs"
          onClick={() => setShowDetails(!showDetails)}
          icon={showDetails ? ChevronUp : ChevronDown}
        >
          {showDetails ? 'Hide' : 'Details'}
        </Button>
      </Flex>

      {showDetails && (
        <div className="space-y-2 mt-3 animate-slide-up">
          {missingTools.map((dep) => {
            const link = installationLinks[dep.name as keyof typeof installationLinks];
            return (
              <div
                key={dep.command}
                className="p-3 rounded-lg bg-white border border-amber-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <Flex alignItems="start" className="gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <XCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Text className="font-medium text-sm text-red-700">{dep.name}</Text>
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-medium">
                        Missing
                      </span>
                    </div>
                    {dep.error && (
                      <Text className="text-xs text-slate-500 mb-2">{dep.error}</Text>
                    )}
                    {link && (
                      <Flex className="gap-2">
                        <Button
                          variant="light"
                          size="xs"
                          icon={Download}
                          onClick={() => window.open(link.url, '_blank')}
                          className="text-amber-600 hover:text-amber-700"
                        >
                          Install
                        </Button>
                        <Button
                          variant="light"
                          size="xs"
                          icon={ExternalLink}
                          onClick={() => window.open(link.url, '_blank')}
                          className="text-slate-500 hover:text-slate-600"
                        >
                          Docs
                        </Button>
                      </Flex>
                    )}
                  </div>
                </Flex>
              </div>
            );
          })}
        </div>
      )}

      {!showDetails && (
        <div className="mt-2 text-center">
          <Button
            variant="light"
            size="xs"
            icon={Download}
            onClick={() => {
              missingTools.forEach(dep => {
                const link = installationLinks[dep.name as keyof typeof installationLinks];
                if (link) window.open(link.url, '_blank');
              });
            }}
            className="text-amber-600 hover:text-amber-700"
          >
            Install Missing Tools
          </Button>
        </div>
      )}
    </Card>
  );
}
