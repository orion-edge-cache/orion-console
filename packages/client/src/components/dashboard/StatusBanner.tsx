import { ExternalLink } from "lucide-react";
import { Card, Text, Button } from "@tremor/react";

interface StatusBannerProps {
  cdnUrl: string;
}

export function StatusBanner({ cdnUrl }: StatusBannerProps) {
  return (
    <Card className="mb-8 bg-emerald-50 border-emerald-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="status-dot status-dot-success status-dot-pulse" />
          <div>
            <Text className="font-medium text-emerald-700">
              Infrastructure Active
            </Text>
            <Text className="font-mono text-sm text-slate-600">
              {cdnUrl}
            </Text>
          </div>
        </div>
        <Button
          variant="light"
          color="emerald"
          icon={ExternalLink}
          iconPosition="right"
          onClick={() => window.open(`https://${cdnUrl}/graphql`, "_blank")}
        >
          Open Endpoint
        </Button>
      </div>
    </Card>
  );
}
