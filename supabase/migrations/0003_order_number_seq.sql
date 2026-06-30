-- Replace the COUNT-based order number generator with a proper sequence
-- to eliminate the race condition under concurrent order submissions.
create sequence if not exists order_number_seq start 1;

create or replace function next_order_number() returns text as $$
begin
  return 'ORD-' || lpad(nextval('order_number_seq')::text, 6, '0');
end;
$$ language plpgsql security definer;
