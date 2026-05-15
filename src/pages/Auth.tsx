import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2 } from 'lucide-react';
import MountainMark from '@/components/visual/MountainMark';
import SectionEyebrow from '@/components/visual/SectionEyebrow';
import PullQuote from '@/components/visual/PullQuote';
import heroFarm from '@/assets/hero-farm.jpg';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useAuth } from '@/contexts/AuthContext';

const schema = z.object({
  email: z.string().trim().email('Invalid email').max(255),
  password: z.string().min(8, 'Min 8 characters').max(72),
});

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingVerify, setPendingVerify] = useState(false);
  const [otp, setOtp] = useState('');

  const from = (location.state as any)?.from || '/';

  useEffect(() => {
    if (!loading && session) navigate(from, { replace: true });
  }, [loading, session, from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.functions.invoke('signup-with-verification', {
          body: { email, password, display_name: displayName },
        });
        if (error) throw new Error((data as any)?.error || error.message);
        if ((data as any)?.error) throw new Error((data as any).error);
        setPendingVerify(true);
        toast.success('Check your email for a 6-digit verification code.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (code: string) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-email-otp', {
        body: { email, code },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;
      toast.success('Email verified. Welcome to Boundless.');
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
      setOtp('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('signup-with-verification', {
        body: { email, password, display_name: displayName },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('New code sent.');
    } catch (err: any) {
      toast.error(err.message || 'Could not resend code');
    } finally {
      setSubmitting(false);
    }
  };

  const friendlyOAuthError = (err: unknown): string => {
    const raw =
      (err as any)?.message ??
      (typeof err === 'string' ? err : '') ??
      '';
    const msg = String(raw).toLowerCase();

    if (!navigator.onLine) {
      return "You appear to be offline. Check your connection and try again.";
    }
    if (msg.includes('popup') && (msg.includes('closed') || msg.includes('blocked'))) {
      return 'The Google sign-in window was closed before finishing. Please try again.';
    }
    if (msg.includes('cancel') || msg.includes('access_denied') || msg.includes('denied')) {
      return 'Google sign-in was cancelled.';
    }
    if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('fetch')) {
      return 'Network error reaching Google. Please check your connection and retry.';
    }
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return 'Google sign-in timed out. Please try again.';
    }
    if (msg.includes('redirect') || msg.includes('redirect_uri')) {
      return "Sign-in configuration issue (redirect URL). Please contact support if this persists.";
    }
    if (msg.includes('invalid') && msg.includes('client')) {
      return 'Google sign-in is misconfigured. Please contact support.';
    }
    if (msg.includes('rate') || msg.includes('429')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (msg.includes('email') && msg.includes('exists')) {
      return 'An account with this email already exists. Try signing in with email & password instead.';
    }
    return "We couldn't complete Google sign-in. Please try again.";
  };

  const handleGoogle = async () => {
    if (!navigator.onLine) {
      toast.error("You're offline. Please check your connection and try again.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result?.redirected) return; // browser is navigating to Google
      if (result?.error) {
        toast.error(friendlyOAuthError(result.error));
        return;
      }
      // Tokens received — AuthContext listener will navigate.
    } catch (err) {
      console.error('[Auth] Google sign-in error:', err);
      toast.error(friendlyOAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: cinematic panel */}
      <aside className="relative hidden lg:flex overflow-hidden">
        <img
          src={heroFarm}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/40 via-background/60 to-background" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <img
            src="/boundless-logo-light.png"
            alt="Boundless Farm"
            className="h-16 lg:h-20 w-auto max-w-[240px] object-contain self-start"
          />
          <div className="space-y-6 max-w-md">
            <SectionEyebrow>It's time to pursue</SectionEyebrow>
            <h2 className="h-display text-4xl xl:text-5xl text-foreground">
              A life that feels<br />
              <span className="font-serif-italic font-normal normal-case tracking-normal text-primary">
                like yours
              </span>
            </h2>
            <PullQuote
              quote="Invest in you. It may be the best investment that you ever make."
              attribution="Jessica Sullivan"
            />
          </div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Live a Boundless Life
          </p>
        </div>
      </aside>

      {/* Right: form */}
      <div className="flex items-center justify-center px-4 py-10 lg:py-0">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8 lg:hidden">
            <img src="/boundless-logo-light.png" alt="Boundless Farm" className="h-16 w-auto" />
          </div>

          <div className="mb-6">
            <SectionEyebrow>{mode === 'signup' ? 'Begin the journey' : 'Welcome back'}</SectionEyebrow>
            <h2 className="h-display text-3xl mt-3">
              {mode === 'signup' ? 'Create your account' : 'Sign in to continue'}
            </h2>
          </div>

          <Card className="border-border/80 rounded-3xl bg-card/60 backdrop-blur shadow-elevated">
            <CardContent className="pt-6">
              {pendingVerify ? (
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <h3 className="h-display text-xl">Check your email</h3>
                    <p className="text-sm text-muted-foreground">
                      We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(v) => {
                        setOtp(v);
                        if (v.length === 6) handleVerify(v);
                      }}
                      disabled={submitting}
                    >
                      <InputOTPGroup>
                        {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="premium"
                      className="w-full font-bold rounded-full h-11 uppercase tracking-[0.18em]"
                      disabled={submitting || otp.length !== 6}
                      onClick={() => handleVerify(otp)}
                    >
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Verify email
                    </Button>
                    <div className="flex justify-between text-xs">
                      <button type="button" className="text-muted-foreground hover:text-foreground"
                        onClick={() => { setPendingVerify(false); setOtp(''); }} disabled={submitting}>
                        ← Use different email
                      </button>
                      <button type="button" className="text-primary hover:underline"
                        onClick={handleResend} disabled={submitting}>
                        Resend code
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="mb-4">
                    <TabsList className="grid grid-cols-2 w-full rounded-full">
                      <TabsTrigger value="signin" className="rounded-full">Sign in</TabsTrigger>
                      <TabsTrigger value="signup" className="rounded-full">Sign up</TabsTrigger>
                    </TabsList>
                    <TabsContent value="signin" />
                    <TabsContent value="signup" />
                  </Tabs>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    {mode === 'signup' && (
                      <div>
                        <Label htmlFor="name" className="text-[11px] font-bold uppercase tracking-[0.18em]">Name</Label>
                        <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                          className="rounded-xl mt-1" placeholder="Your name" />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-[0.18em]">Email</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="rounded-xl mt-1" required />
                    </div>
                    <div>
                      <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-[0.18em]">Password</Label>
                      <Input id="password" type="password" value={password}
                        onChange={(e) => setPassword(e.target.value)} className="rounded-xl mt-1" required minLength={8} />
                    </div>
                    <Button
                      type="submit"
                      variant="premium"
                      className="w-full font-bold rounded-full h-11 uppercase tracking-[0.18em]"
                      disabled={submitting}
                    >
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {mode === 'signup' ? 'Create account' : 'Sign in'}
                    </Button>
                  </form>

                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-[0.22em]">
                      <span className="bg-card px-3 text-muted-foreground">or</span>
                    </div>
                  </div>
                  <Button variant="outline" type="button" className="w-full font-bold rounded-full h-11 uppercase tracking-[0.18em]"
                    onClick={handleGoogle} disabled={submitting}>
                    Continue with Google
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
