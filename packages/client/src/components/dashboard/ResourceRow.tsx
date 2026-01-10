import { Text, Badge } from "@tremor/react";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface ResourceRowProps {
  label: string;
  value?: string;
  provider: "AWS" | "Fastly";
  enableCopy?: boolean;
}

export function ResourceRow({ label, value, provider, enableCopy = false }: ResourceRowProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    if (value) {
      await navigator.clipboard.writeText(value);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-slate-50">
      <div className="flex-1 min-w-0">
        <Text className="text-xs text-slate-500 mb-0.5">{label}</Text>
        <Text className="font-mono text-sm truncate">
          {value || "N/A"}
        </Text>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Badge color={provider === "AWS" ? "amber" : "rose"} size="sm">
          {provider}
        </Badge>
        {enableCopy && value && (
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-slate-200 transition-colors"
            title={copySuccess ? "Copied!" : "Copy to clipboard"}
          >
            {copySuccess ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-slate-500" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
