import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  status?: "default" | "warning" | "danger" | "success";
  className?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, status = "default", className }: StatsCardProps) {
  const statusStyles = {
    default: "bg-card border-border",
    warning: "bg-yellow-950/20 border-yellow-500/30",
    danger: "bg-red-950/20 border-red-500/30",
    success: "bg-green-950/20 border-green-500/30",
  };

  const iconStyles = {
    default: "text-primary",
    warning: "text-yellow-500",
    danger: "text-red-500",
    success: "text-green-500",
  };

  return (
    <div className={cn(
      "p-6 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-primary/5",
      statusStyles[status],
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{title}</p>
          <h3 className="text-2xl font-bold mt-2 font-mono">{value}</h3>
          {trend && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {trend}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-lg bg-background/50", iconStyles[status])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
