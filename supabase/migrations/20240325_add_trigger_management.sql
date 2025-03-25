-- Create function to disable all triggers
create or replace function disable_triggers()
returns void as $$
declare
    r record;
begin
    for r in (
        select 
            table_schema,
            table_name
        from information_schema.tables
        where 
            table_schema = 'public' and
            table_type = 'BASE TABLE' and
            table_name not in ('schema_migrations', '_prisma_migrations')
    ) loop
        execute format('alter table %I.%I disable trigger all', r.table_schema, r.table_name);
    end loop;
end;
$$ language plpgsql security definer;

-- Create function to enable all triggers
create or replace function enable_triggers()
returns void as $$
declare
    r record;
begin
    for r in (
        select 
            table_schema,
            table_name
        from information_schema.tables
        where 
            table_schema = 'public' and
            table_type = 'BASE TABLE' and
            table_name not in ('schema_migrations', '_prisma_migrations')
    ) loop
        execute format('alter table %I.%I enable trigger all', r.table_schema, r.table_name);
    end loop;
end;
$$ language plpgsql security definer;

-- Grant execute permissions to authenticated users
grant execute on function disable_triggers to authenticated;
grant execute on function enable_triggers to authenticated; 