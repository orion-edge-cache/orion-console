import { Card, Text, Grid } from '@tremor/react';
import { Server, Cloud, Database, Archive, Globe, FolderOpen, Settings, Lock, Shield } from 'lucide-react';
import { ResourceCard } from './ResourceCard';

interface Services {
  cdn?: string;
  compute?: string;
  kinesis?: string;
  s3?: string;
  configstore?: string;
  secretstore?: string;
  iamRole?: string;
}

interface DemoApp {
  deployed: boolean;
  lambda?: string;
  clientBucket?: string;
  graphqlEndpoint?: string;
}

interface ResourcesGridProps {
  services: Services;
  demoApp?: DemoApp;
}

export function ResourcesGrid({ services, demoApp }: ResourcesGridProps) {
  return (
    <div className="space-y-6">
      <Card>
        <Text className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          Orion Infrastructure
        </Text>
        <Grid numItemsSm={1} numItemsMd={2} className="gap-4">
          <ResourceCard
            icon={<Server className="w-5 h-5" />}
            label="CDN Service"
            value={services.cdn || 'N/A'}
            provider="fastly"
            link={services.cdn ? `https://${services.cdn}` : undefined}
          />
          <ResourceCard
            icon={<Cloud className="w-5 h-5" />}
            label="Compute Service"
            value={services.compute || 'N/A'}
            provider="fastly"
            link={services.compute ? `https://manage.fastly.com/compute/services` : undefined}
          />
          <ResourceCard
            icon={<Database className="w-5 h-5" />}
            label="Kinesis Stream"
            value={services.kinesis || 'N/A'}
            provider="aws"
            link={services.kinesis ? `https://console.aws.amazon.com/kinesis/home` : undefined}
          />
          <ResourceCard
            icon={<Archive className="w-5 h-5" />}
            label="S3 Bucket"
            value={services.s3 || 'N/A'}
            provider="aws"
            link={services.s3 ? `https://s3.console.aws.amazon.com/s3/buckets/${services.s3}` : undefined}
          />
          <ResourceCard
            icon={<Settings className="w-5 h-5" />}
            label="Config Store"
            value={services.configstore || 'N/A'}
            provider="fastly"
            link={services.configstore ? `https://manage.fastly.com/resources/config-stores` : undefined}
          />
          <ResourceCard
            icon={<Lock className="w-5 h-5" />}
            label="Secret Store"
            value={services.secretstore || 'N/A'}
            provider="fastly"
            link={services.secretstore ? `https://manage.fastly.com/resources/secret-stores` : undefined}
          />
          <ResourceCard
            icon={<Shield className="w-5 h-5" />}
            label="IAM Role"
            value={services.iamRole || 'N/A'}
            provider="aws"
            link={services.iamRole ? `https://console.aws.amazon.com/iam/home#/roles/${services.iamRole}` : undefined}
          />
        </Grid>
      </Card>

      {demoApp?.deployed && (
        <Card>
          <Text className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Demo App Resources
          </Text>
          <Grid numItemsSm={1} numItemsMd={2} className="gap-4">
            <ResourceCard
              icon={<Cloud className="w-5 h-5" />}
              label="Lambda Function"
              value={demoApp.lambda || 'N/A'}
              provider="aws"
              link={demoApp.lambda ? `https://console.aws.amazon.com/lambda/home#/functions/${demoApp.lambda}` : undefined}
            />
            <ResourceCard
              icon={<FolderOpen className="w-5 h-5" />}
              label="Client S3 Bucket"
              value={demoApp.clientBucket || 'N/A'}
              provider="aws"
              link={demoApp.clientBucket ? `https://s3.console.aws.amazon.com/s3/buckets/${demoApp.clientBucket}` : undefined}
            />
            <ResourceCard
              icon={<Globe className="w-5 h-5" />}
              label="GraphQL Endpoint"
              value={demoApp.graphqlEndpoint || 'N/A'}
              provider="aws"
              link={demoApp.graphqlEndpoint}
            />
          </Grid>
        </Card>
      )}
    </div>
  );
}
