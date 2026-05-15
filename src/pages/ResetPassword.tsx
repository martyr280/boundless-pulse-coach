import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import SectionEyebrow from '@/components/visual/SectionEyebrow';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase recovery links land here with a session in the URL hash.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    if (password !== confirm) return toast.error('Passwords do not match');
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated. You are signed in.');
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Could not update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <SectionEyebrow>Reset password</SectionEyebrow>
          <h2 className="h-display text-3xl mt-3">Choose a new password</h2>
        </div>
        <Card className="border-border/80 rounded-3xl bg-card/60 backdrop-blur shadow-elevated">
          <CardContent className="pt-6">
            {!ready ? (
              <p className="text-sm text-muted-foreground">
                This page must be opened from the password reset link in your email.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-[0.18em]">New password</Label>
                  <Input id="password" type="password" value={password}
                    onChange={(e) => setPassword(e.target.value)} className="rounded-xl mt-1" required minLength={8} />
                </div>
                <div>
                  <Label htmlFor="confirm" className="text-[11px] font-bold uppercase tracking-[0.18em]">Confirm password</Label>
                  <Input id="confirm" type="password" value={confirm}
                    onChange={(e) => setConfirm(e.target.value)} className="rounded-xl mt-1" required minLength={8} />
                </div>
                <Button type="submit" variant="premium"
                  className="w-full font-bold rounded-full h-11 uppercase tracking-[0.18em]"
                  disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Update password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
