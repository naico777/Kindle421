create extension if not exists pgcrypto;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  kindle_email text not null unique,
  delivery_enabled boolean not null default true,
  accepted_terms_at timestamptz,
  last_article_fingerprint text,
  last_edition_fingerprint text,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_failure_message text,
  send_count_today integer not null default 0,
  send_count_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_kindle_email_valid check (kindle_email ~* '^[^@\s]+@kindle\.com$')
);

create index if not exists subscriptions_delivery_idx
  on public.subscriptions (delivery_enabled);

create index if not exists subscriptions_last_failure_idx
  on public.subscriptions (last_failure_at)
  where last_failure_at is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

-- No public table policies are needed. The app writes subscriptions from server
-- actions using the Supabase service role, so visitors never receive DB access.

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 1
);

alter table public.rate_limits enable row level security;

create or replace function public.touch_rate_limit(limit_key text, max_count integer, window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_record public.rate_limits%rowtype;
begin
  select * into current_record from public.rate_limits where key = limit_key for update;

  if not found then
    insert into public.rate_limits(key, window_start, count) values (limit_key, now(), 1);
    return true;
  end if;

  if current_record.window_start < now() - make_interval(secs => window_seconds) then
    update public.rate_limits set window_start = now(), count = 1 where key = limit_key;
    return true;
  end if;

  if current_record.count >= max_count then
    return false;
  end if;

  update public.rate_limits set count = count + 1 where key = limit_key;
  return true;
end;
$$;

-- Optional one-time migration from the previous auth-based beta schema.
do $$
begin
  if to_regclass('public.profiles') is not null then
    execute $migration$
      insert into public.subscriptions (
        kindle_email,
        delivery_enabled,
        accepted_terms_at,
        last_article_fingerprint,
        last_edition_fingerprint,
        last_success_at,
        last_failure_at,
        last_failure_message,
        send_count_today,
        send_count_date
      )
      select
        kindle_email,
        delivery_enabled,
        accepted_terms_at,
        last_article_fingerprint,
        last_edition_fingerprint,
        last_success_at,
        last_failure_at,
        last_failure_message,
        send_count_today,
        send_count_date
      from public.profiles
      where kindle_email is not null
      on conflict (kindle_email) do nothing
    $migration$;
  end if;
end;
$$;

-- Explicit grants for PostgREST roles used by Supabase API.
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on table public.subscriptions to service_role;
grant all privileges on table public.rate_limits to service_role;
grant execute on function public.touch_rate_limit(text, integer, integer) to anon, authenticated, service_role;
