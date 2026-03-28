import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Thermometer, Activity, Shield, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Heart, title: 'Heart Rate Monitoring', desc: 'Continuous BPM tracking with trend analysis and resting heart rate insights.' },
  { icon: Thermometer, title: 'Temperature Tracking', desc: 'Precise body temperature monitoring with fever detection alerts.' },
  { icon: Activity, title: 'HRV Analysis', desc: 'Heart rate variability metrics for stress and recovery assessment.' },
  { icon: Shield, title: 'Smart Alerts', desc: 'Customizable thresholds with instant notifications when vitals need attention.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Heart className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">VitalSync</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild><Link to="/login">Sign in</Link></Button>
            <Button asChild><Link to="/signup">Get Started</Link></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 gradient-hero opacity-[0.03]" />
        <div className="container relative mx-auto px-4 py-24 md:py-36">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-card">
              <Zap className="h-3.5 w-3.5 text-secondary" />
              Real-time health intelligence
            </div>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Your health, <span className="text-gradient">always in sync</span>
            </h1>
            <p className="mb-10 text-lg text-muted-foreground md:text-xl">
              VitalSync continuously monitors your heart rate and body temperature, delivering real-time insights and intelligent alerts to keep you and your care team informed.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="gap-2 rounded-full px-8" asChild>
                <Link to="/signup">Start Monitoring <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
                <Link to="/login">View Demo Dashboard</Link>
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mx-auto mt-20 grid max-w-2xl grid-cols-3 gap-8 text-center"
          >
            {[
              { value: '24/7', label: 'Monitoring' },
              { value: '<3s', label: 'Alert Latency' },
              { value: '99.8%', label: 'Accuracy' },
            ].map(s => (
              <div key={s.label}>
                <div className="font-mono text-3xl font-bold text-foreground">{s.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/50 py-24">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-foreground">Comprehensive Health Intelligence</h2>
            <p className="mt-3 text-muted-foreground">Everything you need to stay on top of your vitals.</p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
                  <f.icon className="h-5 w-5 text-secondary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-md rounded-2xl gradient-primary p-10 shadow-elevated">
            <Heart className="mx-auto mb-4 h-10 w-10 text-primary-foreground animate-heartbeat" />
            <h2 className="mb-3 text-2xl font-bold text-primary-foreground">Ready to sync?</h2>
            <p className="mb-6 text-sm text-primary-foreground/80">Pair your device in under 30 seconds.</p>
            <Button size="lg" variant="secondary" className="rounded-full px-8" asChild>
              <Link to="/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto flex items-center justify-between px-4 text-sm text-muted-foreground">
          <span>© 2026 VitalSync. All rights reserved.</span>
          <div className="flex gap-4">
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
