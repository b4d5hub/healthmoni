import { useMemo, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useDevice } from '@/lib/device-context';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

export default function History() {
  const { readings } = useDevice();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const daySummary = useMemo(() => {
    if (!selectedDate || !readings.length) return null;
    const dayStart = new Date(selectedDate).setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate).setHours(23, 59, 59, 999);
    const dayReadings = readings.filter(r => r.timestamp >= dayStart && r.timestamp <= dayEnd);
    if (!dayReadings.length) return null;

    const hrs = dayReadings.map(r => r.heartRate);
    const temps = dayReadings.map(r => r.temperature);
    return {
      count: dayReadings.length,
      minHr: Math.min(...hrs),
      maxHr: Math.max(...hrs),
      avgHr: Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length),
      minTemp: Math.min(...temps),
      maxTemp: Math.max(...temps),
      avgTemp: parseFloat((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)),
    };
  }, [readings, selectedDate]);

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold text-foreground">History</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="mx-auto" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
          </h3>
          {daySummary ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{daySummary.count} readings</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Min HR', value: `${daySummary.minHr} BPM` },
                  { label: 'Max HR', value: `${daySummary.maxHr} BPM` },
                  { label: 'Avg HR', value: `${daySummary.avgHr} BPM` },
                  { label: 'Min Temp', value: `${daySummary.minTemp}°C` },
                  { label: 'Max Temp', value: `${daySummary.maxTemp}°C` },
                  { label: 'Avg Temp', value: `${daySummary.avgTemp}°C` },
                ].map(item => (
                  <div key={item.label} className="rounded-xl bg-muted p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-mono text-lg font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data available for this date.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
