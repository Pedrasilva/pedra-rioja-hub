-- Phase 7 — executive dashboard, management reporting, bookkeeping completion.

create or replace view public.v_counterparty_ageing
with (security_invoker = on) as
select
  d.company_id,
  d.direction,
  d.counterparty_id,
  coalesce(c.name, d.counterparty_name, 'Unallocated') as counterparty_name,
  d.currency,
  count(*)::int as document_count,
  sum(d.outstanding_amount) as outstanding_amount,
  sum(case when coalesce(d.due_date, d.issue_date) >= current_date
           then d.outstanding_amount else 0 end) as not_due,
  sum(case when current_date - coalesce(d.due_date, d.issue_date) between 1 and 30
           then d.outstanding_amount else 0 end) as due_1_30,
  sum(case when current_date - coalesce(d.due_date, d.issue_date) between 31 and 60
           then d.outstanding_amount else 0 end) as due_31_60,
  sum(case when current_date - coalesce(d.due_date, d.issue_date) between 61 and 90
           then d.outstanding_amount else 0 end) as due_61_90,
  sum(case when current_date - coalesce(d.due_date, d.issue_date) > 90
           then d.outstanding_amount else 0 end) as due_over_90,
  min(coalesce(d.due_date, d.issue_date)) as oldest_due_date
from public.financial_documents d
left join public.counterparties c on c.id = d.counterparty_id
where d.deleted_at is null
  and d.status = 'posted'
  and coalesce(d.outstanding_amount, 0) > 0.005
group by d.company_id, d.direction, d.counterparty_id,
         coalesce(c.name, d.counterparty_name, 'Unallocated'), d.currency;

grant select on public.v_counterparty_ageing to authenticated;

create or replace view public.v_income_statement
with (security_invoker = on) as
select
  d.company_id,
  date_trunc('month', d.issue_date)::date as month,
  d.issue_date,
  d.direction,
  case when d.direction = 'outbound' then 'income' else 'cost' end as bucket,
  l.classification_id,
  coalesce(fc.code, 'unclassified') as classification_code,
  coalesce(fc.name_en, 'Unclassified') as classification_name,
  fc.nature,
  fc.cash_flow_category,
  l.property_id,
  l.project_id,
  d.id as document_id,
  d.document_number,
  coalesce(cp.name, d.counterparty_name) as counterparty_name,
  d.currency,
  l.net_amount,
  l.vat_amount,
  l.gross_amount
from public.financial_documents d
join public.financial_document_lines l on l.document_id = d.id
left join public.financial_classifications fc on fc.id = l.classification_id
left join public.counterparties cp on cp.id = d.counterparty_id
where d.deleted_at is null
  and d.status = 'posted';

grant select on public.v_income_statement to authenticated;

create or replace view public.v_debt_summary
with (security_invoker = on) as
select
  s.company_id,
  coalesce(s.lender, 'Unspecified') as lender,
  s.currency,
  count(*)::int as agreement_count,
  sum(s.original_principal) as original_principal,
  sum(s.outstanding_principal) as outstanding_principal,
  sum(s.interest_paid) as interest_paid,
  sum(s.remaining_total) as remaining_total,
  case when sum(s.outstanding_principal) > 0
    then round(
      sum(s.outstanding_principal * coalesce(s.fixed_rate, s.spread, 0))
      / sum(s.outstanding_principal), 4)
    else 0 end as weighted_rate,
  min(s.end_date) as earliest_maturity,
  max(s.end_date) as latest_maturity,
  min(s.next_due_date) as next_due_date
from public.v_financing_agreement_summary s
where s.status is distinct from 'closed'
group by s.company_id, coalesce(s.lender, 'Unspecified'), s.currency;

grant select on public.v_debt_summary to authenticated;

create or replace view public.v_debt_maturity
with (security_invoker = on) as
select
  s.company_id,
  extract(year from s.end_date)::int as maturity_year,
  count(*)::int as agreement_count,
  sum(s.outstanding_principal) as outstanding_principal
from public.v_financing_agreement_summary s
where s.end_date is not null
  and s.status is distinct from 'closed'
group by s.company_id, extract(year from s.end_date)::int;

grant select on public.v_debt_maturity to authenticated;

create or replace view public.v_capex_summary
with (security_invoker = on) as
select
  p.company_id,
  p.id as project_id,
  p.code,
  p.name,
  p.status,
  p.project_type,
  p.property_id,
  pr.code as property_code,
  pr.name as property_name,
  p.currency,
  p.start_date,
  p.target_end_date,
  p.actual_end_date,
  coalesce(p.budget_amount, 0) as budget_amount,
  coalesce(costs.actual_amount, 0) as actual_amount,
  coalesce(cf.committed_amount, 0) as committed_amount,
  coalesce(cf.forecast_amount, 0) as forecast_amount,
  coalesce(p.budget_amount, 0)
    - coalesce(costs.actual_amount, 0)
    - coalesce(cf.committed_amount, 0) as remaining_budget,
  case when coalesce(p.budget_amount, 0) > 0
    then round((coalesce(costs.actual_amount, 0) + coalesce(cf.committed_amount, 0))
               / p.budget_amount * 100, 1)
    else null end as spend_pct
from public.capex_projects p
left join public.properties pr on pr.id = p.property_id
left join lateral (
  select sum(c.amount) as actual_amount
  from public.capex_project_costs c
  where c.project_id = p.id and c.deleted_at is null
) costs on true
left join lateral (
  select
    sum(case when e.state = 'committed' then e.amount_total else 0 end) as committed_amount,
    sum(case when e.state = 'forecast' then e.amount_total else 0 end) as forecast_amount
  from public.cash_flow_entries e
  where e.project_id = p.id and e.deleted_at is null and e.direction = 'outflow'
) cf on true
where p.deleted_at is null;

grant select on public.v_capex_summary to authenticated;

create or replace view public.v_bookkeeping_overview
with (security_invoker = on) as
select
  c.id as company_id,
  count(*) filter (where d.status = 'draft')::int as draft_count,
  count(*) filter (where d.status = 'posted')::int as posted_count,
  count(*) filter (where d.status = 'cancelled')::int as cancelled_count,
  count(*) filter (where d.status = 'posted' and d.direction = 'inbound'
                     and coalesce(d.outstanding_amount, 0) > 0.005)::int as outstanding_supplier_count,
  coalesce(sum(d.outstanding_amount) filter (where d.status = 'posted' and d.direction = 'inbound'), 0)
    as outstanding_supplier_amount,
  count(*) filter (where d.status = 'posted' and d.direction = 'outbound'
                     and coalesce(d.outstanding_amount, 0) > 0.005)::int as outstanding_client_count,
  coalesce(sum(d.outstanding_amount) filter (where d.status = 'posted' and d.direction = 'outbound'), 0)
    as outstanding_client_amount,
  count(*) filter (where d.status = 'posted'
                     and coalesce(d.outstanding_amount, 0) > 0.005
                     and coalesce(d.due_date, d.issue_date) < current_date)::int as overdue_count,
  coalesce(sum(d.outstanding_amount) filter (
      where d.status = 'posted'
        and coalesce(d.due_date, d.issue_date) < current_date), 0) as overdue_amount
from public.companies c
left join public.financial_documents d
  on d.company_id = c.id and d.deleted_at is null
where c.deleted_at is null
group by c.id;

grant select on public.v_bookkeeping_overview to authenticated;

create or replace view public.v_document_journal
with (security_invoker = on) as
select
  d.company_id,
  d.id as document_id,
  d.issue_date,
  d.due_date,
  d.direction,
  d.doc_type,
  d.series,
  d.document_number,
  d.atcud,
  d.status,
  d.payment_state,
  coalesce(cp.name, d.counterparty_name) as counterparty_name,
  cp.nif as counterparty_nif,
  l.line_no,
  l.description,
  fc.code as classification_code,
  coalesce(fc.name_en, 'Unclassified') as classification_name,
  pr.code as property_code,
  cx.code as project_code,
  d.currency,
  l.net_amount,
  l.vat_rate,
  l.vat_code,
  l.vat_amount,
  l.gross_amount
from public.financial_documents d
join public.financial_document_lines l on l.document_id = d.id
left join public.financial_classifications fc on fc.id = l.classification_id
left join public.counterparties cp on cp.id = d.counterparty_id
left join public.properties pr on pr.id = l.property_id
left join public.capex_projects cx on cx.id = l.project_id
where d.deleted_at is null;

grant select on public.v_document_journal to authenticated;

create or replace function public.vat_summary(
  _company_id uuid,
  _from date,
  _to date
) returns table (
  direction text,
  vat_rate numeric,
  vat_code text,
  net_amount numeric,
  vat_amount numeric,
  gross_amount numeric,
  document_count int
)
language sql
stable
security invoker
set search_path = public
as $$
  select d.direction,
         coalesce(l.vat_rate, 0) as vat_rate,
         coalesce(l.vat_code, '-') as vat_code,
         sum(l.net_amount),
         sum(l.vat_amount),
         sum(l.gross_amount),
         count(distinct d.id)::int
  from public.financial_documents d
  join public.financial_document_lines l on l.document_id = d.id
  where d.company_id = _company_id
    and d.deleted_at is null
    and d.status = 'posted'
    and d.issue_date between _from and _to
  group by d.direction, coalesce(l.vat_rate, 0), coalesce(l.vat_code, '-')
  order by d.direction, coalesce(l.vat_rate, 0);
$$;

grant execute on function public.vat_summary(uuid, date, date) to authenticated;

create or replace function public.property_profitability(
  _company_id uuid,
  _from date,
  _to date
) returns table (
  property_id uuid,
  property_code text,
  property_name text,
  status text,
  current_valuation numeric,
  acquisition_total numeric,
  outstanding_debt numeric,
  rental_income numeric,
  other_income numeric,
  operating_costs numeric,
  financing_costs numeric,
  capex_spend numeric,
  taxes numeric,
  net_operating_income numeric,
  net_cash_flow numeric,
  gross_yield numeric,
  net_yield numeric,
  roi numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with movements as (
    select e.property_id,
      sum(case when e.direction = 'inflow' and e.category = 'rent' then e.amount_total else 0 end) as rental_income,
      sum(case when e.direction = 'inflow' and e.category <> 'rent' then e.amount_total else 0 end) as other_income,
      sum(case when e.direction = 'outflow'
            and e.category in ('maintenance','insurance','utilities','service_charge','professional_fees','other')
            then e.amount_total else 0 end) as operating_costs,
      sum(case when e.direction = 'outflow' and e.category = 'financing' then e.amount_total else 0 end) as financing_costs,
      sum(case when e.direction = 'outflow' and e.category = 'capex' then e.amount_total else 0 end) as capex_spend,
      sum(case when e.direction = 'outflow' and e.category = 'tax' then e.amount_total else 0 end) as taxes
    from public.cash_flow_entries e
    where e.company_id = _company_id
      and e.deleted_at is null
      and e.is_included is distinct from false
      and e.state in ('actual','reconciled')
      and e.entry_date between _from and _to
    group by e.property_id
  )
  select
    p.property_id, p.code, p.name, p.status,
    coalesce(p.current_valuation, 0),
    coalesce(p.acquisition_total, 0),
    coalesce(p.outstanding_debt, 0),
    coalesce(m.rental_income, 0),
    coalesce(m.other_income, 0),
    coalesce(m.operating_costs, 0),
    coalesce(m.financing_costs, 0),
    coalesce(m.capex_spend, 0),
    coalesce(m.taxes, 0),
    coalesce(m.rental_income, 0) + coalesce(m.other_income, 0) - coalesce(m.operating_costs, 0),
    coalesce(m.rental_income, 0) + coalesce(m.other_income, 0)
      - coalesce(m.operating_costs, 0) - coalesce(m.financing_costs, 0)
      - coalesce(m.capex_spend, 0) - coalesce(m.taxes, 0),
    case when coalesce(nullif(p.current_valuation, 0), p.acquisition_total, 0) > 0
      then round((coalesce(m.rental_income, 0) + coalesce(m.other_income, 0))
        / coalesce(nullif(p.current_valuation, 0), p.acquisition_total) * 100, 2) end,
    case when coalesce(nullif(p.current_valuation, 0), p.acquisition_total, 0) > 0
      then round((coalesce(m.rental_income, 0) + coalesce(m.other_income, 0) - coalesce(m.operating_costs, 0))
        / coalesce(nullif(p.current_valuation, 0), p.acquisition_total) * 100, 2) end,
    case when coalesce(p.acquisition_total, 0) > 0
      then round((coalesce(m.rental_income, 0) + coalesce(m.other_income, 0)
        - coalesce(m.operating_costs, 0) - coalesce(m.financing_costs, 0)
        - coalesce(m.taxes, 0)) / p.acquisition_total * 100, 2) end
  from public.v_property_summary p
  left join movements m on m.property_id = p.property_id
  where p.company_id = _company_id
  order by p.code;
$$;

grant execute on function public.property_profitability(uuid, date, date) to authenticated;

create or replace function public.liquidity_forecast(
  _company_id uuid,
  _scenario text default 'base'
) returns table (
  horizon_days int,
  horizon_date date,
  inflows numeric,
  outflows numeric,
  net_movement numeric,
  projected_balance numeric
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  opening numeric := 0;
begin
  if not public.can_view_company(_company_id) then
    raise exception 'Not authorised' using errcode = 'insufficient_privilege';
  end if;

  select coalesce(sum(b.system_balance), 0) into opening
  from public.v_bank_account_balances b
  where b.company_id = _company_id;

  return query
  with horizons(days) as (values (30), (90), (180), (365)),
  movements as (
    select h.days,
      coalesce(sum(case when e.direction = 'inflow' then e.amount_total else 0 end), 0) as inflows,
      coalesce(sum(case when e.direction = 'outflow' then e.amount_total else 0 end), 0) as outflows
    from horizons h
    left join public.cash_flow_entries e
      on e.company_id = _company_id
     and e.deleted_at is null
     and e.is_included is distinct from false
     and e.state in ('forecast','committed')
     and coalesce(e.scenario_code, _scenario) = _scenario
     and e.entry_date > current_date
     and e.entry_date <= current_date + h.days
    group by h.days
  )
  select m.days,
         (current_date + m.days)::date,
         m.inflows,
         m.outflows,
         m.inflows - m.outflows,
         opening + m.inflows - m.outflows
  from movements m
  order by m.days;
end;
$$;

grant execute on function public.liquidity_forecast(uuid, text) to authenticated;

create or replace function public.executive_snapshot(_company_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.can_view_company(_company_id) then
    raise exception 'Not authorised' using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    'portfolio', (
      select jsonb_build_object(
        'property_count', count(*) filter (where status not in ('archived','sold')),
        'portfolio_value', coalesce(sum(coalesce(nullif(current_valuation,0), acquisition_total))
                             filter (where status not in ('archived','sold')), 0),
        'acquisition_total', coalesce(sum(acquisition_total) filter (where status not in ('archived','sold')), 0),
        'outstanding_debt', coalesce(sum(outstanding_debt) filter (where status not in ('archived','sold')), 0),
        'estimated_equity', coalesce(sum(coalesce(nullif(current_valuation,0), acquisition_total) - coalesce(outstanding_debt,0))
                             filter (where status not in ('archived','sold')), 0),
        'monthly_rent', coalesce(sum(monthly_rent), 0),
        'unit_count', coalesce(sum(unit_count), 0),
        'occupancy_pct', case when coalesce(sum(unit_count), 0) > 0
            then round(sum(unit_count * coalesce(occupancy_pct, 0)) / sum(unit_count), 1) else null end,
        'under_works', count(*) filter (where status in ('under_works','renovation')),
        'income_producing', count(*) filter (where coalesce(active_tenancies, 0) > 0)
      )
      from public.v_property_summary where company_id = _company_id
    ),
    'liquidity', (
      select jsonb_build_object(
        'total_cash', coalesce(sum(system_balance), 0),
        'unreconciled_count', coalesce(sum(unreconciled_count), 0),
        'accounts', coalesce(jsonb_agg(jsonb_build_object(
            'id', bank_account_id, 'name', name, 'bank_name', bank_name,
            'currency', currency, 'balance', system_balance,
            'unreconciled_count', unreconciled_count) order by name), '[]'::jsonb)
      )
      from public.v_bank_account_balances where company_id = _company_id
    ),
    'financing', (
      select jsonb_build_object(
        'total_debt', coalesce(sum(outstanding_principal), 0),
        'weighted_rate', case when coalesce(sum(outstanding_principal), 0) > 0
            then round(sum(outstanding_principal * weighted_rate) / sum(outstanding_principal), 4) else 0 end,
        'lenders', coalesce(jsonb_agg(jsonb_build_object(
            'lender', lender, 'outstanding', outstanding_principal,
            'agreements', agreement_count, 'rate', weighted_rate,
            'next_due_date', next_due_date, 'earliest_maturity', earliest_maturity)
            order by outstanding_principal desc), '[]'::jsonb)
      )
      from public.v_debt_summary where company_id = _company_id
    ),
    'maturity', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'year', maturity_year, 'outstanding', outstanding_principal,
        'agreements', agreement_count) order by maturity_year), '[]'::jsonb)
      from public.v_debt_maturity where company_id = _company_id
    ),
    'next_instalments', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object(
          'agreement_id', s.agreement_id, 'due_date', s.due_date,
          'total_payment', s.total_payment, 'principal', s.principal,
          'interest', s.interest, 'property_id', s.property_id,
          'lender', a.lender) as x
        from public.v_financing_schedule_current s
        join public.financing_agreements a on a.id = s.agreement_id
        where s.company_id = _company_id
          and s.due_date >= current_date
          and s.status <> 'settled'
        order by s.due_date
        limit 8
      ) t
    ),
    'bookkeeping', (
      select to_jsonb(o) - 'company_id'
      from public.v_bookkeeping_overview o where o.company_id = _company_id
    ),
    'projects', (
      select jsonb_build_object(
        'active_count', count(*) filter (where status in ('approved','in_progress')),
        'budget_total', coalesce(sum(budget_amount) filter (where status in ('approved','in_progress')), 0),
        'committed_total', coalesce(sum(committed_amount) filter (where status in ('approved','in_progress')), 0),
        'actual_total', coalesce(sum(actual_amount) filter (where status in ('approved','in_progress')), 0),
        'remaining_total', coalesce(sum(remaining_budget) filter (where status in ('approved','in_progress')), 0),
        'items', coalesce(jsonb_agg(jsonb_build_object(
            'id', project_id, 'name', name, 'status', status,
            'budget', budget_amount, 'committed', committed_amount,
            'actual', actual_amount, 'remaining', remaining_budget,
            'target_end_date', target_end_date, 'property_name', property_name)
            order by budget_amount desc nulls last)
          filter (where status in ('approved','in_progress')), '[]'::jsonb)
      )
      from public.v_capex_summary where company_id = _company_id
    ),
    'income_costs', (
      select jsonb_build_object(
        'rental_income_12m', coalesce(sum(amount_total) filter (
            where direction = 'inflow' and category = 'rent'), 0),
        'other_income_12m', coalesce(sum(amount_total) filter (
            where direction = 'inflow' and category <> 'rent'), 0),
        'operating_costs_12m', coalesce(sum(amount_total) filter (
            where direction = 'outflow'
              and category in ('maintenance','insurance','utilities','service_charge','professional_fees','other')), 0),
        'financing_costs_12m', coalesce(sum(amount_total) filter (
            where direction = 'outflow' and category = 'financing'), 0),
        'capex_12m', coalesce(sum(amount_total) filter (
            where direction = 'outflow' and category = 'capex'), 0),
        'taxes_12m', coalesce(sum(amount_total) filter (
            where direction = 'outflow' and category = 'tax'), 0)
      )
      from public.cash_flow_entries
      where company_id = _company_id
        and deleted_at is null
        and state in ('actual','reconciled')
        and entry_date > current_date - interval '12 months'
    ),
    'upcoming_costs', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object(
          'id', e.id, 'date', e.entry_date, 'description', e.description,
          'category', e.category, 'amount', e.amount_total, 'state', e.state,
          'counterparty_name', e.counterparty_name) as x
        from public.cash_flow_entries e
        where e.company_id = _company_id
          and e.deleted_at is null
          and e.direction = 'outflow'
          and e.state in ('forecast','committed')
          and e.entry_date between current_date and current_date + 45
        order by e.entry_date
        limit 10
      ) t
    ),
    'recent_payments', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object(
          'id', p.id, 'date', p.payment_date, 'amount', p.amount,
          'method', p.method, 'document_number', d.document_number,
          'counterparty_name', coalesce(d.counterparty_name, '-'),
          'direction', d.direction) as x
        from public.financial_payments p
        join public.financial_documents d on d.id = p.document_id
        where p.company_id = _company_id and p.status = 'confirmed'
        order by p.payment_date desc
        limit 8
      ) t
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.executive_snapshot(uuid) to authenticated;

create or replace function public.executive_alerts(_company_id uuid)
returns table (
  key text,
  severity text,
  category text,
  title text,
  detail text,
  due_date date,
  amount numeric,
  entity_type text,
  entity_id uuid
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.can_view_company(_company_id) then
    raise exception 'Not authorised' using errcode = 'insufficient_privilege';
  end if;

  return query
  select 'overdue:' || d.id::text,
         case when current_date - coalesce(d.due_date, d.issue_date) > 30 then 'critical' else 'high' end,
         'bookkeeping',
         case when d.direction = 'inbound' then 'Overdue supplier invoice' else 'Overdue customer invoice' end,
         coalesce(d.counterparty_name, 'Unknown') || ' · ' || coalesce(d.document_number, 'no number')
           || ' · ' || (current_date - coalesce(d.due_date, d.issue_date))::text || ' days late',
         coalesce(d.due_date, d.issue_date),
         d.outstanding_amount,
         'financial_document', d.id
  from public.financial_documents d
  where d.company_id = _company_id
    and d.deleted_at is null
    and d.status = 'posted'
    and coalesce(d.outstanding_amount, 0) > 0.005
    and coalesce(d.due_date, d.issue_date) < current_date

  union all
  select 'negative-month:' || m.month::text, 'critical', 'liquidity',
         'Negative projected balance',
         'Projected closing balance of ' || round(m.closing_balance, 0)::text
           || ' in ' || to_char(m.month, 'Mon YYYY'),
         m.month, m.closing_balance, 'cash_flow', null::uuid
  from public.cash_flow_monthly(_company_id, date_trunc('month', current_date)::date, 12,
        'base', null, null, null, null, null, false) m
  where m.closing_balance < 0

  union all
  select 'insurance:' || i.id::text,
         case when i.renewal_date <= current_date + 30 then 'high' else 'medium' end,
         'compliance', 'Insurance renewal approaching',
         i.insurer || ' · policy ' || coalesce(i.policy_number, '-'),
         i.renewal_date, i.premium_amount, 'property_insurance_policy', i.id
  from public.property_insurance_policies i
  where i.company_id = _company_id
    and i.deleted_at is null
    and coalesce(i.status, 'active') = 'active'
    and i.renewal_date between current_date and current_date + 60

  union all
  select 'maturity:' || a.id::text, 'medium', 'financing',
         'Financing maturity approaching',
         coalesce(a.lender, 'Lender') || ' · ' || coalesce(a.code, a.reference, '-'),
         a.end_date, s.outstanding_principal, 'financing_agreement', a.id
  from public.financing_agreements a
  join public.v_financing_agreement_summary s on s.agreement_id = a.id
  where a.company_id = _company_id
    and a.deleted_at is null
    and a.status is distinct from 'closed'
    and a.end_date between current_date and current_date + 365

  union all
  select 'rate-revision:' || a.id::text, 'medium', 'financing',
         'Variable rate revision due',
         coalesce(a.lender, 'Lender') || ' · indexed to ' || coalesce(a.index_name, 'index')
           || ' ' || coalesce(a.index_tenor, ''),
         (select min(sc.due_date) from public.v_financing_schedule_current sc
           where sc.agreement_id = a.id and sc.due_date >= current_date),
         null::numeric, 'financing_agreement', a.id
  from public.financing_agreements a
  where a.company_id = _company_id
    and a.deleted_at is null
    and a.rate_type = 'variable'
    and a.status is distinct from 'closed'

  union all
  select 'tax:' || e.id::text, 'high', 'tax', 'Tax payment approaching',
         coalesce(e.description, 'Tax item'), e.entry_date, e.amount_total, 'cash_flow_entry', e.id
  from public.cash_flow_entries e
  where e.company_id = _company_id
    and e.deleted_at is null
    and e.category = 'tax'
    and e.direction = 'outflow'
    and e.state in ('forecast','committed')
    and e.entry_date between current_date and current_date + 30

  union all
  select 'unreconciled', 'medium', 'banking', 'Unreconciled bank transactions',
         count(*)::text || ' transactions older than 14 days await reconciliation',
         min(t.transaction_date), sum(abs(t.amount)), 'bank_transaction', null::uuid
  from public.bank_transactions t
  where t.company_id = _company_id
    and t.deleted_at is null
    and t.reconciliation_status in ('unmatched','partially_matched')
    and t.transaction_date < current_date - 14
  having count(*) > 0

  union all
  select 'draft-ageing', 'low', 'bookkeeping', 'Draft documents awaiting approval',
         count(*)::text || ' drafts older than 14 days', min(d.issue_date),
         sum(d.gross_amount), 'financial_document', null::uuid
  from public.financial_documents d
  where d.company_id = _company_id
    and d.deleted_at is null
    and d.status = 'draft'
    and d.created_at < now() - interval '14 days'
  having count(*) > 0

  union all
  select 'missing-attachments', 'low', 'documents', 'Posted documents without evidence',
         count(*)::text || ' posted documents have no attachment linked',
         null::date, sum(d.gross_amount), 'financial_document', null::uuid
  from public.financial_documents d
  where d.company_id = _company_id
    and d.deleted_at is null
    and d.status = 'posted'
    and d.document_id is null
    and not exists (
      select 1 from public.document_links dl
      where dl.entity_type = 'financial_document' and dl.entity_id = d.id)
  having count(*) > 0;
end;
$$;

grant execute on function public.executive_alerts(uuid) to authenticated;

create or replace function public.close_financial_period(
  _period_id uuid,
  _notes text default null
) returns public.financial_periods
language plpgsql
security invoker
set search_path = public
as $$
declare p public.financial_periods%rowtype; drafts int;
begin
  select * into p from public.financial_periods where id = _period_id;
  if p.id is null then
    raise exception 'Period not found' using errcode = 'no_data_found';
  end if;
  if not public.can_manage_company(p.company_id) then
    raise exception 'Not authorised' using errcode = 'insufficient_privilege';
  end if;
  if p.status <> 'open' then
    raise exception 'Only an open period can be closed' using errcode = 'check_violation';
  end if;

  select count(*) into drafts
  from public.financial_documents d
  where d.company_id = p.company_id
    and d.deleted_at is null
    and d.status = 'draft'
    and d.issue_date between p.period_start and p.period_end;
  if drafts > 0 then
    raise exception 'Period still holds % draft document(s); post or cancel them first', drafts
      using errcode = 'check_violation';
  end if;

  perform public.recompute_period_totals(_period_id);

  update public.financial_periods
     set status = 'closed', closed_at = now(), closed_by = auth.uid(),
         notes = coalesce(_notes, notes)
   where id = _period_id
   returning * into p;

  return p;
end;
$$;

grant execute on function public.close_financial_period(uuid, text) to authenticated;

create or replace function public.reopen_financial_period(
  _period_id uuid,
  _reason text
) returns public.financial_periods
language plpgsql
security invoker
set search_path = public
as $$
declare p public.financial_periods%rowtype;
begin
  if coalesce(trim(_reason), '') = '' then
    raise exception 'A reason is required to reopen a period' using errcode = 'check_violation';
  end if;
  select * into p from public.financial_periods where id = _period_id;
  if p.id is null then
    raise exception 'Period not found' using errcode = 'no_data_found';
  end if;
  if not public.can_manage_company(p.company_id) then
    raise exception 'Not authorised' using errcode = 'insufficient_privilege';
  end if;
  if p.status <> 'closed' then
    raise exception 'Only a closed period can be reopened' using errcode = 'check_violation';
  end if;

  update public.financial_periods
     set status = 'open', closed_at = null, closed_by = null,
         notes = coalesce(notes || E'\n', '') || 'Reopened: ' || _reason
   where id = _period_id
   returning * into p;

  return p;
end;
$$;

grant execute on function public.reopen_financial_period(uuid, text) to authenticated;

create or replace function public.tg_guard_closed_period()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare closed_code text; target date;
begin
  target := coalesce(new.issue_date, old.issue_date);
  if target is null then return new; end if;

  select p.code into closed_code
  from public.financial_periods p
  where p.company_id = new.company_id
    and p.status in ('closed','filed')
    and target between p.period_start and p.period_end
  limit 1;

  if closed_code is null then return new; end if;

  if tg_op = 'INSERT' and new.status <> 'draft' then
    raise exception 'Period % is closed; a document dated % cannot be posted', closed_code, target
      using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    raise exception 'Period % is closed; document status cannot change', closed_code
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_closed_period on public.financial_documents;
create trigger guard_closed_period
before insert or update on public.financial_documents
for each row execute function public.tg_guard_closed_period();