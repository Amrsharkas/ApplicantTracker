import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  onClick?: () => void;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

// Gradient mappings for different color variants
const gradientMap: Record<string, string> = {
  "bg-blue-500": "from-blue-500 via-blue-600 to-blue-700",
  "bg-emerald-500": "from-emerald-500 via-emerald-600 to-emerald-700",
  "bg-purple-500": "from-purple-500 via-purple-600 to-purple-700",
  "bg-amber-500": "from-amber-500 via-amber-600 to-amber-700",
  "bg-rose-500": "from-rose-500 via-rose-600 to-rose-700",
  "bg-indigo-500": "from-indigo-500 via-indigo-600 to-indigo-700",
  "bg-cyan-500": "from-cyan-500 via-cyan-600 to-cyan-700",
  "bg-pink-500": "from-pink-500 via-pink-600 to-pink-700",
};

// Icon glow effects for different colors
const glowMap: Record<string, string> = {
  "bg-blue-500": "shadow-blue-500/50",
  "bg-emerald-500": "shadow-emerald-500/50",
  "bg-purple-500": "shadow-purple-500/50",
  "bg-amber-500": "shadow-amber-500/50",
  "bg-rose-500": "shadow-rose-500/50",
  "bg-indigo-500": "shadow-indigo-500/50",
  "bg-cyan-500": "shadow-cyan-500/50",
  "bg-pink-500": "shadow-pink-500/50",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  color,
  onClick,
  trend,
  className,
}: StatCardProps) {
  const gradient = gradientMap[color] || "from-slate-500 via-slate-600 to-slate-700";
  const glow = glowMap[color] || "shadow-slate-500/50";

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn("cursor-pointer group", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-white via-white to-slate-50/50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900/50 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300/80 dark:hover:border-slate-600/80 shadow-md hover:shadow-2xl transition-all duration-300">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025] pointer-events-none bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />

        {/* Animated border glow effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-slate-200/20 dark:via-slate-600/20 to-transparent blur-sm" />
        </div>

        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <motion.p
                className="text-sm font-medium text-slate-600 dark:text-slate-400 tracking-wide uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {title}
              </motion.p>
              <motion.p
                className="text-4xl font-bold bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 dark:from-slate-100 dark:via-slate-200 dark:to-slate-300 bg-clip-text text-transparent mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {typeof value === "number" ? value.toLocaleString() : value}
              </motion.p>
              {trend && (
                <motion.div
                  className="flex items-center mt-3 gap-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <span
                    className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      trend.isPositive
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                    )}
                  >
                    {trend.isPositive ? "+" : "-"}
                    {Math.abs(trend.value)}%
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-500 font-medium">
                    vs last week
                  </span>
                </motion.div>
              )}
            </div>

            {/* Icon with gradient background and glow */}
            <motion.div
              className={cn(
                "relative p-4 rounded-2xl bg-gradient-to-br shadow-lg group-hover:shadow-xl transition-all duration-300",
                gradient,
                glow
              )}
              whileHover={{ rotate: [0, -5, 5, -5, 0], scale: 1.05 }}
              transition={{ duration: 0.4 }}
            >
              {/* Icon glow effect */}
              <div className={cn(
                "absolute inset-0 rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition-opacity duration-300 bg-gradient-to-br",
                gradient
              )} />
              <Icon className="w-7 h-7 text-white relative z-10 drop-shadow-lg" strokeWidth={2.5} />
            </motion.div>
          </div>
        </CardContent>

        {/* Bottom gradient accent line */}
        <div className={cn(
          "h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          gradient
        )} />
      </Card>
    </motion.div>
  );
}
