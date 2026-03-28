import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { useDevice } from '@/lib/device-context';

interface Insight {
  text: string;
  type: 'positive' | 'neutral' | 'warning';
}

export default function HealthInsights() {
  const { readings } = useDevice();

  const insights = useMemo<Insight[]>(() => {
    if (readings.length < 20) return [];

    const now = Date.now();
    const recent = readings.filter(r => r.timestamp > now - 6 * 3600000);
    const older = readings.filter(r => r.timestamp <= now - 6 * 3600000);

    if (!recent.length || !older.length) return [];

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    const recentHr = avg(recent.map(r => r.heartRate));
    const olderHr = avg(older.map(r => r.heartRate));
    const hrChange = ((recentHr - olderHr) / olderHr) * 100;

    const recentTemp = avg(recent.map(r => r.temperature));
    const olderTemp = avg(older.map(r => r.temperature));

    const recentHrv = avg(recent.map(r => r.hrv));
    const olderHrv = avg(older.map(r => r.hrv));
    const hrvChange = ((recentHrv - olderHrv) / olderHrv) * 100;

    const nightReadings = readings.filter(r => {
      const h = new Date(r.timestamp).getHours();
      return h >= 22 || h < 6;
    });
    const restingHr = nightReadings.length ? avg(nightReadings.map(r => r.heartRate)) : null;

    const result: Insight[] = [];

    if (Math.abs(hrChange) > 3) {
      result.push({
        text: hrChange < 0
          ? `Your average heart rate has decreased ${Math.abs(hrChange).toFixed(0)}% recently — a sign of good recovery.`
          : `Your average heart rate is up ${hrChange.toFixed(0)}% compared to earlier today. Consider resting.`,
        type: hrChange < 0 ? 'positive' : 'warning',
      });
    } else {
      result.push({ text: 'Your heart rate has been stable throughout the day.', type: 'neutral' });
    }

    if (Math.abs(hrvChange) > 5) {
      result.push({
        text: hrvChange > 0
          ? `HRV improved by ${hrvChange.toFixed(0)}% — your body is adapting well to stress.`
          : `HRV dropped ${Math.abs(hrvChange).toFixed(0)}%. You may be under-recovered or stressed.`,
        type: hrvChange > 0 ? 'positive' : 'warning',
      });
    }

    if (recentTemp >= 37.8) {
      result.push({ text: `Your recent temperature is ${recentTemp.toFixed(1)}°C — slightly elevated. Monitor closely.`, type: 'warning' });
    } else if (recentTemp < olderTemp - 0.3) {
      result.push({ text: 'Body temperature trending down to normal range — looking good.', type: 'positive' });
    }

    if (restingHr !== null) {
      result.push({
        text: restingHr < 65
          ? `Resting heart rate is ${Math.round(restingHr)} BPM — excellent cardiovascular fitness.`
          : `Resting heart rate is ${Math.round(restingHr)} BPM — within a healthy range.`,
        type: restingHr < 65 ? 'positive' : 'neutral',
      });
    }

    return result.slice(0, 4);
  }, [readings]);

  if (!insights.length) return null;

  const iconMap = { positive: TrendingUp, warning: TrendingDown, neutral: Minus };
  const colorMap = {
    positive: 'text-success',
    warning: 'text-warning',
    neutral: 'text-muted-foreground',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-card"
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Health Insights</h3>
      </div>
      <div className="space-y-3">
        {insights.map((insight, i) => {
          const Icon = iconMap[insight.type];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3"
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${colorMap[insight.type]}`} />
              <p className="text-sm text-muted-foreground leading-relaxed">{insight.text}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
