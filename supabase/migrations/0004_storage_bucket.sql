-- Create the productions storage bucket (private — access via signed URLs only).
insert into storage.buckets (id, name, public)
values ('productions', 'productions', false)
on conflict (id) do nothing;

-- Only service role (admin client) can read/write.
create policy "admin_storage_all" on storage.objects
  for all using (bucket_id = 'productions' and auth.role() = 'service_role');
