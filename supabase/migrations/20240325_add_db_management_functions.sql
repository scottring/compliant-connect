-- Function to get all tables in the public schema
create or replace function get_public_tables()
returns table (table_name text) as $$
begin
  return query
  select t.table_name::text
  from information_schema.tables t
  where t.table_schema = 'public'
  and t.table_type = 'BASE TABLE'
  and t.table_name not in ('schema_migrations', '_prisma_migrations');
end;
$$ language plpgsql security definer;

-- Function to truncate a specific table
create or replace function truncate_table(table_name text)
returns void as $$
begin
  execute format('truncate table %I cascade', table_name);
end;
$$ language plpgsql security definer;

-- Function to disable RLS temporarily
create or replace function disable_rls_temporarily()
returns void as $$
declare
  r record;
begin
  -- Store current user for logging
  perform set_config('app.current_user', current_user::text, false);
  
  -- Only allow in development or staging
  if current_setting('app.environment', true) not in ('development', 'staging') then
    raise exception 'This operation is only allowed in development or staging environments';
  end if;

  for r in (
    select tablename 
    from pg_tables 
    where schemaname = 'public'
    and tablename not in ('schema_migrations', '_prisma_migrations')
  ) loop
    execute format('alter table %I disable row level security', r.tablename);
  end loop;
end;
$$ language plpgsql security definer;

-- Function to enable RLS
create or replace function enable_rls()
returns void as $$
declare
  r record;
begin
  for r in (
    select tablename 
    from pg_tables 
    where schemaname = 'public'
    and tablename not in ('schema_migrations', '_prisma_migrations')
  ) loop
    execute format('alter table %I enable row level security', r.tablename);
  end loop;
end;
$$ language plpgsql security definer;

-- Grant execute permissions to authenticated users
grant execute on function get_public_tables to authenticated;
grant execute on function truncate_table to authenticated;
grant execute on function disable_rls_temporarily to authenticated;
grant execute on function enable_rls to authenticated; 