import { Text, Badge } from "@tremor/react";

interface ResourceRowProps {
  label: string;
  value?: string;
  provider: "AWS" | "Fastly";
}

export function ResourceRow({ label, value, provider }: ResourceRowProps) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-slate-50">
      <div>
        <Text className="text-xs text-slate-500 mb-0.5">{label}</Text>
        <Text className="font-mono text-sm truncate max-w-[280px]">
          {value || "N/A"}
        </Text>
      </div>
      <Badge color={provider === "AWS" ? "amber" : "rose"} size="sm">
        {provider}
      </Badge>
    </div>
  );
}
