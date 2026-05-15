## Plan: Grant admin role to marty.reed01@gmail.com

User found in `profiles`: id `570d9e29-7a53-4a19-877d-1cf98b3ee7eb`.

### Action
Run a single insert against `public.user_roles`:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('570d9e29-7a53-4a19-877d-1cf98b3ee7eb', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

This grants the `admin` app_role, unlocking admin-only routes/policies (framework content, audit log, user_roles management, etc.). No code changes needed.