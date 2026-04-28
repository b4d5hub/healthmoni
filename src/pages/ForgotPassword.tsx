import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Mail, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      toast.success('Reset link sent!');
    } catch {
      toast.error('Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <Heart className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">LifePulse</span>
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <Mail className="h-6 w-6 text-success" />
            </div>
            <h1 className="mb-2 text-xl font-bold text-foreground">Check your email</h1>
            <p className="mb-6 text-sm text-muted-foreground">We sent a reset link to {email}</p>
            <Button variant="outline" className="rounded-full" asChild>
              <Link to="/login"><ArrowLeft className="mr-2 h-4 w-4" /> Back to login</Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-2xl font-bold text-foreground">Reset password</h1>
            <p className="mb-8 text-sm text-muted-foreground">Enter your email and we'll send a reset link</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@example.com" className="pl-10" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <Button type="submit" className="w-full rounded-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send Reset Link
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-secondary hover:underline">Back to login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
