CREATE OR REPLACE VIEW public.v_search_index WITH (security_invoker = on) AS
-- Properties
SELECT p.company_id, 'property'::text AS entity_type, p.id AS entity_id,
       coalesce(p.code || ' — ', '') || p.name AS title,
       concat_ws(', ', p.city, p.district) AS subtitle,
       concat_ws(' ', p.code, p.name, p.address_line1, p.address_line2, p.city, p.district,
                 p.parish, p.matrix_article, p.land_registry_ref, p.notes) AS search_text,
       p.acquisition_date::timestamptz AS occurred_at,
       '/properties/' || p.id AS url_path,
       p.status::text AS status,
       false AS is_archived,
       p.id AS property_id,
       jsonb_build_object('city', p.city) AS metadata
FROM public.properties p WHERE p.deleted_at IS NULL

UNION ALL
-- Documents: routed to the owning property workspace, else the bookkeeping workspace
SELECT d.company_id, 'document', d.id, d.title,
       concat_ws(' · ', d.category, d.subcategory),
       concat_ws(' ', d.title, d.category, d.subcategory, d.original_filename,
                 array_to_string(d.tags, ' '), d.ocr_text, d.ai_summary, d.notes),
       d.issue_date::timestamptz,
       CASE WHEN dl.property_id IS NOT NULL
            THEN '/properties/' || dl.property_id || '?tab=documents&record=' || d.id
            ELSE '/bookkeeping?tab=purchases&record=' || d.id END,
       d.status::text, false, dl.property_id,
       jsonb_build_object('category', d.category)
FROM public.documents d
LEFT JOIN LATERAL (
  SELECT l.entity_id AS property_id
  FROM public.document_links l
  WHERE l.document_id = d.id AND l.entity_type = 'property'
  ORDER BY l.created_at
  LIMIT 1
) dl ON true
WHERE d.deleted_at IS NULL

UNION ALL
-- Financing agreements
SELECT f.company_id, 'financing', f.id, f.lender || coalesce(' — ' || f.reference, ''),
       f.type, concat_ws(' ', f.lender, f.reference, f.code, f.type, f.index_name, f.notes),
       f.start_date::timestamptz, '/financing/' || f.id,
       f.status::text, false, f.property_id, '{}'::jsonb
FROM public.financing_agreements f WHERE f.deleted_at IS NULL

UNION ALL
-- Tenants: routed to the property workspace of their most recent tenancy
SELECT t.company_id, 'tenant', t.id, t.name, t.tax_number,
       concat_ws(' ', t.code, t.name, t.legal_name, t.tax_number, t.email, t.phone, t.address, t.notes),
       t.created_at,
       CASE WHEN ta.property_id IS NOT NULL
            THEN '/properties/' || ta.property_id || '?tab=tenancies&record=' || t.id
            ELSE '/properties' END,
       t.status::text, false, ta.property_id, '{}'::jsonb
FROM public.tenants t
LEFT JOIN LATERAL (
  SELECT a.property_id
  FROM public.tenancy_agreements a
  WHERE a.tenant_id = t.id AND a.deleted_at IS NULL
  ORDER BY a.start_date DESC NULLS LAST
  LIMIT 1
) ta ON true
WHERE t.deleted_at IS NULL

UNION ALL
-- Capex projects: routed to the owning property workspace, else the operations capex tab
SELECT c.company_id, 'project', c.id, c.name, c.project_type,
       concat_ws(' ', c.code, c.name, c.project_type, c.contractor_name, c.notes),
       c.start_date::timestamptz,
       CASE WHEN c.property_id IS NOT NULL
            THEN '/properties/' || c.property_id || '?tab=projects&record=' || c.id
            ELSE '/operations?tab=capex&record=' || c.id END,
       c.status::text, false, c.property_id, '{}'::jsonb
FROM public.capex_projects c WHERE c.deleted_at IS NULL

UNION ALL
-- Commitments
SELECT cm.company_id, 'commitment', cm.id,
       coalesce(cm.code || ' — ', '') || cm.title,
       concat_ws(' · ', cm.commitment_type, cp.name, cm.status),
       concat_ws(' ', cm.code, cm.title, cm.description, cm.commitment_type, cm.status,
                 cm.approval_status, cp.name, cp.legal_name, cm.notes),
       cm.start_date::timestamptz,
       '/commitments/' || cm.id,
       cm.status::text, cm.archived_at IS NOT NULL, NULL::uuid,
       jsonb_build_object('approval_status', cm.approval_status, 'commitment_type', cm.commitment_type)
FROM public.commitments cm
LEFT JOIN public.counterparties cp ON cp.id = cm.counterparty_id
WHERE cm.deleted_at IS NULL

UNION ALL
-- Budgets (one row per budget; versions are searchable through the aggregated text)
SELECT b.company_id, 'budget', b.id,
       coalesce(b.code || ' — ', '') || b.name,
       concat_ws(' · ', 'FY ' || b.fiscal_year, pr.name, b.status),
       concat_ws(' ', b.code, b.name, b.fiscal_year::text, b.status, pr.name, pr.code,
                 pj.name, pj.code, b.notes, vs.version_text),
       make_date(b.fiscal_year, 1, 1)::timestamptz,
       '/budgets/' || b.id,
       b.status::text, b.archived_at IS NOT NULL, b.property_id,
       jsonb_build_object('fiscal_year', b.fiscal_year, 'published_versions', coalesce(vs.published_count, 0))
FROM public.budgets b
LEFT JOIN public.properties pr ON pr.id = b.property_id
LEFT JOIN public.capex_projects pj ON pj.id = b.project_id
LEFT JOIN LATERAL (
  SELECT string_agg('v' || v.version_no || ' ' || v.status, ' ') AS version_text,
         count(*) FILTER (WHERE v.status = 'published') AS published_count
  FROM public.budget_versions v WHERE v.budget_id = b.id
) vs ON true

UNION ALL
-- Preventive maintenance schedules
SELECT ms.company_id, 'maintenance_schedule', ms.id,
       coalesce(ms.code || ' — ', '') || ms.title,
       concat_ws(' · ', ms.schedule_kind, ms.frequency, pr.name),
       concat_ws(' ', ms.code, ms.title, ms.description, ms.schedule_kind, ms.frequency,
                 ms.asset_label, pr.name, pr.code, cp.name, ms.responsible_name, ms.notes),
       ms.start_date::timestamptz,
       '/operations?tab=preventive&record=' || ms.id,
       CASE WHEN ms.is_active THEN 'active' ELSE 'inactive' END,
       ms.archived_at IS NOT NULL, ms.property_id,
       jsonb_build_object('frequency', ms.frequency)
FROM public.maintenance_schedules ms
LEFT JOIN public.properties pr ON pr.id = ms.property_id
LEFT JOIN public.counterparties cp ON cp.id = ms.counterparty_id

UNION ALL
-- Maintenance jobs
SELECT mj.company_id, 'maintenance_job', mj.id,
       coalesce(mj.code || ' — ', '') || mj.title,
       concat_ws(' · ', mj.job_kind, mj.status, pr.name),
       concat_ws(' ', mj.code, mj.title, mj.description, mj.job_kind, mj.status, mj.priority,
                 pr.name, pr.code, cp.name, mj.responsible_name, mj.notes),
       coalesce(mj.target_date, mj.planned_date, mj.requested_date)::timestamptz,
       '/operations?tab=maintenance&record=' || mj.id,
       mj.status::text, mj.archived_at IS NOT NULL, mj.property_id,
       jsonb_build_object('job_kind', mj.job_kind, 'priority', mj.priority)
FROM public.maintenance_jobs mj
LEFT JOIN public.properties pr ON pr.id = mj.property_id
LEFT JOIN public.counterparties cp ON cp.id = mj.counterparty_id
WHERE mj.deleted_at IS NULL

UNION ALL
-- Counterparties
SELECT cp.company_id, 'counterparty', cp.id,
       coalesce(cp.code || ' — ', '') || cp.name,
       concat_ws(' · ', cp.trading_name, cp.counterparty_type, cp.city),
       concat_ws(' ', cp.code, cp.name, cp.legal_name, cp.trading_name, cp.nif,
                 cp.email, cp.phone, cp.contact_name, cp.city, cp.notes),
       cp.created_at,
       '/bookkeeping?tab=counterparties&record=' || cp.id,
       cp.status::text, false, NULL::uuid,
       jsonb_build_object('counterparty_type', cp.counterparty_type)
FROM public.counterparties cp WHERE cp.deleted_at IS NULL;

GRANT SELECT ON public.v_search_index TO authenticated;