-- Materialized view summarizing recent transactions by source
-- The view rolls up double entry transaction lines to a logical
-- transaction (header) level for easy consumption by the UI.

create materialized view source_recent_transactions_view as
select
  distinct on (h.id)
  h.id as header_id,
  ft.source_id,
  h.transaction_date as date,
  coalesce(c.name, 'Uncategorized') as category,
  h.description,
  case
    when ft.debit > 0 then ft.debit
    else ft.credit
  end as amount
from financial_transactions ft
join financial_transaction_headers h on ft.header_id = h.id
left join categories c on ft.category_id = c.id
where ft.source_id is not null
order by h.id, ft.id;

create index if not exists source_recent_transactions_view_source_date_idx
  on source_recent_transactions_view(source_id, date);

create or replace function refresh_source_recent_transactions_view()
returns trigger as $$
begin
  refresh materialized view concurrently source_recent_transactions_view;
  return null;
end;
$$ LANGUAGE plpgsql SECURITY DEFINER;

create trigger refresh_source_recent_transactions_view
after insert or update or delete on financial_transactions
for each statement execute function refresh_source_recent_transactions_view();

comment on materialized view source_recent_transactions_view is
  'Latest transactions per header aggregated for each financial source.';
comment on function refresh_source_recent_transactions_view() is
  'Refreshes source_recent_transactions_view whenever transactions change.';
comment on trigger refresh_source_recent_transactions_view on financial_transactions is
  'Keeps source_recent_transactions_view up to date.';
