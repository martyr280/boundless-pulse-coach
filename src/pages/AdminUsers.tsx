import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import SectionEyebrow from '@/components/visual/SectionEyebrow';
import { toast } from 'sonner';
import { Loader2, Plus, X, Search } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  roles: AppRole[];
}

const ALL_ROLES: AppRole[] = ['member', 'coach', 'admin'];

const ROLE_VARIANTS: Record<AppRole, { className: string }> = {
  admin:  { className: 'bg-primary text-primary-foreground' },
  coach:  { className: 'bg-secondary text-secondary-foreground' },
  member: { className: 'bg-muted text-muted-foreground' },
};

type SortKey = 'created_at' | 'last_sign_in_at' | 'email' | 'display_name';

export default function AdminUsers() {
  const { session, user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const list = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        method: 'GET',
      });
      if (error) throw error;
      return (data?.users ?? []) as AdminUser[];
    },
    enabled: !!session,
    staleTime: 30_000,
  });

  const mutate = useMutation({
    mutationFn: async (input: { op: 'add_role' | 'remove_role'; user_id: string; role: AppRole }) => {
      const { data, error } = await supabase.functions.invoke('admin-users', { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (e: any) => toast.error(e?.message ?? 'Update failed'),
  });

  const filtered = useMemo(() => {
    const rows = list.data ?? [];
    const q = search.trim().toLowerCase();
    let out = rows.filter((u) => {
      if (roleFilter !== 'all' && !u.roles.includes(roleFilter)) return false;
      if (!q) return true;
      return (
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.display_name ?? '').toLowerCase().includes(q)
      );
    });
    out = [...out].sort((a, b) => {
      const av = (a[sortKey] ?? '') as string;
      const bv = (b[sortKey] ?? '') as string;
      if (av === bv) return 0;
      return (av < bv ? -1 : 1) * (sortDir === 'asc' ? 1 : -1);
    });
    return out;
  }, [list.data, search, roleFilter, sortKey, sortDir]);

  const paged = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="space-y-8 py-10">
      <header>
        <SectionEyebrow>Admin · Users</SectionEyebrow>
        <h1 className="h-display text-3xl mt-2">Manage Users & Roles</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {list.data?.length ?? 0} users in Boundless. Assign or revoke member, coach, and admin roles.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">All users</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search email or name…"
                className="pl-8 w-64"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as any); setPage(0); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : list.error ? (
            <p className="text-sm text-destructive">Failed to load users: {(list.error as any)?.message}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('display_name')}>User</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('email')}>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('created_at')}>Joined</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('last_sign_in_at')}>Last sign-in</TableHead>
                    <TableHead className="w-40">Add role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((u) => {
                    const missing = ALL_ROLES.filter((r) => !u.roles.includes(r));
                    const isSelf = u.id === user?.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="font-medium">
                            {u.display_name || <span className="text-muted-foreground italic">No name</span>}
                            {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                          </div>
                          {!u.email_confirmed_at && (
                            <div className="text-xs text-amber-600">Email not verified</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{u.email ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length === 0 && <span className="text-xs text-muted-foreground">none</span>}
                            {u.roles.map((r) => (
                              <Badge key={r} className={`${ROLE_VARIANTS[r].className} gap-1 pr-1`}>
                                {r}
                                <button
                                  type="button"
                                  className="ml-1 rounded p-0.5 hover:bg-background/20 disabled:opacity-50"
                                  disabled={mutate.isPending || (isSelf && r === 'admin')}
                                  onClick={() => {
                                    if (isSelf && r === 'admin') return;
                                    if (!confirm(`Remove ${r} role from ${u.email ?? u.id}?`)) return;
                                    mutate.mutate({ op: 'remove_role', user_id: u.id, role: r },
                                      { onSuccess: () => toast.success(`Removed ${r}`) });
                                  }}
                                  title={isSelf && r === 'admin' ? 'Cannot remove your own admin role' : 'Remove role'}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmt(u.created_at)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmt(u.last_sign_in_at)}</TableCell>
                        <TableCell>
                          {missing.length === 0 ? (
                            <span className="text-xs text-muted-foreground">all assigned</span>
                          ) : (
                            <Select
                              value=""
                              onValueChange={(v) => {
                                mutate.mutate({ op: 'add_role', user_id: u.id, role: v as AppRole },
                                  { onSuccess: () => toast.success(`Added ${v}`) });
                              }}
                            >
                              <SelectTrigger className="h-8 w-32">
                                <SelectValue placeholder="+ add role" />
                              </SelectTrigger>
                              <SelectContent>
                                {missing.map((r) => (
                                  <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {paged.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                        No users match.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {pageCount > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-muted-foreground">
                    Page {page + 1} of {pageCount} · {filtered.length} users
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                    <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
