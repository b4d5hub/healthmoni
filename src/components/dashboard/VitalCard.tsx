import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

interface VitalCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'steady';
  trendValue?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';
  large?: boolean;
  animate?: boolean;
}

const colorMap = {
  primary: 'text-primary bg-primary/10',
  secondary: 'text-secondary bg-secondary/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  destructive: 'text-destructive bg-destructive/10',
};

const trendColors = {
  up: 'text-destructive',
  down: 'text-success',
  steady: 'text-muted-foreground',
};

export default function VitalCard({ title, value, unit, icon: Icon, trend, trendValue, color = 'primary', large, animate }: VitalCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorMap[color]}`}>
          <Icon className={`h-4 w-4 ${animate ? 'animate-heartbeat' : ''}`} />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-mono font-bold text-foreground ${large ? 'text-4xl' : 'text-2xl'}`}>
          {value}
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      {trend && (
        <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${trendColors[trend]}`}>
          <TrendIcon className="h-3 w-3" />
          <span>{trendValue}</span>
        </div>
      )}
    </motion.div>
  );
}
