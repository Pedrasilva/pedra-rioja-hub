CREATE OR REPLACE VIEW public.v_property_acquisition_totals AS
SELECT p.id AS property_id,
       p.company_id,
       sum(c.amount) FILTER (WHERE c.cost_type = 'price') AS purchase_price,
       sum(c.amount) FILTER (WHERE c.capitalisable) AS capitalised_total,
       sum(c.amount) AS acquisition_total
  FROM public.properties p
  LEFT JOIN public.property_acquisition_costs c
    ON c.property_id = p.id AND c.deleted_at IS NULL
 GROUP BY p.id, p.company_id;

ALTER VIEW public.v_property_acquisition_totals SET (security_invoker = true);