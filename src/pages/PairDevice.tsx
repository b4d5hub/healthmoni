import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, CheckCircle, Loader2, Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useDevice } from '@/lib/device-context';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';

export default function PairDevice() {
  const [step, setStep] = useState<'scan' | 'pairing' | 'success'>('scan');
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>('qr-reader-' + Math.random().toString(36).slice(2));
  const { pairDevice } = useDevice();
  const navigate = useNavigate();

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore
      }
    }
    scannerRef.current = null;
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => { });
      }
    };
  }, []);

  const startScanner = async () => {
    setCameraError('');
    try {
      const scanner = new Html5Qrcode(containerRef.current);
      scannerRef.current = scanner;
      setScanning(true);

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1,
        },
        (decodedText) => {
          // QR scanned successfully
          stopScanner();
          let serial = decodedText;
          try {
            const parsed = JSON.parse(decodedText);
            if (parsed.serial) serial = parsed.serial;
          } catch {
            // Use raw text as serial
          }
          handlePair(serial);
        },
        () => {
          // scan failure - ignore, keep scanning
        }
      );
    } catch (err: any) {
      setScanning(false);
      const msg = err?.message || String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setCameraError('Camera permission denied. Please allow camera access and try again.');
      } else if (msg.includes('NotFoundError') || msg.includes('no camera')) {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not start camera. Try manual entry instead.');
      }
    }
  };

  const handlePair = async (serial?: string) => {
    try {
      await stopScanner();
      setStep('pairing');
      console.log('Starting pairing for serial:', serial);
      await pairDevice(serial || `VS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
      setStep('success');
      toast.success('Device paired successfully!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: any) {
      console.error('Pairing error:', err);
      setStep('scan');
      toast.error(err.message || 'Pairing failed. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-md py-12">
        {step === 'scan' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary/10">
              <QrCode className="h-10 w-10 text-secondary" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Pair Your Device</h1>
            <p className="mb-8 text-sm text-muted-foreground">
              Scan the QR code on your VitalSync device, or enter the code manually.
            </p>

            {/* Camera view */}
            <div className="relative mx-auto mb-6 aspect-square max-w-xs overflow-hidden rounded-2xl border-2 border-secondary/40 bg-muted">
              <div id={containerRef.current} className="h-full w-full" />

              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center">
                    {cameraError ? (
                      <>
                        <CameraOff className="mx-auto mb-2 h-8 w-8 text-destructive" />
                        <p className="text-xs text-destructive px-4">{cameraError}</p>
                      </>
                    ) : (
                      <>
                        <Camera className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Tap below to open camera</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Corner guides */}
              <div className="pointer-events-none absolute left-4 top-4 h-8 w-8 border-l-2 border-t-2 border-secondary rounded-tl-lg" />
              <div className="pointer-events-none absolute right-4 top-4 h-8 w-8 border-r-2 border-t-2 border-secondary rounded-tr-lg" />
              <div className="pointer-events-none absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-secondary rounded-bl-lg" />
              <div className="pointer-events-none absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-secondary rounded-br-lg" />
            </div>

            {!scanning ? (
              <Button className="mb-4 w-full rounded-full" onClick={startScanner}>
                <Camera className="mr-2 h-4 w-4" />
                Open Camera & Scan
              </Button>
            ) : (
              <Button variant="outline" className="mb-4 w-full rounded-full" onClick={stopScanner}>
                <CameraOff className="mr-2 h-4 w-4" />
                Stop Camera
              </Button>
            )}

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">or enter manually</span></div>
            </div>

            <div className="flex gap-2">
              <Input placeholder="e.g. VS-ABC123" value={manualCode} onChange={e => setManualCode(e.target.value)} className="text-center font-mono" />
              <Button variant="outline" className="rounded-full" onClick={() => handlePair(manualCode)} disabled={!manualCode}>
                Pair
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'pairing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-secondary" />
            <h2 className="text-xl font-bold text-foreground">Pairing device…</h2>
            <p className="mt-2 text-sm text-muted-foreground">Validating and linking to your account</p>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-success" />
            <h2 className="text-xl font-bold text-foreground">Device Paired!</h2>
            <p className="mt-2 text-sm text-muted-foreground">Redirecting to dashboard…</p>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
