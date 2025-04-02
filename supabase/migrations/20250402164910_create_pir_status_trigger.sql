-- Function to call the send-email Edge Function
create or replace function public.handle_pir_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  payload jsonb;
  invoke_url text := Deno.env.get('SUPABASE_URL') || '/functions/v1/send-email'; -- Construct function URL
  secret_exists boolean;
begin
  -- Check if pg_net is available
  select exists(select 1 from pg_extension where extname = 'pg_net') into secret_exists;
  if not secret_exists then
    raise warning 'pg_net extension not enabled. Email notifications will not be sent.';
    return new;
  end if;

  -- Check if status actually changed or if it's a relevant status
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    
    -- Only trigger for statuses requiring notification
    if new.status in ('pending_supplier', 'pending_review', 'accepted', 'rejected') then
    
      -- Construct the payload for the Edge Function
      payload := jsonb_build_object(
        'type', 'PIR_STATUS_UPDATE',
        'record', jsonb_build_object(
          'id', new.id,
          'status', new.status,
          'supplier_company_id', new.supplier_company_id,
          'customer_id', new.customer_id,
          'product_id', new.product_id,
          'suggested_product_name', new.suggested_product_name
        ),
        'old_record', jsonb_build_object(
          'status', old.status 
        )
      );

      -- Asynchronously invoke the Edge Function
      -- Ensure the service_role has permissions for pg_net.http_post
      -- Requires enabling the pg_net extension: extensions -> pg_net -> enable
      perform net.http_post(
          url := invoke_url,
          headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') -- Use service role key for auth
          ),
          body := payload
      );
      
    end if; -- End status check
    
  end if; -- End operation check

  return new;
end;
$$;

-- Trigger after insert or update on pir_requests
create trigger on_pir_status_change
  after insert or update of status on public.pir_requests
  for each row execute function public.handle_pir_status_change();

-- Grant usage on net schema to postgres role if needed (run once)
-- grant usage on schema net to postgres; 
-- grant execute on function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) to postgres;

-- Enable pg_net extension if not already enabled (run once in SQL editor or separate migration)
-- create extension if not exists pg_net with schema extensions;