-- ===============================================
-- Migration: Create finance_monthly_trends View
-- Filename: 20250707000100_create_finance_monthly_trends_view.sql
-- Description: Summarizes income, expenses, and income % change
--              using chart_of_accounts with double-entry classification.
-- Author: Cortanatech Solutions, Inc.
-- Created: 2025-07-07
-- ===============================================

drop view if exists public.finance_monthly_trends cascade;

create view public.finance_monthly_trends as
with categorized as (
  select
    ft.tenant_id,
    date_trunc('month', ft.date)::date as month,
    coa.account_type,
    sum(ft.debit) as total_debit,
    sum(ft.credit) as total_credit
  from
    financial_transactions ft
    join chart_of_accounts coa on ft.account_id = coa.id
  group by
    ft.tenant_id,
    date_trunc('month', ft.date),
    coa.account_type
),
monthly_summary as (
  select
    tenant_id,
    month,
    sum(case when account_type = 'revenue' then total_credit else 0 end) as income,
    sum(case when account_type = 'expense' then total_debit else 0 end) as expenses
  from
    categorized
  group by
    tenant_id, month
),
with_lag as (
  select
    *,
    lag(income) over (partition by tenant_id order by month) as previous_income
  from
    monthly_summary
)
select
  tenant_id,
  to_char(month, 'YYYY-MM') as month,
  income,
  expenses,
  round(
    case
      when previous_income is null or previous_income = 0 then null
      else (income - previous_income) / previous_income * 100
    end,
    2
  ) as percentage_change
from
  with_lag
where
  tenant_id = (
    select tenant_id
    from tenant_users
    where user_id = auth.uid()
  )
order by
  month;