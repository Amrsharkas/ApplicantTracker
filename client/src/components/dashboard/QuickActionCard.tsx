import { motion } from "framer-motion";
import { Link } from "wouter";
import { LucideIcon, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  to?: string;
  onClick?: () => void;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline-solid";
  };
  className?: string;
}

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  gradient,
  to,
  onClick,
  badge,
  className,
}: QuickActionCardProps) {
  const content = (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
      className={cn("cursor-pointer group", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-linear-to-br",
        gradient
      )}>
        {/* Animated shimmer effect overlay */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          initial={false}
        >
          <motion.div
            className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          />
        </motion.div>

        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.8),transparent_50%)]" />

        {/* Decorative gradient orbs */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/10 rounded-full blur-2xl" />

        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {/* Icon with enhanced glow and animation */}
              <motion.div
                className="relative p-4 rounded-2xl bg-white/25 backdrop-blur-md border border-white/30 shadow-xl"
                whileHover={{
                  rotate: [0, -8, 8, -8, 0],
                  scale: 1.1,
                }}
                transition={{ duration: 0.5 }}
              >
                {/* Icon glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-white/40 blur-lg opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
                <Icon className="w-7 h-7 text-white relative z-10 drop-shadow-lg" strokeWidth={2.5} />

                {/* Subtle sparkle effect on hover */}
                <motion.div
                  className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100"
                  initial={{ scale: 0 }}
                  whileHover={{ scale: 1, rotate: 180 }}
                  transition={{ duration: 0.3 }}
                >
                  <Sparkles className="w-3 h-3 text-white/80" />
                </motion.div>
              </motion.div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <motion.h3
                    className="font-bold text-white text-lg tracking-tight drop-shadow-md"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    {title}
                  </motion.h3>
                  {badge && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Badge
                        variant={badge.variant || "secondary"}
                        className="bg-white/30 text-white border border-white/40 text-xs font-semibold backdrop-blur-xs shadow-lg hover:bg-white/40 transition-colors duration-200"
                      >
                        {badge.text}
                      </Badge>
                    </motion.div>
                  )}
                </div>
                <motion.p
                  className="text-sm text-white/90 mt-1 font-medium drop-shadow-sm"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {description}
                </motion.p>
              </div>
            </div>

            {/* Animated arrow with enhanced effects */}
            <motion.div
              className="shrink-0 ml-4"
              animate={{
                x: [0, 4, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              <div className="relative p-2 rounded-lg bg-white/20 backdrop-blur-xs border border-white/30 shadow-lg group-hover:bg-white/30 transition-colors duration-300">
                <ArrowRight className="w-5 h-5 text-white drop-shadow-md" strokeWidth={2.5} />
              </div>
            </motion.div>
          </div>
        </CardContent>

        {/* Animated bottom accent line */}
        <motion.div
          className="h-1 bg-linear-to-r from-transparent via-white/50 to-transparent"
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
        />
      </Card>
    </motion.div>
  );

  if (to) {
    return (
      <Link href={to} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return <div onClick={onClick}>{content}</div>;
}
