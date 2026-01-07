import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Card, Title, Text, Flex } from "@tremor/react";

interface QuickActionCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: "emerald" | "cyan" | "blue" | "amber";
}

const colorMap = {
  emerald: "bg-emerald-100 text-emerald-600",
  cyan: "bg-cyan-100 text-cyan-600",
  blue: "bg-blue-100 text-blue-600",
  amber: "bg-amber-100 text-amber-600",
};

export function QuickActionCard({
  to,
  icon,
  title,
  description,
  accentColor,
}: QuickActionCardProps) {
  return (
    <Link to={to}>
      <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
        <Flex alignItems="start" justifyContent="between" className="mb-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[accentColor]}`}
          >
            {icon}
          </div>
          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1 text-slate-400" />
        </Flex>
        <Title className="text-base font-semibold mb-1">{title}</Title>
        <Text className="text-sm">{description}</Text>
      </Card>
    </Link>
  );
}
