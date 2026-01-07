import { Card, Text, Grid } from '@tremor/react';
import { Server, Cloud, Database, Archive } from 'lucide-react';
import { ResourceCard } from './ResourceCard';

interface Services {
  cdn?: string;
  compute?: string;
  kinesis?: string;
  s3?: string;
}

interface ResourcesGridProps {
  services: Services;
}

export function ResourcesGrid({ services }: ResourcesGridProps) {
  return (
    <Card>
      <Text className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        Deployed Resources
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
      </Grid>
    </Card>
  );
}
