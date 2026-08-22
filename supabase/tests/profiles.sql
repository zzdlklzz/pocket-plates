begin;

do $$
begin
  if not has_table_privilege('authenticated', 'public.profiles', 'SELECT') then
    raise exception 'authenticated must be able to read its own profile';
  end if;

  if has_table_privilege('authenticated', 'public.profiles', 'INSERT')
    or has_table_privilege('authenticated', 'public.profiles', 'DELETE')
    or has_table_privilege('authenticated', 'public.profiles', 'UPDATE') then
    raise exception 'authenticated must not have broad profile write privileges';
  end if;

  if not has_column_privilege(
    'authenticated',
    'public.profiles',
    'display_name',
    'UPDATE'
  ) or not has_column_privilege(
    'authenticated',
    'public.profiles',
    'username',
    'UPDATE'
  ) then
    raise exception 'authenticated must update display_name and username';
  end if;

  if has_column_privilege('authenticated', 'public.profiles', 'avatar_url', 'UPDATE')
    or has_column_privilege('authenticated', 'public.profiles', 'bio', 'UPDATE')
    or has_column_privilege('authenticated', 'public.profiles', 'id', 'UPDATE')
    or has_column_privilege('authenticated', 'public.profiles', 'created_at', 'UPDATE')
    or has_column_privilege('authenticated', 'public.profiles', 'updated_at', 'UPDATE') then
    raise exception 'authenticated must not update non-editor profile columns';
  end if;

  if has_table_privilege('anon', 'public.profiles', 'SELECT')
    or has_table_privilege('anon', 'public.profiles', 'UPDATE') then
    raise exception 'anon must not access profiles';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_index as database_index
    join pg_catalog.pg_class as index_class
      on index_class.oid = database_index.indexrelid
    join pg_catalog.pg_namespace as index_namespace
      on index_namespace.oid = index_class.relnamespace
    where index_namespace.nspname = 'public'
      and index_class.relname = 'profiles_username_lower_unique_idx'
      and database_index.indisunique
      and position(
        'lower(username)' in lower(pg_get_indexdef(database_index.indexrelid))
      ) > 0
      and position(
        'username is not null' in lower(
          pg_get_expr(database_index.indpred, database_index.indrelid)
        )
      ) > 0
  ) then
    raise exception 'profile username lower-case uniqueness index is incorrect';
  end if;
end;
$$;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  (
    '13000000-0000-0000-0000-000000000001',
    'profile-owner-one@example.test',
    '{}'::jsonb,
    '{}'::jsonb
  ),
  (
    '13000000-0000-0000-0000-000000000002',
    'profile-owner-two@example.test',
    '{}'::jsonb,
    '{}'::jsonb
  ),
  (
    '13000000-0000-0000-0000-000000000003',
    'profile-invalid-metadata@example.test',
    '{}'::jsonb,
    '{"display_name":"Invalid\tname"}'::jsonb
  );

do $$
begin
  if exists (
    select 1
    from public.profiles
    where id in (
      '13000000-0000-0000-0000-000000000001',
      '13000000-0000-0000-0000-000000000002'
    )
      and (username is not null or display_name is not null)
  ) then
    raise exception 'new profiles must allow incomplete identity fields';
  end if;

  if (
    select display_name
    from public.profiles
    where id = '13000000-0000-0000-0000-000000000003'
  ) is not null then
    raise exception 'invalid Auth display-name metadata must be omitted safely';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '13000000-0000-0000-0000-000000000001',
  true
);

update public.profiles
set display_name = 'Dani Lim', username = 'dlkl'
where id = '13000000-0000-0000-0000-000000000001';

do $$
begin
  if (
    select count(*)
    from public.profiles
    where id = '13000000-0000-0000-0000-000000000001'
      and display_name = 'Dani Lim'
      and username = 'dlkl'
  ) <> 1 then
    raise exception 'an owner must be able to read and update its profile';
  end if;

  if exists (
    select 1
    from public.profiles
    where id = '13000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'an owner must not read another profile';
  end if;
end;
$$;

do $$
declare
  changed_rows integer;
begin
  update public.profiles
  set display_name = 'Forbidden'
  where id = '13000000-0000-0000-0000-000000000002';
  get diagnostics changed_rows = row_count;

  if changed_rows <> 0 then
    raise exception 'an owner must not update another profile';
  end if;

  begin
    update public.profiles
    set bio = 'Not editable'
    where id = '13000000-0000-0000-0000-000000000001';
    raise exception 'authenticated must not update profile bio';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.profiles
    set username = 'Admin'
    where id = '13000000-0000-0000-0000-000000000001';
    raise exception 'mixed-case usernames must fail';
  exception
    when check_violation then null;
  end;

  begin
    update public.profiles
    set username = 'help'
    where id = '13000000-0000-0000-0000-000000000001';
    raise exception 'reserved usernames must fail';
  exception
    when check_violation then null;
  end;

  begin
    update public.profiles
    set username = 'no-dashes'
    where id = '13000000-0000-0000-0000-000000000001';
    raise exception 'invalid username characters must fail';
  exception
    when check_violation then null;
  end;

  begin
    update public.profiles
    set username = 'ab'
    where id = '13000000-0000-0000-0000-000000000001';
    raise exception 'short usernames must fail';
  exception
    when check_violation then null;
  end;

  begin
    update public.profiles
    set display_name = '   '
    where id = '13000000-0000-0000-0000-000000000001';
    raise exception 'blank display names must fail';
  exception
    when check_violation then null;
  end;

  begin
    update public.profiles
    set display_name = 'Invalid' || chr(10) || 'name'
    where id = '13000000-0000-0000-0000-000000000001';
    raise exception 'control characters in display names must fail';
  exception
    when check_violation then null;
  end;
end;
$$;

select set_config(
  'request.jwt.claim.sub',
  '13000000-0000-0000-0000-000000000002',
  true
);

do $$
begin
  begin
    update public.profiles
    set display_name = 'Second Owner', username = 'dlkl'
    where id = '13000000-0000-0000-0000-000000000002';
    raise exception 'duplicate usernames must fail';
  exception
    when unique_violation then null;
  end;
end;
$$;

reset role;

-- Exercise the migration preflight against deliberately incompatible legacy
-- values. DDL and data changes remain inside this test transaction.
alter table public.profiles
drop constraint profiles_username_format_check,
drop constraint profiles_display_name_format_check;
drop index public.profiles_username_lower_unique_idx;

update public.profiles
set username = 'Cook'
where id = '13000000-0000-0000-0000-000000000001';

update public.profiles
set username = 'cook', display_name = 'Invalid' || chr(10) || 'name'
where id = '13000000-0000-0000-0000-000000000002';

do $$
declare
  duplicate_username_count integer;
  invalid_display_name_count integer;
  invalid_username_count integer;
begin
  begin
    select count(*) into invalid_username_count
    from public.profiles
    where username is not null
      and (
        username <> lower(btrim(username))
        or char_length(username) not between 3 and 24
        or username !~ '^[a-z0-9_]+$'
        or username = any (
          array[
            'admin', 'administrator', 'support', 'help', 'pocketplates',
            'pocket_plates'
          ]
        )
      );

    select count(*) into duplicate_username_count
    from (
      select lower(username)
      from public.profiles
      where username is not null
      group by lower(username)
      having count(*) > 1
    ) as duplicate_usernames;

    select count(*) into invalid_display_name_count
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

    raise exception 'preflight must reject incompatible legacy profile data';
  exception
    when check_violation then
      if position('Profile identity migration blocked:' in sqlerrm) = 0
        or position('Repair these profile values before retrying.' in sqlerrm) = 0 then
        raise exception 'preflight diagnostic must identify and explain repair';
      end if;
  end;
end;
$$;

rollback;
