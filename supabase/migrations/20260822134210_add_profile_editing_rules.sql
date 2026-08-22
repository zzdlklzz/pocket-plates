-- Add the smallest safe owner-only profile editing contract before community
-- publishing. Existing profile data must be repaired explicitly if it is not
-- compatible with the new identity rules.

do $$
declare
  duplicate_username_count integer;
  invalid_display_name_count integer;
  invalid_username_count integer;
begin
  select count(*)
  into invalid_username_count
  from public.profiles
  where username is not null
    and (
      username <> lower(btrim(username))
      or char_length(username) not between 3 and 24
      or username !~ '^[a-z0-9_]+$'
      or username = any (
        array[
          'admin',
          'administrator',
          'support',
          'help',
          'pocketplates',
          'pocket_plates'
        ]
      )
    );

  select count(*)
  into duplicate_username_count
  from (
    select lower(username)
    from public.profiles
    where username is not null
    group by lower(username)
    having count(*) > 1
  ) as duplicate_usernames;

  select count(*)
  into invalid_display_name_count
  from public.profiles
  where display_name is not null
    and (
      display_name ~ '[[:cntrl:]]'
      or char_length(
        regexp_replace(btrim(display_name), '[[:space:]]+', ' ', 'g')
      ) not between 1 and 50
    );

  if invalid_username_count > 0
    or duplicate_username_count > 0
    or invalid_display_name_count > 0 then
    raise exception using
      message = format(
        'Profile identity migration blocked: %s invalid username row(s), %s case-insensitive duplicate username group(s), and %s invalid display-name row(s). Repair these profile values before retrying.',
        invalid_username_count,
        duplicate_username_count,
        invalid_display_name_count
      ),
      errcode = 'check_violation';
  end if;
end;
$$;

alter table public.profiles
add constraint profiles_username_format_check
check (
  username is null
  or (
    username = lower(btrim(username))
    and char_length(username) between 3 and 24
    and username ~ '^[a-z0-9_]+$'
    and username <> all (
      array[
        'admin',
        'administrator',
        'support',
        'help',
        'pocketplates',
        'pocket_plates'
      ]
    )
  )
),
add constraint profiles_display_name_format_check
check (
  display_name is null
  or (
    display_name !~ '[[:cntrl:]]'
    and char_length(
      regexp_replace(btrim(display_name), '[[:space:]]+', ' ', 'g')
    ) between 1 and 50
  )
);

create unique index profiles_username_lower_unique_idx
on public.profiles (lower(username))
where username is not null;

-- Keep new Auth identities compatible with the display-name constraint. Invalid
-- provider metadata is omitted rather than allowing signup to fail.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_display_name text;
  raw_display_name text;
begin
  raw_display_name := new.raw_user_meta_data ->> 'display_name';

  if raw_display_name is not null and raw_display_name !~ '[[:cntrl:]]' then
    normalized_display_name := regexp_replace(
      btrim(raw_display_name),
      '[[:space:]]+',
      ' ',
      'g'
    );

    if char_length(normalized_display_name) not between 1 and 50 then
      normalized_display_name := null;
    end if;
  end if;

  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    normalized_display_name,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    display_name = coalesce(
      public.profiles.display_name,
      excluded.display_name
    ),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

revoke all on table public.profiles from anon;
revoke insert, update, delete, truncate, references, trigger
on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, username) on table public.profiles to authenticated;
