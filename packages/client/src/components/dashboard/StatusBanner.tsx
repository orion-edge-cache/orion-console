import { Copy, Check } from "lucide-react";
import { Card, Text, Grid } from "@tremor/react";
import { useState } from "react";

interface StatusBannerProps {
  cdnUrl: string;
  graphqlEndpoint?: string;
}

export function StatusBanner({ cdnUrl, graphqlEndpoint }: StatusBannerProps) {
  const [cdnCopied, setCdnCopied] = useState(false);
  const [graphqlCopied, setGraphqlCopied] = useState(false);

  const handleCopyCdn = async () => {
    await navigator.clipboard.writeText(`https://${cdnUrl}/graphql`);
    setCdnCopied(true);
    setTimeout(() => setCdnCopied(false), 2000);
  };

  const handleCopyGraphql = async () => {
    if (graphqlEndpoint) {
      await navigator.clipboard.writeText(graphqlEndpoint);
      setGraphqlCopied(true);
      setTimeout(() => setGraphqlCopied(false), 2000);
    }
  };

  return (
    <Card className="mb-8 bg-white">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="status-dot status-dot-success status-dot-pulse" />
          <Text className="font-medium text-emerald-700">
            Infrastructure Active
          </Text>
        </div>

        <Grid numItemsMd={2} className="gap-4">
          <div>
            <Text className="text-xs text-slate-500 mb-1">CDN Endpoint</Text>
            <div className="flex items-center gap-2">
              <Text className="font-mono text-sm text-slate-600 flex-1 truncate">
                https://{cdnUrl}/graphql
              </Text>
              <button
                onClick={handleCopyCdn}
                className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                title={cdnCopied ? "Copied!" : "Copy to clipboard"}
              >
                {cdnCopied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-500" />
                )}
              </button>
            </div>
          </div>

          {graphqlEndpoint && (
            <div>
              <Text className="text-xs text-slate-500 mb-1">GraphQL Endpoint</Text>
              <div className="flex items-center gap-2">
                <Text className="font-mono text-sm text-slate-600 flex-1 truncate">
                  {graphqlEndpoint}
                </Text>
                <button
                  onClick={handleCopyGraphql}
                  className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                  title={graphqlCopied ? "Copied!" : "Copy to clipboard"}
                >
                  {graphqlCopied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </div>
            </div>
          )}
        </Grid>
      </div>
    </Card>
  );
}
