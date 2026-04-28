import { useState, useEffect } from 'react';
import { Heart, Download, Share, Smartphone, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl gradient-primary shadow-lg">
            <Heart className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Install LifePulse</h1>
          <p className="mt-2 text-muted-foreground">
            Add LifePulse to your home screen for the best experience — instant access, offline support, and native app feel.
          </p>
        </div>

        {isInstalled ? (
          <div className="rounded-2xl border border-success/30 bg-success/5 p-6">
            <CheckCircle className="mx-auto h-10 w-10 text-success" />
            <p className="mt-3 font-medium text-foreground">Already installed!</p>
            <p className="mt-1 text-sm text-muted-foreground">Open LifePulse from your home screen.</p>
          </div>
        ) : deferredPrompt ? (
          <Button size="lg" className="w-full gap-2" onClick={handleInstall}>
            <Download className="h-5 w-5" /> Install App
          </Button>
        ) : isIOS ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-left space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" /> Install on iPhone / iPad
            </h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                <span>Tap the <Share className="inline h-4 w-4 text-primary" /> <strong>Share</strong> button in Safari</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
                <span>Tap <strong>"Add"</strong> to install LifePulse</span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 text-left space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" /> Install on Android
            </h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                <span>Tap the browser menu (⋮)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                <span>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></span>
              </li>
            </ol>
          </div>
        )}

        <Link to="/" className="inline-block text-sm text-primary hover:underline">
          ← Back to VitalSync
        </Link>
      </div>
    </div>
  );
}
