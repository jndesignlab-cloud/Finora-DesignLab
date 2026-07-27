-- Finora by DesignLab — Supabase Edition v2.0.1
-- Run this once in Supabase SQL Editor.
-- Default login seeded by this file:
--   username: jaravata
--   password: atavaraj
-- Default recovery code seeded by this file:
--   finora-recovery-2026
-- Change the password and recovery code after the first successful login.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.finora_users (
  id uuid primary key default extensions.gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9._-]{3,40}$'),
  display_name text not null default 'Finora User',
  password_hash text not null,
  recovery_hash text not null,
  status text not null default 'active' check (status in ('active','disabled')),
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finora_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.finora_users(id) on delete cascade,
  token_hash text not null unique,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  revoked_at timestamptz
);

create table if not exists public.finora_user_state (
  user_id uuid primary key references public.finora_users(id) on delete cascade,
  app_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finora_audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.finora_users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.finora_users enable row level security;
alter table public.finora_sessions enable row level security;
alter table public.finora_user_state enable row level security;
alter table public.finora_audit_logs enable row level security;

revoke all on table public.finora_users from anon, authenticated;
revoke all on table public.finora_sessions from anon, authenticated;
revoke all on table public.finora_user_state from anon, authenticated;
revoke all on table public.finora_audit_logs from anon, authenticated;

grant usage on schema public to anon, authenticated;

create or replace function public.finora_default_state()
returns jsonb
language sql
security definer
set search_path = public, extensions, pg_temp
as $$
  select jsonb_build_object(
    'meta', jsonb_build_object(
      'version', '2.0.1',
      'currency', 'PHP',
      'locale', 'en-PH',
      'theme', 'system',
      'hideBalances', false,
      'updatedAt', now()::text
    ),
    'accounts', jsonb_build_array(
      jsonb_build_object('id', extensions.gen_random_uuid()::text, 'name', 'Cash', 'type', 'wallet', 'institution', '', 'currency', 'PHP', 'openingBalance', 0, 'emoji', '💵', 'color', '#2557ff', 'includeNetWorth', true, 'dueDate', '', 'notes', '', 'createdAt', now()::text),
      jsonb_build_object('id', extensions.gen_random_uuid()::text, 'name', 'Bank Account', 'type', 'bank', 'institution', '', 'currency', 'PHP', 'openingBalance', 0, 'emoji', '🏦', 'color', '#20c8ff', 'includeNetWorth', true, 'dueDate', '', 'notes', '', 'createdAt', now()::text),
      jsonb_build_object('id', extensions.gen_random_uuid()::text, 'name', 'Savings', 'type', 'savings', 'institution', '', 'currency', 'PHP', 'openingBalance', 0, 'emoji', '💎', 'color', '#7b61ff', 'includeNetWorth', true, 'dueDate', '', 'notes', '', 'createdAt', now()::text),
      jsonb_build_object('id', extensions.gen_random_uuid()::text, 'name', 'Credit Card', 'type', 'credit', 'institution', '', 'currency', 'PHP', 'openingBalance', 0, 'emoji', '💳', 'color', '#3142ff', 'includeNetWorth', true, 'dueDate', '', 'notes', '', 'createdAt', now()::text),
      jsonb_build_object('id', extensions.gen_random_uuid()::text, 'name', 'Loan', 'type', 'loan', 'institution', '', 'currency', 'PHP', 'openingBalance', 0, 'emoji', '📄', 'color', '#e5484d', 'includeNetWorth', true, 'dueDate', '', 'notes', '', 'createdAt', now()::text)
    ),
    'transactions', '[]'::jsonb,
    'budgets', '[]'::jsonb,
    'goals', '[]'::jsonb,
    'recurring', '[]'::jsonb,
    'reminders', '[]'::jsonb,
    'settings', jsonb_build_object('showWelcomeTips', true)
  );
$$;

create or replace function public.finora_token_hash(p_token text)
returns text
language sql
security definer
set search_path = public, extensions, pg_temp
as $$
  select encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

create or replace function public.finora_audit(p_user_id uuid, p_action text, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  insert into public.finora_audit_logs(user_id, action, details)
  values (p_user_id, p_action, coalesce(p_details, '{}'::jsonb));
end;
$$;

create or replace function public.finora_user_id_from_session(p_session_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid;
begin
  select s.user_id into v_user_id
  from public.finora_sessions s
  join public.finora_users u on u.id = s.user_id
  where s.token_hash = public.finora_token_hash(p_session_token)
    and s.revoked_at is null
    and s.expires_at > now()
    and u.status = 'active'
  limit 1;

  return v_user_id;
end;
$$;

create or replace function public.finora_login(p_username text, p_password text, p_user_agent text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user public.finora_users%rowtype;
  v_token text;
  v_expires timestamptz;
  v_failed integer;
begin
  select * into v_user
  from public.finora_users
  where username = lower(trim(p_username))
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Invalid username or password.');
  end if;

  if v_user.status <> 'active' then
    perform public.finora_audit(v_user.id, 'login_blocked_disabled', '{}'::jsonb);
    return jsonb_build_object('ok', false, 'message', 'This account is disabled.');
  end if;

  if v_user.locked_until is not null and v_user.locked_until > now() then
    return jsonb_build_object('ok', false, 'message', 'Too many failed attempts. Try again later.');
  end if;

  if extensions.crypt(coalesce(p_password, ''), v_user.password_hash) <> v_user.password_hash then
    v_failed := coalesce(v_user.failed_attempts, 0) + 1;
    update public.finora_users
    set failed_attempts = v_failed,
        locked_until = case when v_failed >= 5 then now() + interval '15 minutes' else null end,
        updated_at = now()
    where id = v_user.id;
    perform public.finora_audit(v_user.id, 'login_failed', jsonb_build_object('failed_attempts', v_failed));
    return jsonb_build_object('ok', false, 'message', case when v_failed >= 5 then 'Account locked for 15 minutes.' else 'Invalid username or password.' end);
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires := now() + interval '30 days';

  insert into public.finora_sessions(user_id, token_hash, user_agent, expires_at)
  values (v_user.id, public.finora_token_hash(v_token), left(coalesce(p_user_agent, ''), 500), v_expires);

  update public.finora_users
  set failed_attempts = 0,
      locked_until = null,
      last_login_at = now(),
      updated_at = now()
  where id = v_user.id;

  insert into public.finora_user_state(user_id, app_data)
  values (v_user.id, public.finora_default_state())
  on conflict (user_id) do nothing;

  perform public.finora_audit(v_user.id, 'login_success', '{}'::jsonb);

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'expiresAt', v_expires,
    'user', jsonb_build_object('id', v_user.id, 'username', v_user.username, 'display_name', v_user.display_name)
  );
end;
$$;

create or replace function public.finora_get_state(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid;
  v_user public.finora_users%rowtype;
  v_state jsonb;
  v_updated timestamptz;
begin
  v_user_id := public.finora_user_id_from_session(p_session_token);
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Invalid or expired session.');
  end if;

  insert into public.finora_user_state(user_id, app_data)
  values (v_user_id, public.finora_default_state())
  on conflict (user_id) do nothing;

  select * into v_user from public.finora_users where id = v_user_id;
  select app_data, updated_at into v_state, v_updated from public.finora_user_state where user_id = v_user_id;

  return jsonb_build_object(
    'ok', true,
    'state', v_state,
    'updatedAt', v_updated,
    'user', jsonb_build_object('id', v_user.id, 'username', v_user.username, 'display_name', v_user.display_name)
  );
end;
$$;

create or replace function public.finora_save_state(p_session_token text, p_state jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid;
begin
  v_user_id := public.finora_user_id_from_session(p_session_token);
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Invalid or expired session.');
  end if;

  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    return jsonb_build_object('ok', false, 'message', 'Invalid app data.');
  end if;

  update public.finora_user_state
  set app_data = p_state,
      updated_at = now()
  where user_id = v_user_id;

  perform public.finora_audit(v_user_id, 'state_saved', jsonb_build_object('size', length(p_state::text)));
  return jsonb_build_object('ok', true, 'updatedAt', now());
end;
$$;

create or replace function public.finora_logout(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid;
begin
  v_user_id := public.finora_user_id_from_session(p_session_token);
  update public.finora_sessions
  set revoked_at = now()
  where token_hash = public.finora_token_hash(p_session_token)
    and revoked_at is null;

  if v_user_id is not null then
    perform public.finora_audit(v_user_id, 'logout', '{}'::jsonb);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.finora_change_password(p_session_token text, p_current_password text, p_new_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid;
  v_user public.finora_users%rowtype;
begin
  v_user_id := public.finora_user_id_from_session(p_session_token);
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Invalid or expired session.');
  end if;

  if length(coalesce(p_new_password, '')) < 8 then
    return jsonb_build_object('ok', false, 'message', 'New password must be at least 8 characters.');
  end if;

  select * into v_user from public.finora_users where id = v_user_id;
  if extensions.crypt(coalesce(p_current_password, ''), v_user.password_hash) <> v_user.password_hash then
    perform public.finora_audit(v_user_id, 'password_change_failed', '{}'::jsonb);
    return jsonb_build_object('ok', false, 'message', 'Current password is incorrect.');
  end if;

  update public.finora_users
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = now()
  where id = v_user_id;

  update public.finora_sessions
  set revoked_at = now()
  where user_id = v_user_id and token_hash <> public.finora_token_hash(p_session_token) and revoked_at is null;

  perform public.finora_audit(v_user_id, 'password_changed', '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.finora_update_recovery_code(p_session_token text, p_current_password text, p_new_recovery_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid;
  v_user public.finora_users%rowtype;
begin
  v_user_id := public.finora_user_id_from_session(p_session_token);
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Invalid or expired session.');
  end if;

  if length(coalesce(p_new_recovery_code, '')) < 10 then
    return jsonb_build_object('ok', false, 'message', 'Recovery code must be at least 10 characters.');
  end if;

  select * into v_user from public.finora_users where id = v_user_id;
  if extensions.crypt(coalesce(p_current_password, ''), v_user.password_hash) <> v_user.password_hash then
    return jsonb_build_object('ok', false, 'message', 'Current password is incorrect.');
  end if;

  update public.finora_users
  set recovery_hash = extensions.crypt(p_new_recovery_code, extensions.gen_salt('bf')),
      updated_at = now()
  where id = v_user_id;

  perform public.finora_audit(v_user_id, 'recovery_code_changed', '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.finora_reset_password_with_recovery(p_username text, p_recovery_code text, p_new_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user public.finora_users%rowtype;
begin
  if length(coalesce(p_new_password, '')) < 8 then
    return jsonb_build_object('ok', false, 'message', 'New password must be at least 8 characters.');
  end if;

  select * into v_user from public.finora_users where username = lower(trim(p_username)) limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Invalid username or recovery code.');
  end if;

  if extensions.crypt(coalesce(p_recovery_code, ''), v_user.recovery_hash) <> v_user.recovery_hash then
    perform public.finora_audit(v_user.id, 'password_reset_recovery_failed', '{}'::jsonb);
    return jsonb_build_object('ok', false, 'message', 'Invalid username or recovery code.');
  end if;

  update public.finora_users
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      failed_attempts = 0,
      locked_until = null,
      updated_at = now()
  where id = v_user.id;

  update public.finora_sessions set revoked_at = now() where user_id = v_user.id and revoked_at is null;
  perform public.finora_audit(v_user.id, 'password_reset_with_recovery', '{}'::jsonb);

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.finora_reset_app_data(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid;
  v_state jsonb;
begin
  v_user_id := public.finora_user_id_from_session(p_session_token);
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Invalid or expired session.');
  end if;

  v_state := public.finora_default_state();
  update public.finora_user_state set app_data = v_state, updated_at = now() where user_id = v_user_id;
  perform public.finora_audit(v_user_id, 'app_data_reset', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'state', v_state);
end;
$$;

-- Seed the personal account. Re-running this schema will not overwrite an existing account.
do $$
declare
  v_user_id uuid;
begin
  insert into public.finora_users(username, display_name, password_hash, recovery_hash)
  values (
    'jaravata',
    'Jann Jaravata',
    extensions.crypt('atavaraj', extensions.gen_salt('bf')),
    extensions.crypt('finora-recovery-2026', extensions.gen_salt('bf'))
  )
  on conflict (username) do nothing;

  select id into v_user_id from public.finora_users where username = 'jaravata';
  insert into public.finora_user_state(user_id, app_data)
  values (v_user_id, public.finora_default_state())
  on conflict (user_id) do nothing;
end $$;

grant execute on function public.finora_default_state() to anon, authenticated;
grant execute on function public.finora_login(text, text, text) to anon, authenticated;
grant execute on function public.finora_get_state(text) to anon, authenticated;
grant execute on function public.finora_save_state(text, jsonb) to anon, authenticated;
grant execute on function public.finora_logout(text) to anon, authenticated;
grant execute on function public.finora_change_password(text, text, text) to anon, authenticated;
grant execute on function public.finora_update_recovery_code(text, text, text) to anon, authenticated;
grant execute on function public.finora_reset_password_with_recovery(text, text, text) to anon, authenticated;
grant execute on function public.finora_reset_app_data(text) to anon, authenticated;

-- Optional verification:
-- select public.finora_login('jaravata', 'atavaraj', 'sql editor test');
