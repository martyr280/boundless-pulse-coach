import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CinematicCard from '@/components/visual/CinematicCard';
import SectionEyebrow from '@/components/visual/SectionEyebrow';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, useUpdateProfile, useUserRole } from '@/hooks/useProfile';
import {
  useNudgePreferences,
  useUpsertNudgePreferences,
} from '@/hooks/useNudgePreferences';

const TIMEZONES = (() => {
  // Browser-supported timezones, fallback list if Intl.supportedValuesOf is missing.
  // @ts-ignore - supportedValuesOf is widely available but not in all TS lib targets.
  const supported: string[] | undefined = Intl.supportedValuesOf?.('timeZone');
  return supported ?? [
    'UTC',
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
  ];
})();

const formatHour = (h: number) => {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:00 ${ampm}`;
};

const initialsFor = (name: string | null | undefined, email: string | null | undefined) => {
  const source = (name || email || '').trim();
  if (!source) return '·';
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: role } = useUserRole();
  const { data: nudgePrefs } = useNudgePreferences();
  const updateProfile = useUpdateProfile();
  const upsertNudge = useUpsertNudgePreferences();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Local controlled fields, hydrated from server.
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [hour, setHour] = useState(9);
  const [hydrated, setHydrated] = useState({ profile: false, nudge: false });

  useEffect(() => {
    if (!hydrated.profile && profile) {
      setDisplayName(profile.display_name ?? '');
      setHydrated((s) => ({ ...s, profile: true }));
    }
  }, [profile, hydrated.profile]);

  useEffect(() => {
    if (!hydrated.nudge && nudgePrefs !== undefined) {
      setPhone(nudgePrefs?.phone_number ?? '');
      setHour(nudgePrefs?.preferred_hour ?? 9);
      setHydrated((s) => ({ ...s, nudge: true }));
    }
  }, [nudgePrefs, hydrated.nudge]);

  // Default profile timezone to browser if unset.
  useEffect(() => {
    if (profile && !profile.timezone) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      updateProfile.mutate({ timezone: tz });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const saveDisplayName = async () => {
    const next = displayName.trim();
    if ((profile?.display_name ?? '') === next) return;
    try {
      await updateProfile.mutateAsync({ display_name: next || null });
      toast.success('Name saved', { duration: 1200 });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save name');
    }
  };

  const saveTimezone = async (tz: string) => {
    try {
      await updateProfile.mutateAsync({ timezone: tz });
      toast.success('Timezone saved', { duration: 1200 });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save timezone');
    }
  };

  const savePhone = async () => {
    const next = phone.trim();
    if ((nudgePrefs?.phone_number ?? '') === next) return;
    try {
      await upsertNudge.mutateAsync({
        phone_number: next,
        preferred_hour: hour,
        timezone: profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        nudge_enabled: nudgePrefs?.nudge_enabled ?? true,
      });
      toast.success('Phone saved', { duration: 1200 });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save phone');
    }
  };

  const saveHour = async (h: number) => {
    try {
      await upsertNudge.mutateAsync({
        phone_number: phone.trim() || nudgePrefs?.phone_number || '',
        preferred_hour: h,
        timezone: profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        nudge_enabled: nudgePrefs?.nudge_enabled ?? true,
      });
      toast.success('Time saved', { duration: 1200 });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save nudge time');
    }
  };

  const toggleEnabled = async (val: boolean) => {
    try {
      await upsertNudge.mutateAsync({
        phone_number: phone.trim() || nudgePrefs?.phone_number || '',
        preferred_hour: hour,
        timezone: profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        nudge_enabled: val,
      });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to toggle nudges');
    }
  };

  const handleAvatarFile = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type || `image/${ext}` });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      // Cache-bust so the new image shows immediately.
      const url = `${data.publicUrl}?v=${Date.now()}`;
      await updateProfile.mutateAsync({ avatar_url: url });
      toast.success('Avatar updated');
    } catch (e: any) {
      toast.error(e?.message || 'Could not upload avatar');
    } finally {
      setUploading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member';
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currentTz = profile?.timezone ?? browserTz;

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <header className="space-y-2">
          <SectionEyebrow>YOUR ACCOUNT</SectionEyebrow>
          <h1 className="h-display text-3xl md:text-4xl text-foreground">Profile</h1>
        </header>

        {/* Identity */}
        <section className="space-y-4">
          <SectionEyebrow>YOUR IDENTITY</SectionEyebrow>
          <CinematicCard className="p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative group"
                aria-label="Change avatar"
                disabled={uploading}
              >
                <Avatar className="h-20 w-20 border-2 border-border/60">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
                  <AvatarFallback className="bg-card text-foreground text-xl font-bold uppercase">
                    {initialsFor(profile?.display_name, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute inset-0 rounded-full bg-background/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <Camera className="h-5 w-5 text-primary" />
                  )}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAvatarFile(f);
                    e.target.value = '';
                  }}
                />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Email</p>
                <p className="text-sm text-foreground/90 truncate">{user?.email ?? '—'}</p>
                <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
                  {roleLabel}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground block">
                Display name
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={saveDisplayName}
                placeholder="How should we call you?"
                className="h-11"
              />
            </div>
          </CinematicCard>
        </section>

        {/* Preferences */}
        <section className="space-y-4">
          <SectionEyebrow>PREFERENCES</SectionEyebrow>
          <CinematicCard className="p-6 md:p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground block">
                Timezone
              </label>
              <Select value={currentTz} onValueChange={saveTimezone}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border/40 pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">Daily nudges</p>
                  <p className="text-xs text-muted-foreground">WhatsApp reminders to keep you on track.</p>
                </div>
                <Switch
                  checked={nudgePrefs?.nudge_enabled ?? false}
                  onCheckedChange={toggleEnabled}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground block">
                  WhatsApp number
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={savePhone}
                  placeholder="+15551234567"
                  className="h-11"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Preferred time
                  </label>
                  <span className="text-primary font-bold tabular-nums">{formatHour(hour)}</span>
                </div>
                <Slider
                  value={[hour]}
                  min={0}
                  max={23}
                  step={1}
                  onValueChange={(v) => setHour(v[0])}
                  onValueCommit={(v) => saveHour(v[0])}
                />
              </div>
            </div>
          </CinematicCard>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
