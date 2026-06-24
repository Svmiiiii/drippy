-- ============================================================================
-- increment_scan — atomic scan aggregation
-- Bumps daily_qr_stats and qr_codes counters in one call.
-- ============================================================================
create or replace function increment_scan(p_qr_id uuid, p_date date, p_unique boolean)
returns void as $$
begin
  insert into daily_qr_stats (qr_code_id, date, total_scans, unique_scans)
  values (p_qr_id, p_date, 1, case when p_unique then 1 else 0 end)
  on conflict (qr_code_id, date) do update
    set total_scans  = daily_qr_stats.total_scans + 1,
        unique_scans = daily_qr_stats.unique_scans + case when p_unique then 1 else 0 end;

  update qr_codes
     set total_scans  = total_scans + 1,
         unique_scans = unique_scans + case when p_unique then 1 else 0 end
   where id = p_qr_id;
end;
$$ language plpgsql security definer;
