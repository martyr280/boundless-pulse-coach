import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Bell, MessageCircle, Send, Clock, Loader2, History } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const NudgesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [gratitude, setGratitude] = useState(true);
  const [habits, setHabits] = useState(true);
  const [steps, setSteps] = useState(true);
  const [hour, setHour] = useState(9);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [recentNudges, setRecentNudges] = useState<any[]>([]);

  useEffect(() => {
    loadNudgeLog();
  }, []);

  const loadNudgeLog = async () => {
    const { data } = await supabase
      .from('nudge_log')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(10);
    if (data) setRecentNudges(data);
  };

  const savePrefs = async () => {
    if (!phone.trim()) {
      toast.error('Phone number is required (e.g. +15551234567)');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('nudge-engine', {
        body: {
          mode: 'save_prefs',
          phone_number: phone,
          display_name: name,
          nudge_enabled: enabled,
          gratitude_reminder: gratitude,
          habit_reminder: habits,
          step_reminder: steps,
          preferred_hour: hour,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || (error as any)?.message || 'Failed to save');
        return;
      }
      toast.success('Nudge preferences saved!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const sendTestNudge = async () => {
    if (!phone.trim()) {
      toast.error('Save your phone number first');
      return;
    }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('nudge-engine', {
        body: { mode: 'test' },
      });
      if (!error && (data as any)?.success) {
        toast.success('Test nudge sent via WhatsApp!');
        loadNudgeLog();
      } else {
        toast.error((data as any)?.error || 'Failed to send test nudge');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to send test nudge');
    } finally {
      setTesting(false);
    }
  };

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:00 ${ampm}`;
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 text-muted-foreground mb-4 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center gap-2 mb-1">
        <MessageCircle className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-black uppercase tracking-wider">Nudges</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        WhatsApp reminders to keep you on track with your Boundless life.
      </p>

      {/* Phone & Name */}
      <Card className="border border-border rounded-3xl mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Your Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1 block">
              WhatsApp Number
            </label>
            <Input
              placeholder="+15551234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-2xl"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1 block">
              Name (optional)
            </label>
            <Input
              placeholder="Your first name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-2xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Nudge Types */}
      <Card className="border border-border rounded-3xl mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notification Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">All Nudges</p>
              <p className="text-xs text-muted-foreground">Master toggle</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="border-t border-border pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">🙏 Gratitude</p>
                <p className="text-xs text-muted-foreground">"What are you grateful for today?"</p>
              </div>
              <Switch checked={gratitude} onCheckedChange={setGratitude} disabled={!enabled} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">💪 Best Self Habits</p>
                <p className="text-xs text-muted-foreground">"Have you completed your habits?"</p>
              </div>
              <Switch checked={habits} onCheckedChange={setHabits} disabled={!enabled} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">🚶 Step Count</p>
                <p className="text-xs text-muted-foreground">"How are your steps looking?"</p>
              </div>
              <Switch checked={steps} onCheckedChange={setSteps} disabled={!enabled} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferred Time */}
      <Card className="border border-border rounded-3xl mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Preferred Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold">Daily nudge at</span>
            <span className="text-lg font-black text-primary">{formatHour(hour)}</span>
          </div>
          <Slider
            value={[hour]}
            min={6}
            max={22}
            step={1}
            onValueChange={([v]) => setHour(v)}
            disabled={!enabled}
          />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>6 AM</span>
            <span>10 PM</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3 mb-8">
        <Button className="w-full font-bold rounded-2xl h-12 uppercase tracking-wider" onClick={savePrefs} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
          Save Preferences
        </Button>
        <Button
          variant="outline"
          className="w-full font-bold rounded-2xl h-12 uppercase tracking-wider"
          onClick={sendTestNudge}
          disabled={testing || !phone}
        >
          {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Send Test Nudge
        </Button>
      </div>

      {/* Recent Nudges */}
      {recentNudges.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
            <History className="h-4 w-4" />
            Recent Nudges
          </h2>
          <div className="space-y-2">
            {recentNudges.map((n) => (
              <Card key={n.id} className="border border-border rounded-2xl">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-primary uppercase">{n.nudge_type}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.sent_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-foreground">{n.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NudgesPage;
