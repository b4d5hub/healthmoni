import { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Heart, Thermometer, Activity, TrendingUp } from 'lucide-react';
import { Reading } from '@/lib/device-context';

interface ReportChartsProps {
  readings: Reading[];
  period: string;
}

export interface ReportChartsHandle {
  getChartsAsCanvas: () => Promise<HTMLCanvasElement[]>;
}

function buildTimeSeriesData(readings: Reading[], period: string) {
  const now = Date.now();
  const ms = period === '24h' ? 86400000 : period === '7d' ? 604800000 : 2592000000;
  const filtered = readings.filter(r => r.timestamp > now - ms);

  // Downsample for chart clarity
  const step = Math.max(1, Math.floor(filtered.length / 48));
  return filtered
    .filter((_, i) => i % step === 0)
    .map(r => ({
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      heartRate: r.heartRate,
      temperature: r.temperature,
      hrv: r.hrv,
    }));
}

function buildDistributionData(readings: Reading[]) {
  const buckets: Record<string, number> = {
    '<60': 0, '60-70': 0, '70-80': 0, '80-90': 0, '90-100': 0, '>100': 0,
  };
  readings.forEach(r => {
    if (r.heartRate < 60) buckets['<60']++;
    else if (r.heartRate < 70) buckets['60-70']++;
    else if (r.heartRate < 80) buckets['70-80']++;
    else if (r.heartRate < 90) buckets['80-90']++;
    else if (r.heartRate <= 100) buckets['90-100']++;
    else buckets['>100']++;
  });
  return Object.entries(buckets).map(([range, count]) => ({ range, count }));
}

const chartCard = "rounded-xl border border-border bg-card p-4 shadow-card";

const ReportCharts = forwardRef<ReportChartsHandle, ReportChartsProps>(
  ({ readings, period }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const tsData = useMemo(() => buildTimeSeriesData(readings, period), [readings, period]);
    const distData = useMemo(() => buildDistributionData(readings), [readings]);

    useImperativeHandle(ref, () => ({
      getChartsAsCanvas: async () => {
        if (!containerRef.current) return [];
        const svgs = containerRef.current.querySelectorAll('.recharts-wrapper svg');
        const canvases: HTMLCanvasElement[] = [];
        for (const svg of Array.from(svgs)) {
          const canvas = document.createElement('canvas');
          const rect = svg.getBoundingClientRect();
          canvas.width = rect.width * 2;
          canvas.height = rect.height * 2;
          const ctx = canvas.getContext('2d')!;
          ctx.scale(2, 2);
          const data = new XMLSerializer().serializeToString(svg);
          const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => { ctx.drawImage(img, 0, 0); URL.revokeObjectURL(url); resolve(); };
            img.onerror = reject;
            img.src = url;
          });
          canvases.push(canvas);
        }
        return canvases;
      },
    }));

    if (tsData.length < 2) return null;

    return (
      <div ref={containerRef} className="mb-6 grid gap-3 grid-cols-1 sm:grid-cols-2">
        {/* Row 1: Heart Rate trend + Temperature trend */}
        <div className={chartCard}>
          <div className="mb-2 flex items-center gap-2">
            <Heart className="h-4 w-4 text-destructive" />
            <span className="text-xs font-semibold text-foreground">Heart Rate Trend</span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tsData}>
                <defs>
                  <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} domain={[50, 120]} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11, border: '1px solid hsl(var(--border))' }} />
                <ReferenceLine y={60} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="heartRate" stroke="hsl(0, 84%, 60%)" strokeWidth={2} fill="url(#hrGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={chartCard}>
          <div className="mb-2 flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-secondary" />
            <span className="text-xs font-semibold text-foreground">Temperature Trend</span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tsData}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} domain={[35.5, 40]} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11, border: '1px solid hsl(var(--border))' }} />
                <ReferenceLine y={38} stroke="hsl(0, 84%, 60%)" strokeDasharray="4 4" label={{ value: 'Fever', fontSize: 9, fill: 'hsl(0, 84%, 60%)' }} />
                <Area type="monotone" dataKey="temperature" stroke="hsl(var(--secondary))" strokeWidth={2} fill="url(#tempGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: HRV trend + HR Distribution */}
        <div className={chartCard}>
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-success" />
            <span className="text-xs font-semibold text-foreground">HRV Trend</span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tsData}>
                <defs>
                  <linearGradient id="hrvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} domain={[10, 80]} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11, border: '1px solid hsl(var(--border))' }} />
                <Area type="monotone" dataKey="hrv" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#hrvGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={chartCard}>
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Heart Rate Distribution</span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11, border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }
);

ReportCharts.displayName = 'ReportCharts';
export default ReportCharts;
