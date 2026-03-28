import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useDevice } from '@/lib/device-context';
import { Button } from '@/components/ui/button';

type Range = '1h' | '6h' | '24h' | '7d';

export default function VitalsChart() {
  const { readings } = useDevice();
  const [range, setRange] = useState<Range>('24h');
  const [metric, setMetric] = useState<'heartRate' | 'temperature'>('heartRate');

  const filtered = useMemo(() => {
    const now = Date.now();
    const ms: Record<Range, number> = {
      '1h': 3600000,
      '6h': 21600000,
      '24h': 86400000,
      '7d': 604800000,
    };
    return readings
      .filter(r => r.timestamp > now - ms[range])
      .map(r => ({
        ...r,
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
  }, [readings, range]);

  const color = metric === 'heartRate' ? 'hsl(184, 100%, 35%)' : 'hsl(213, 53%, 23%)';

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={metric === 'heartRate' ? 'default' : 'outline'}
            className="rounded-full text-xs"
            onClick={() => setMetric('heartRate')}
          >
            Heart Rate
          </Button>
          <Button
            size="sm"
            variant={metric === 'temperature' ? 'default' : 'outline'}
            className="rounded-full text-xs"
            onClick={() => setMetric('temperature')}
          >
            Temperature
          </Button>
        </div>
        <div className="flex gap-1">
          {(['1h', '6h', '24h', '7d'] as Range[]).map(r => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? 'default' : 'ghost'}
              className="rounded-full text-xs px-3"
              onClick={() => setRange(r)}
            >
              {r}
            </Button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filtered}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 92%)" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" tickLine={false} domain={metric === 'heartRate' ? [50, 120] : [35.5, 40]} />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid hsl(214, 20%, 92%)',
                boxShadow: '0 4px 12px hsl(0 0% 0% / 0.08)',
                fontSize: '12px',
              }}
            />
            <Area type="monotone" dataKey={metric} stroke={color} strokeWidth={2} fill="url(#chartGradient)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
