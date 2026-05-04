import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mountain, Loader2 } from 'lucide-react';
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
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: displayName || email.split('@')[0] },
          },
        });
        if (error) throw error;
        toast.success('Account created! Signing you in…');
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-6">
          <Mountain className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-black uppercase tracking-widest">Boundless</h1>
        </div>

        <Card className="border-2 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-center text-lg font-extrabold">Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="mb-4">
              <TabsList className="grid grid-cols-2 w-full rounded-2xl">
                <TabsTrigger value="signin" className="rounded-2xl">Sign in</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-2xl">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" />
              <TabsContent value="signup" />
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div>
                  <Label htmlFor="name" className="text-xs font-bold">Name</Label>
                  <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                    className="rounded-2xl" placeholder="Your name" />
                </div>
              )}
              <div>
                <Label htmlFor="email" className="text-xs font-bold">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="rounded-2xl" required />
              </div>
              <div>
                <Label htmlFor="password" className="text-xs font-bold">Password</Label>
                <Input id="password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)} className="rounded-2xl" required minLength={8} />
              </div>
              <Button type="submit" className="w-full font-bold rounded-2xl h-11" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === 'signup' ? 'Create account' : 'Sign in'}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <Button variant="outline" type="button" className="w-full font-bold rounded-2xl h-11"
              onClick={handleGoogle} disabled={submitting}>
              Continue with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
