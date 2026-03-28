import { useMemo } from 'react';
import { Heart, Thermometer, Activity, Zap, AlertTriangle, TrendingUp } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import VitalCard from '@/components/dashboard/VitalCard';
import VitalsChart from '@/components/dashboard/VitalsChart';
import DeviceStatus from '@/components/dashboard/DeviceStatus';
import HealthInsights from '@/components/dashboard/HealthInsights';
import { useDevice } from '@/lib/device-context';
import { useAuth } from '@/lib/auth-context';

export default function Dashboard() {
  const { user } = useAuth();
  const { device, latestReading, readings } = useDevice();

  const stats = useMemo(() => {
    if (!readings.length) return null;
    const last20 = readings.slice(-20);
    const hrs = last20.map(r => r.heartRate);
    const avgHr = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length);
    const trend = hrs.length > 1 ? (hrs[hrs.length - 1] > hrs[hrs.length - 2] ? 'up' : hrs[hrs.length - 1] < hrs[hrs.length - 2] ? 'down' : 'steady') : 'steady';

    // Simulated resting HR from "night" readings
    const nightReadings = readings.filter(r => {
      const h = new Date(r.timestamp).getHours();
      return h >= 22 || h < 6;
    });
    const restingHr = nightReadings.length
      ? Math.round(nightReadings.map(r => r.heartRate).reduce((a, b) => a + b, 0) / nightReadings.length)
      : 62;

    const allHrs = readings.map(r => r.heartRate);
    const allTemps = readings.map(r => r.temperature);
    const wellnessScore = Math.min(100, Math.max(0, Math.round(
      80 + (restingHr < 70 ? 10 : 0) - (latestReading && latestReading.temperature > 37.5 ? 20 : 0) + (latestReading ? (latestReading.hrv > 40 ? 10 : 0) : 0)
    )));

    return {
      avgHr,
      trend: trend as 'up' | 'down' | 'steady',
      restingHr,
      wellnessScore,
      minHr: Math.min(...allHrs),
      maxHr: Math.max(...allHrs),
      minTemp: Math.min(...allTemps),
      maxTemp: Math.max(...allTemps),
      avgTemp: parseFloat((allTemps.reduce((a, b) => a + b, 0) / allTemps.length).toFixed(1)),
      hasFever: latestReading ? latestReading.temperature >= 38.0 : false,
    };
  }, [readings, latestReading]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {device ? 'Here\'s your health overview' : 'Pair a device to start monitoring'}
        </p>
      </div>

      {!device ? (
        <DeviceStatus />
      ) : (
        <div className="space-y-6">
          {/* Main vitals */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <VitalCard
              title="Heart Rate"
              value={latestReading?.heartRate ?? '--'}
              unit="BPM"
              icon={Heart}
              trend={stats?.trend}
              trendValue={stats?.trend === 'up' ? '+3 BPM' : stats?.trend === 'down' ? '-2 BPM' : 'Stable'}
              color="secondary"
              large
              animate
            />
            <VitalCard
              title="Temperature"
              value={latestReading?.temperature ?? '--'}
              unit="°C"
              icon={Thermometer}
              color={stats?.hasFever ? 'destructive' : 'primary'}
              trend={stats?.hasFever ? 'up' : 'steady'}
              trendValue={stats?.hasFever ? 'Elevated' : 'Normal'}
            />
            <VitalCard
              title="HRV"
              value={latestReading?.hrv ?? '--'}
              unit="ms"
              icon={Activity}
              color="success"
              trend="steady"
              trendValue="Good range"
            />
            <VitalCard
              title="Wellness Score"
              value={stats?.wellnessScore ?? '--'}
              unit="/100"
              icon={Zap}
              color={stats && stats.wellnessScore >= 80 ? 'success' : stats && stats.wellnessScore >= 60 ? 'warning' : 'destructive'}
            />
          </div>

          {/* Fever alert */}
          {stats?.hasFever && (
            <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Fever Detected</p>
                <p className="text-xs text-muted-foreground">Current temperature is {latestReading?.temperature}°C – above the 38.0°C threshold.</p>
              </div>
            </div>
          )}

          {/* Health Insights */}
          <HealthInsights />

          {/* Chart */}
          <VitalsChart />

          {/* Bottom row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DeviceStatus />

            {/* Resting HR */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">Resting Heart Rate</h3>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-3xl font-bold text-foreground">{stats?.restingHr}</span>
                <span className="text-sm text-muted-foreground">BPM</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">7-day average (simulated from night readings)</p>
            </div>

            {/* Daily summary */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">Daily Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HR Range</span>
                  <span className="font-mono font-medium text-foreground">{stats?.minHr} – {stats?.maxHr} BPM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg HR</span>
                  <span className="font-mono font-medium text-foreground">{stats?.avgHr} BPM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Temp Range</span>
                  <span className="font-mono font-medium text-foreground">{stats?.minTemp} – {stats?.maxTemp} °C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Temp</span>
                  <span className="font-mono font-medium text-foreground">{stats?.avgTemp} °C</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
