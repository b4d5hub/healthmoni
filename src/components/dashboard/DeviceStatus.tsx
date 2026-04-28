import { Battery, BatteryLow, Wifi, Clock, Heart } from 'lucide-react';
import { useDevice } from '@/lib/device-context';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';

export default function DeviceStatus() {
  const { device } = useDevice();
  const navigate = useNavigate();

  if (!device) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center shadow-card">
        <div className="flex h-full flex-col items-center justify-center p-6 text-center">
          <Heart className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <h3 className="mb-2 font-semibold text-foreground">No Device Paired</h3>
          <p className="mb-4 text-sm text-muted-foreground">Scan the QR code on your LifePulse device to start monitoring.</p>
          <Button onClick={() => navigate('/dashboard/pair')} className="rounded-full shadow-sm">
            Pair Device
          </Button>
        </div>
      </div>
    );
  }

  const battery = Math.round(device.batteryLevel);
  const BatteryIcon = battery < 20 ? BatteryLow : Battery;
  const lastSync = new Date(device.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">Device Status</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Wifi className="h-4 w-4 text-success" />
            <span>Connected</span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{device.serialNumber}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <BatteryIcon className={`h-4 w-4 ${battery < 20 ? 'text-destructive' : battery < 50 ? 'text-warning' : 'text-success'}`} />
            <span>Battery</span>
          </div>
          <span className="font-mono text-sm font-medium text-foreground">{battery}%</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Last Sync</span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{lastSync}</span>
        </div>
      </div>
    </div>
  );
}
