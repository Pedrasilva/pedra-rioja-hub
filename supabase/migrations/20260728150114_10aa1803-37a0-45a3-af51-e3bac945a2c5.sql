CREATE OR REPLACE VIEW public.v_property_summary AS
SELECT p.id AS property_id,
       p.company_id,
       p.code,
       p.name,
       p.status,
       p.property_type,
       p.city,
       p.district,
       p.acquisition_date,
       p.drive_folder_url,
       at.acquisition_total,
       at.purchase_price,
       cv.current_valuation,
       cv.valuation_date,
       COALESCE(d.outstanding_debt, 0::numeric) AS outstanding_debt,
       CASE
         WHEN cv.current_valuation IS NULL AND at.acquisition_total IS NULL THEN NULL
         ELSE COALESCE(cv.current_valuation, at.acquisition_total, 0::numeric)
              - COALESCE(d.outstanding_debt, 0::numeric)
       END AS estimated_equity,
       COALESCE(rr.monthly_rent, 0::numeric) AS monthly_rent,
       COALESCE(rr.active_tenancies, 0::bigint) AS active_tenancies,
       oc.unit_count,
       oc.occupancy_pct
  FROM public.properties p
  LEFT JOIN public.v_property_acquisition_totals at ON at.property_id = p.id
  LEFT JOIN public.v_property_current_valuation cv ON cv.property_id = p.id
  LEFT JOIN public.v_property_debt_outstanding d ON d.property_id = p.id
  LEFT JOIN public.v_property_rent_roll rr ON rr.property_id = p.id
  LEFT JOIN public.v_property_occupancy oc ON oc.property_id = p.id
 WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_portfolio_summary AS
SELECT company_id,
       count(*) AS property_count,
       sum(acquisition_total) AS acquisition_total,
       sum(COALESCE(current_valuation, acquisition_total)) AS portfolio_value,
       sum(outstanding_debt) AS outstanding_debt,
       sum(estimated_equity) AS estimated_equity,
       sum(monthly_rent) AS monthly_rent
  FROM public.v_property_summary
 WHERE status NOT IN ('archived', 'sold')
 GROUP BY company_id;