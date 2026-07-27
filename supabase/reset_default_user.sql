-- Finora password reset helper
-- Use only in Supabase SQL Editor if you need to restore the default login.

update public.finora_users
set password_hash = extensions.crypt('atavaraj', extensions.gen_salt('bf')),
    recovery_hash = extensions.crypt('finora-recovery-2026', extensions.gen_salt('bf')),
    failed_attempts = 0,
    locked_until = null,
    updated_at = now()
where username = 'jaravata';

update public.finora_sessions
set revoked_at = now()
where user_id = (select id from public.finora_users where username = 'jaravata')
  and revoked_at is null;
