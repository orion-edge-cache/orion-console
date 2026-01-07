import { useState } from "react";
import { ArrowRight, Info, Loader2 } from "lucide-react";
import { Card, Title, Text, Flex } from "@tremor/react";

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: "emerald" | "cyan" | "blue" | "amber" | "red" | "purple";
  onClick: () => void;
  loading?: boolean;
  tooltip?: string[];
}

const colorMap = {
  emerald: "bg-emerald-100 text-emerald-600",
  cyan: "bg-cyan-100 text-cyan-600",
  blue: "bg-blue-100 text-blue-600",
  amber: "bg-amber-100 text-amber-600",
  red: "bg-red-100 text-red-600",
  purple: "bg-purple-100 text-purple-600",
};

export function ActionCard({
  icon,
  title,
  description,
  accentColor,
  onClick,
  loading,
  tooltip,
}: ActionCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <Card
      className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 relative"
      onClick={loading ? undefined : onClick}
    >
      <Flex alignItems="start" justifyContent="between" className="mb-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[accentColor]}`}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
        </div>
        <div className="flex items-center gap-1">
          {tooltip && (
            <div
              className="relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
              {showTooltip && (
                <div className="absolute right-0 top-6 z-50 w-72 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl">
                  <ul className="space-y-1.5">
                    {tooltip.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-slate-400 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="absolute -top-1.5 right-2 w-3 h-3 bg-slate-800 rotate-45" />
                </div>
              )}
            </div>
          )}
          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1 text-slate-400" />
        </div>
      </Flex>
      <Title className="text-base font-semibold mb-1">{title}</Title>
      <Text className="text-sm">{description}</Text>
    </Card>
  );
}
