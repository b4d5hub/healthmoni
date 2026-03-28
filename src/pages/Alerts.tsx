import { useMemo } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useDevice } from '@/lib/device-context';
import { AlertTriangle, Heart, Thermometer, CheckCircle } from 'lucide-react';

interface Alert {
  id: string;
  type: 'fever' | 'high_hr' | 'low_hr';
  message: string;
  timestamp: number;
}

export default function Alerts() {
  const { readings } = useDevice();

  const alerts = useMemo<Alert[]>(() => {
    const a: Alert[] = [];
    readings.forEach(r => {
      if (r.temperature >= 38.0) {
        a.push({ id: `fever-${r.timestamp}`, type: 'fever', message: `Fever detected: ${r.temperature}°C`, timestamp: r.timestamp });
      }
      if (r.heartRate > 100) {
        a.push({ id: `hhr-${r.timestamp}`, type: 'high_hr', message: `High heart rate: ${r.heartRate} BPM`, timestamp: r.timestamp });
      }
      if (r.heartRate < 55) {
        a.push({ id: `lhr-${r.timestamp}`, type: 'low_hr', message: `Low heart rate: ${r.heartRate} BPM`, timestamp: r.timestamp });
      }
    });
    return a.reverse().slice(0, 50);
  }, [readings]);

  const iconMap = {
    fever: Thermometer,
    high_hr: Heart,
    low_hr: Heart,
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Alerts</h1>

      {alerts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <CheckCircle className="mx-auto mb-3 h-10 w-10 text-success" />
          <h3 className="text-lg font-semibold text-foreground">All clear</h3>
          <p className="mt-1 text-sm text-muted-foreground">No alerts detected in your readings.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => {
            const Icon = iconMap[alert.type];
            return (
              <div key={alert.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                  <Icon className="h-4 w-4 text-destructive" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
