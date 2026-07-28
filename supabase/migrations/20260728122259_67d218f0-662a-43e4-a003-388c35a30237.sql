-- =========================================================
-- Phase 1.5: property domain, dimensions, documents, views
-- =========================================================

-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION public.can_view_company(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = auth.uid() AND ur.company_id = _company_id)
$$;

CREATE OR REPLACE FUNCTION public.can_manage_company(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = auth.uid() AND ur.company_id = _company_id
                   AND ur.role IN ('owner','manager'))
$$;

CREATE OR REPLACE FUNCTION public.can_record_company(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = auth.uid() AND ur.company_id = _company_id
                   AND ur.role IN ('owner','manager','bookkeeper','assistant'))
$$;

REVOKE ALL ON FUNCTION public.can_view_company(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.can_manage_company(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.can_record_company(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_view_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_record_company(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_touch_row()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END $$;

-- ---------- real estate ----------
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  property_type text NOT NULL DEFAULT 'apartment'
    CHECK (property_type IN ('apartment','house','building','commercial','office','warehouse','land','garage','other')),
  status text NOT NULL DEFAULT 'owned'
    CHECK (status IN ('prospect','owned','under_works','for_rent','rented','for_sale','sold','archived')),
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  district text,
  parish text,
  country_code char(2) NOT NULL DEFAULT 'PT',
  matrix_article text,
  land_registry_ref text,
  conservatoria text,
  area_m2 numeric(12,2),
  gross_area_m2 numeric(12,2),
  year_built int,
  acquisition_date date,
  disposal_date date,
  main_image_document_id uuid,
  drive_folder_id text,
  drive_folder_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (company_id, code)
);

CREATE TABLE public.property_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text,
  unit_type text,
  floor text,
  area_m2 numeric(12,2),
  bedrooms int,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','rented','owner_use','under_works','unavailable')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (property_id, code)
);

CREATE TABLE public.property_acquisition_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  cost_type text NOT NULL
    CHECK (cost_type IN ('price','imt','stamp_duty','notary','registration','agency','legal','survey','bank_fees','other')),
  description text,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'EUR',
  incurred_on date,
  capitalisable boolean NOT NULL DEFAULT true,
  source_type text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE public.property_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  valuation_date date NOT NULL,
  amount numeric(14,2) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'EUR',
  method text NOT NULL DEFAULT 'internal'
    CHECK (method IN ('purchase','bank','appraiser','internal','market','tax')),
  valuer text,
  document_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE public.property_insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  insurer text NOT NULL,
  policy_number text,
  cover_type text,
  insured_amount numeric(14,2),
  premium_amount numeric(14,2),
  premium_frequency text DEFAULT 'annual'
    CHECK (premium_frequency IN ('monthly','quarterly','semiannual','annual','single')),
  start_date date,
  renewal_date date,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','lapsed','cancelled','pending')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE public.financing_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  code text,
  type text NOT NULL DEFAULT 'mortgage'
    CHECK (type IN ('mortgage','leasing','shareholder_loan','credit_line','other')),
  lender text NOT NULL,
  reference text,
  principal numeric(14,2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'EUR',
  start_date date,
  end_date date,
  term_months int,
  rate_type text NOT NULL DEFAULT 'euribor_spread'
    CHECK (rate_type IN ('fixed','euribor_spread','mixed')),
  fixed_rate numeric(7,4),
  index_name text,
  index_tenor text,
  spread numeric(7,4),
  repayment_type text DEFAULT 'annuity'
    CHECK (repayment_type IN ('annuity','linear','bullet','custom')),
  grace_months int DEFAULT 0,
  payment_day int,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','settled','cancelled')),
  current_version_id uuid,
  drive_folder_id text,
  drive_folder_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE public.financing_schedule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agreement_id uuid NOT NULL REFERENCES public.financing_agreements(id) ON DELETE CASCADE,
  version_no int NOT NULL,
  effective_from date NOT NULL,
  reason text NOT NULL DEFAULT 'origination'
    CHECK (reason IN ('origination','rate_reset','early_repayment','restructure','correction')),
  index_rate_used numeric(7,4),
  rate_applied numeric(7,4),
  is_current boolean NOT NULL DEFAULT true,
  generated_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (agreement_id, version_no)
);

CREATE TABLE public.financing_schedule_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.financing_schedule_versions(id) ON DELETE CASCADE,
  period_no int NOT NULL,
  due_date date NOT NULL,
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  interest numeric(14,2) NOT NULL DEFAULT 0,
  principal numeric(14,2) NOT NULL DEFAULT 0,
  insurance numeric(14,2) NOT NULL DEFAULT 0,
  fees numeric(14,2) NOT NULL DEFAULT 0,
  total_payment numeric(14,2) NOT NULL DEFAULT 0,
  closing_balance numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','due','settled','skipped')),
  settled_source_type text,
  settled_source_id uuid,
  settled_amount numeric(14,2),
  settled_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  UNIQUE (version_id, period_no)
);

CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  legal_name text,
  tax_number text,
  email text,
  phone text,
  address text,
  tenant_type text NOT NULL DEFAULT 'company'
    CHECK (tenant_type IN ('company','individual')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('prospect','active','former','blacklisted')),
  drive_folder_id text,
  drive_folder_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE public.tenancy_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.property_units(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  code text,
  start_date date NOT NULL,
  end_date date,
  notice_period_days int,
  base_rent numeric(14,2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'EUR',
  payment_day int DEFAULT 1,
  payment_frequency text NOT NULL DEFAULT 'monthly'
    CHECK (payment_frequency IN ('monthly','quarterly','semiannual','annual')),
  deposit_amount numeric(14,2) DEFAULT 0,
  indexation_type text NOT NULL DEFAULT 'none'
    CHECK (indexation_type IN ('none','ipc','fixed_pct','negotiated')),
  indexation_month int,
  indexation_pct numeric(7,4),
  vat_applicable boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','notice_given','ended','terminated')),
  drive_folder_id text,
  drive_folder_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE public.rent_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tenancy_id uuid NOT NULL REFERENCES public.tenancy_agreements(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  vat_amount numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','invoiced','paid','partial','overdue','written_off')),
  invoice_ref text,
  settled_source_type text,
  settled_source_id uuid,
  settled_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  UNIQUE (tenancy_id, period_start)
);

CREATE TABLE public.tenant_fitout_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenancy_id uuid REFERENCES public.tenancy_agreements(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  code text,
  description text,
  principal numeric(14,2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'EUR',
  start_date date,
  term_months int,
  interest_rate numeric(7,4) DEFAULT 0,
  repayment_type text NOT NULL DEFAULT 'linear'
    CHECK (repayment_type IN ('annuity','linear','bullet','rent_supplement','custom')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','settled','written_off')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE public.tenant_fitout_loan_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  loan_id uuid NOT NULL REFERENCES public.tenant_fitout_loans(id) ON DELETE CASCADE,
  period_no int NOT NULL,
  due_date date NOT NULL,
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  principal numeric(14,2) NOT NULL DEFAULT 0,
  interest numeric(14,2) NOT NULL DEFAULT 0,
  total_payment numeric(14,2) NOT NULL DEFAULT 0,
  closing_balance numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','due','settled','skipped')),
  settled_source_type text,
  settled_source_id uuid,
  settled_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  UNIQUE (loan_id, period_no)
);

CREATE TABLE public.capex_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  project_type text NOT NULL DEFAULT 'renovation'
    CHECK (project_type IN ('construction','renovation','maintenance','fitout','compliance','other')),
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','approved','in_progress','on_hold','completed','cancelled')),
  start_date date,
  target_end_date date,
  actual_end_date date,
  budget_amount numeric(14,2) DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'EUR',
  is_capitalisable boolean NOT NULL DEFAULT true,
  contractor_name text,
  contractor_ref uuid,
  drive_folder_id text,
  drive_folder_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE public.capex_project_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.capex_projects(id) ON DELETE CASCADE,
  description text,
  cost_type text DEFAULT 'works'
    CHECK (cost_type IN ('works','materials','labour','fees','licences','equipment','other')),
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'EUR',
  incurred_on date,
  is_capitalised boolean NOT NULL DEFAULT false,
  source_type text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE public.depreciation_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  capex_project_id uuid REFERENCES public.capex_projects(id) ON DELETE SET NULL,
  description text NOT NULL,
  category text DEFAULT 'building'
    CHECK (category IN ('land','building','improvement','equipment','fitout','other')),
  capitalised_amount numeric(14,2) NOT NULL DEFAULT 0,
  residual_value numeric(14,2) NOT NULL DEFAULT 0,
  in_service_date date,
  useful_life_years numeric(6,2),
  method text NOT NULL DEFAULT 'straight_line'
    CHECK (method IN ('straight_line','declining_balance','none')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','fully_depreciated','disposed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE public.depreciation_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.depreciation_assets(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  accumulated_amount numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','posted','reversed')),
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  UNIQUE (asset_id, period_start)
);

CREATE TABLE public.property_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  event_date date NOT NULL DEFAULT current_date,
  event_type text NOT NULL DEFAULT 'custom',
  title text NOT NULL,
  description text,
  amount numeric(14,2),
  currency char(3) DEFAULT 'EUR',
  source_type text,
  source_id uuid,
  is_manual boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz
);
CREATE UNIQUE INDEX property_events_source_key
  ON public.property_events (source_type, source_id, event_type)
  WHERE source_id IS NOT NULL;

-- ---------- documents / Google Drive ----------
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  subcategory text,
  doc_type text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','superseded','expired','archived')),
  issue_date date,
  expiry_date date,
  period text,
  amount numeric(14,2),
  currency char(3) DEFAULT 'EUR',
  tags text[] NOT NULL DEFAULT '{}',
  version int NOT NULL DEFAULT 1,
  supersedes_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  drive_file_id text,
  drive_folder_id text,
  drive_url text,
  drive_web_view_link text,
  drive_modified_at timestamptz,
  drive_checksum text,
  sync_status text NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending','linked','missing','renamed','moved','deleted','conflict')),
  last_synced_at timestamptz,
  original_filename text,
  mime_type text,
  size_bytes bigint,
  storage_path text,
  checksum text,
  ocr_text text,
  ai_summary text,
  uploaded_by uuid DEFAULT auth.uid(),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz
);
CREATE INDEX documents_company_idx ON public.documents (company_id, status);
CREATE INDEX documents_tags_idx ON public.documents USING gin (tags);
CREATE INDEX documents_search_idx ON public.documents
  USING gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(original_filename,'') || ' ' || coalesce(ocr_text,'') || ' ' || coalesce(ai_summary,'')));

CREATE TABLE public.document_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  relation text DEFAULT 'attachment',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  UNIQUE (document_id, entity_type, entity_id, relation)
);
CREATE INDEX document_links_entity_idx ON public.document_links (entity_type, entity_id);

CREATE TABLE public.drive_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  folder_kind text NOT NULL DEFAULT 'root',
  path text NOT NULL,
  drive_folder_id text,
  drive_url text,
  parent_folder_id text,
  sync_status text NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending','created','missing','renamed','moved','deleted','conflict')),
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid
);
CREATE UNIQUE INDEX drive_folders_entity_kind_idx
  ON public.drive_folders (company_id, entity_type, coalesce(entity_id, '00000000-0000-0000-0000-000000000000'::uuid), folder_kind);

-- ---------- dimensions (generic bookkeeping extension point) ----------
CREATE TABLE public.dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  target_table text,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  UNIQUE (company_id, code)
);

CREATE TABLE public.dimension_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  dimension_id uuid NOT NULL REFERENCES public.dimensions(id) ON DELETE CASCADE,
  code text,
  label text NOT NULL,
  entity_table text,
  entity_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid
);
CREATE UNIQUE INDEX dimension_values_entity_idx
  ON public.dimension_values (dimension_id, entity_id) WHERE entity_id IS NOT NULL;

CREATE TABLE public.transaction_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  dimension_id uuid NOT NULL REFERENCES public.dimensions(id) ON DELETE RESTRICT,
  dimension_value_id uuid NOT NULL REFERENCES public.dimension_values(id) ON DELETE RESTRICT,
  allocation_pct numeric(7,4) NOT NULL DEFAULT 100 CHECK (allocation_pct > 0 AND allocation_pct <= 100),
  amount numeric(14,2),
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  UNIQUE (source_type, source_id, dimension_value_id)
);
CREATE INDEX transaction_dimensions_source_idx ON public.transaction_dimensions (source_type, source_id);
CREATE INDEX transaction_dimensions_value_idx ON public.transaction_dimensions (dimension_value_id);

-- ---------- grants, RLS, policies, touch triggers ----------
DO $$
DECLARE
  t text;
  manage_tables text[] := ARRAY[
    'properties','property_units','property_acquisition_costs','property_valuations',
    'property_insurance_policies','financing_agreements','financing_schedule_versions',
    'financing_schedule_rows','tenants','tenancy_agreements','rent_schedules',
    'tenant_fitout_loans','tenant_fitout_loan_rows','capex_projects','capex_project_costs',
    'depreciation_assets','depreciation_entries','property_events','dimensions'];
  record_tables text[] := ARRAY[
    'documents','document_links','drive_folders','dimension_values','transaction_dimensions'];
BEGIN
  FOREACH t IN ARRAY manage_tables || record_tables LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can_view_company(company_id))',
      t || '_select', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_touch_row()',
      t || '_touch', t);
  END LOOP;

  FOREACH t IN ARRAY manage_tables LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id))',
      t || '_manage', t);
  END LOOP;

  FOREACH t IN ARRAY record_tables LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.can_record_company(company_id)) WITH CHECK (public.can_record_company(company_id))',
      t || '_manage', t);
  END LOOP;
END $$;

-- ---------- property code generation ----------
CREATE OR REPLACE FUNCTION public.tg_property_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE next_no int;
BEGIN
  IF NEW.code IS NULL OR btrim(NEW.code) = '' THEN
    SELECT coalesce(max(nullif(regexp_replace(code, '\D', '', 'g'), '')::int), 0) + 1
      INTO next_no FROM public.properties WHERE company_id = NEW.company_id;
    NEW.code := 'PR' || lpad(next_no::text, 3, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER properties_code BEFORE INSERT ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.tg_property_code();

-- ---------- standard dimensions per company ----------
CREATE OR REPLACE FUNCTION public.seed_company_dimensions(_company_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.dimensions (company_id, code, label, target_table, is_system, sort_order)
  VALUES
    (_company_id,'property','Property','properties',true,10),
    (_company_id,'unit','Unit','property_units',true,20),
    (_company_id,'project','Project','capex_projects',true,30),
    (_company_id,'financing','Financing','financing_agreements',true,40),
    (_company_id,'tenancy','Tenancy','tenancy_agreements',true,50),
    (_company_id,'tenant','Tenant','tenants',true,60),
    (_company_id,'tenant_loan','Tenant loan','tenant_fitout_loans',true,70),
    (_company_id,'supplier','Supplier',NULL,true,80),
    (_company_id,'client','Client',NULL,true,90),
    (_company_id,'cost_centre','Cost centre',NULL,true,100),
    (_company_id,'vat_category','VAT category',NULL,true,110)
  ON CONFLICT (company_id, code) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.seed_company_dimensions(uuid) FROM public, anon;

CREATE OR REPLACE FUNCTION public.tg_seed_company_dimensions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_company_dimensions(NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER companies_seed_dimensions AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.tg_seed_company_dimensions();

SELECT public.seed_company_dimensions(id) FROM public.companies;

-- ---------- register entities as dimension values ----------
CREATE OR REPLACE FUNCTION public.tg_sync_dimension_value()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  dim_code text := TG_ARGV[0];
  dim_id uuid;
  j jsonb := to_jsonb(NEW);
  v_label text;
  v_code text;
BEGIN
  SELECT id INTO dim_id FROM public.dimensions
   WHERE company_id = NEW.company_id AND code = dim_code;
  IF dim_id IS NULL THEN
    PERFORM public.seed_company_dimensions(NEW.company_id);
    SELECT id INTO dim_id FROM public.dimensions
     WHERE company_id = NEW.company_id AND code = dim_code;
  END IF;

  v_code  := coalesce(j->>'code', left(NEW.id::text, 8));
  v_label := coalesce(j->>'name', j->>'lender', j->>'description', v_code);
  IF j ? 'code' AND j->>'code' IS NOT NULL AND j->>'code' <> v_label THEN
    v_label := (j->>'code') || ' — ' || v_label;
  END IF;

  INSERT INTO public.dimension_values (company_id, dimension_id, code, label, entity_table, entity_id)
  VALUES (NEW.company_id, dim_id, v_code, v_label, TG_TABLE_NAME, NEW.id)
  ON CONFLICT (dimension_id, entity_id) DO UPDATE
    SET label = EXCLUDED.label, code = EXCLUDED.code, updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER properties_dimension AFTER INSERT OR UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_dimension_value('property');
CREATE TRIGGER property_units_dimension AFTER INSERT OR UPDATE ON public.property_units
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_dimension_value('unit');
CREATE TRIGGER capex_projects_dimension AFTER INSERT OR UPDATE ON public.capex_projects
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_dimension_value('project');
CREATE TRIGGER financing_agreements_dimension AFTER INSERT OR UPDATE ON public.financing_agreements
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_dimension_value('financing');
CREATE TRIGGER tenancy_agreements_dimension AFTER INSERT OR UPDATE ON public.tenancy_agreements
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_dimension_value('tenancy');
CREATE TRIGGER tenants_dimension AFTER INSERT OR UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_dimension_value('tenant');
CREATE TRIGGER tenant_fitout_loans_dimension AFTER INSERT OR UPDATE ON public.tenant_fitout_loans
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_dimension_value('tenant_loan');

-- ---------- automatic timeline events ----------
CREATE OR REPLACE FUNCTION public.record_property_event(
  _company_id uuid, _property_id uuid, _event_date date, _event_type text,
  _title text, _description text, _amount numeric, _source_type text, _source_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _property_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.property_events
    (company_id, property_id, event_date, event_type, title, description, amount,
     source_type, source_id, is_manual)
  VALUES (_company_id, _property_id, coalesce(_event_date, current_date), _event_type,
          _title, _description, _amount, _source_type, _source_id, false)
  ON CONFLICT (source_type, source_id, event_type) DO UPDATE
    SET event_date = EXCLUDED.event_date, title = EXCLUDED.title,
        description = EXCLUDED.description, amount = EXCLUDED.amount, updated_at = now();
END $$;
REVOKE ALL ON FUNCTION public.record_property_event(uuid,uuid,date,text,text,text,numeric,text,uuid) FROM public, anon;

CREATE OR REPLACE FUNCTION public.tg_event_property_purchase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.acquisition_date IS NOT NULL THEN
    PERFORM public.record_property_event(NEW.company_id, NEW.id, NEW.acquisition_date, 'purchase',
      'Property acquired', NEW.name, NULL, 'properties', NEW.id);
  END IF;
  IF NEW.disposal_date IS NOT NULL THEN
    PERFORM public.record_property_event(NEW.company_id, NEW.id, NEW.disposal_date, 'sold',
      'Property sold', NEW.name, NULL, 'properties_disposal', NEW.id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER properties_event AFTER INSERT OR UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.tg_event_property_purchase();

CREATE OR REPLACE FUNCTION public.tg_event_financing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.record_property_event(NEW.company_id, NEW.property_id, NEW.start_date,
    'mortgage_signed', NEW.lender || ' financing signed', NEW.reference, NEW.principal,
    'financing_agreements', NEW.id);
  IF NEW.status = 'settled' THEN
    PERFORM public.record_property_event(NEW.company_id, NEW.property_id, current_date,
      'mortgage_settled', NEW.lender || ' financing settled', NEW.reference, NULL,
      'financing_agreements_settled', NEW.id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER financing_agreements_event AFTER INSERT OR UPDATE ON public.financing_agreements
FOR EACH ROW EXECUTE FUNCTION public.tg_event_financing();

CREATE OR REPLACE FUNCTION public.tg_event_financing_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p uuid; l text;
BEGIN
  SELECT property_id, lender INTO p, l FROM public.financing_agreements WHERE id = NEW.agreement_id;
  IF NEW.version_no > 1 THEN
    PERFORM public.record_property_event(NEW.company_id, p, NEW.effective_from, 'mortgage_revised',
      coalesce(l,'Financing') || ' schedule v' || NEW.version_no, NEW.reason, NULL,
      'financing_schedule_versions', NEW.id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER financing_versions_event AFTER INSERT ON public.financing_schedule_versions
FOR EACH ROW EXECUTE FUNCTION public.tg_event_financing_version();

CREATE OR REPLACE FUNCTION public.tg_event_tenancy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tname text;
BEGIN
  SELECT name INTO tname FROM public.tenants WHERE id = NEW.tenant_id;
  PERFORM public.record_property_event(NEW.company_id, NEW.property_id, NEW.start_date,
    'tenant_moved_in', coalesce(tname,'Tenant') || ' tenancy started', NEW.code, NEW.base_rent,
    'tenancy_agreements', NEW.id);
  IF NEW.status IN ('ended','terminated') AND NEW.end_date IS NOT NULL THEN
    PERFORM public.record_property_event(NEW.company_id, NEW.property_id, NEW.end_date,
      'tenant_moved_out', coalesce(tname,'Tenant') || ' tenancy ended', NEW.code, NULL,
      'tenancy_agreements_end', NEW.id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tenancy_agreements_event AFTER INSERT OR UPDATE ON public.tenancy_agreements
FOR EACH ROW EXECUTE FUNCTION public.tg_event_tenancy();

CREATE OR REPLACE FUNCTION public.tg_event_project()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.start_date IS NOT NULL THEN
    PERFORM public.record_property_event(NEW.company_id, NEW.property_id, NEW.start_date,
      'project_started', NEW.name || ' started', NEW.project_type, NEW.budget_amount,
      'capex_projects', NEW.id);
  END IF;
  IF NEW.actual_end_date IS NOT NULL THEN
    PERFORM public.record_property_event(NEW.company_id, NEW.property_id, NEW.actual_end_date,
      'project_completed', NEW.name || ' completed', NEW.project_type, NULL,
      'capex_projects_completed', NEW.id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER capex_projects_event AFTER INSERT OR UPDATE ON public.capex_projects
FOR EACH ROW EXECUTE FUNCTION public.tg_event_project();

CREATE OR REPLACE FUNCTION public.tg_event_valuation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.record_property_event(NEW.company_id, NEW.property_id, NEW.valuation_date,
    'valuation', 'Valuation (' || NEW.method || ')', NEW.notes, NEW.amount,
    'property_valuations', NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER property_valuations_event AFTER INSERT OR UPDATE ON public.property_valuations
FOR EACH ROW EXECUTE FUNCTION public.tg_event_valuation();

CREATE OR REPLACE FUNCTION public.tg_event_insurance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.renewal_date IS NOT NULL THEN
    PERFORM public.record_property_event(NEW.company_id, NEW.property_id, NEW.renewal_date,
      'insurance_renewal', NEW.insurer || ' insurance renewal', NEW.policy_number, NEW.premium_amount,
      'property_insurance_policies', NEW.id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER property_insurance_event AFTER INSERT OR UPDATE ON public.property_insurance_policies
FOR EACH ROW EXECUTE FUNCTION public.tg_event_insurance();

-- ---------- derived views (dashboards are generated, never stored) ----------
CREATE VIEW public.v_property_acquisition_totals WITH (security_invoker = on) AS
SELECT p.id AS property_id, p.company_id,
       coalesce(sum(c.amount) FILTER (WHERE c.cost_type = 'price'), 0) AS purchase_price,
       coalesce(sum(c.amount) FILTER (WHERE c.capitalisable), 0) AS capitalised_total,
       coalesce(sum(c.amount), 0) AS acquisition_total
FROM public.properties p
LEFT JOIN public.property_acquisition_costs c
  ON c.property_id = p.id AND c.deleted_at IS NULL
GROUP BY p.id, p.company_id;

CREATE VIEW public.v_property_current_valuation WITH (security_invoker = on) AS
SELECT DISTINCT ON (v.property_id)
       v.property_id, v.company_id, v.amount AS current_valuation,
       v.valuation_date, v.method
FROM public.property_valuations v
WHERE v.deleted_at IS NULL
ORDER BY v.property_id, v.valuation_date DESC, v.created_at DESC;

CREATE VIEW public.v_property_debt_outstanding WITH (security_invoker = on) AS
SELECT a.property_id, a.company_id,
       sum(coalesce(r.closing_balance, a.principal)) AS outstanding_debt,
       count(*) AS agreement_count
FROM public.financing_agreements a
LEFT JOIN LATERAL (
  SELECT fr.closing_balance
  FROM public.financing_schedule_versions v
  JOIN public.financing_schedule_rows fr ON fr.version_id = v.id
  WHERE v.agreement_id = a.id AND v.is_current AND fr.due_date <= current_date
  ORDER BY fr.due_date DESC, fr.period_no DESC
  LIMIT 1
) r ON true
WHERE a.deleted_at IS NULL AND a.status = 'active' AND a.property_id IS NOT NULL
GROUP BY a.property_id, a.company_id;

CREATE VIEW public.v_property_rent_roll WITH (security_invoker = on) AS
SELECT t.property_id, t.company_id,
       count(*) FILTER (WHERE t.status = 'active') AS active_tenancies,
       coalesce(sum(t.base_rent) FILTER (WHERE t.status = 'active'), 0) AS monthly_rent
FROM public.tenancy_agreements t
WHERE t.deleted_at IS NULL
GROUP BY t.property_id, t.company_id;

CREATE VIEW public.v_property_occupancy WITH (security_invoker = on) AS
SELECT p.id AS property_id, p.company_id,
       count(u.id) AS unit_count,
       count(u.id) FILTER (WHERE u.status = 'rented') AS rented_units,
       CASE WHEN count(u.id) = 0 THEN NULL
            ELSE round(100.0 * count(u.id) FILTER (WHERE u.status = 'rented') / count(u.id), 2)
       END AS occupancy_pct
FROM public.properties p
LEFT JOIN public.property_units u ON u.property_id = p.id AND u.deleted_at IS NULL
GROUP BY p.id, p.company_id;

CREATE VIEW public.v_property_summary WITH (security_invoker = on) AS
SELECT p.id AS property_id, p.company_id, p.code, p.name, p.status, p.property_type,
       p.city, p.district, p.acquisition_date, p.drive_folder_url,
       coalesce(at.acquisition_total, 0) AS acquisition_total,
       coalesce(at.purchase_price, 0) AS purchase_price,
       cv.current_valuation, cv.valuation_date,
       coalesce(d.outstanding_debt, 0) AS outstanding_debt,
       coalesce(cv.current_valuation, at.acquisition_total, 0) - coalesce(d.outstanding_debt, 0) AS estimated_equity,
       coalesce(rr.monthly_rent, 0) AS monthly_rent,
       coalesce(rr.active_tenancies, 0) AS active_tenancies,
       oc.unit_count, oc.occupancy_pct
FROM public.properties p
LEFT JOIN public.v_property_acquisition_totals at ON at.property_id = p.id
LEFT JOIN public.v_property_current_valuation cv ON cv.property_id = p.id
LEFT JOIN public.v_property_debt_outstanding d ON d.property_id = p.id
LEFT JOIN public.v_property_rent_roll rr ON rr.property_id = p.id
LEFT JOIN public.v_property_occupancy oc ON oc.property_id = p.id
WHERE p.deleted_at IS NULL;

CREATE VIEW public.v_portfolio_summary WITH (security_invoker = on) AS
SELECT company_id,
       count(*) AS property_count,
       sum(acquisition_total) AS acquisition_total,
       sum(coalesce(current_valuation, acquisition_total)) AS portfolio_value,
       sum(outstanding_debt) AS outstanding_debt,
       sum(estimated_equity) AS estimated_equity,
       sum(monthly_rent) AS monthly_rent
FROM public.v_property_summary
GROUP BY company_id;

CREATE VIEW public.v_property_timeline WITH (security_invoker = on) AS
SELECT e.id, e.company_id, e.property_id, p.code AS property_code, p.name AS property_name,
       e.event_date, e.event_type, e.title, e.description, e.amount, e.is_manual,
       e.source_type, e.source_id
FROM public.property_events e
JOIN public.properties p ON p.id = e.property_id
WHERE e.deleted_at IS NULL;

CREATE VIEW public.v_search_index WITH (security_invoker = on) AS
SELECT p.company_id, 'property'::text AS entity_type, p.id AS entity_id,
       coalesce(p.code || ' — ', '') || p.name AS title,
       concat_ws(', ', p.city, p.district) AS subtitle,
       concat_ws(' ', p.code, p.name, p.address_line1, p.address_line2, p.city, p.district,
                 p.parish, p.matrix_article, p.land_registry_ref, p.notes) AS search_text,
       p.acquisition_date::timestamptz AS occurred_at,
       '/properties/' || p.id AS url_path
FROM public.properties p WHERE p.deleted_at IS NULL
UNION ALL
SELECT d.company_id, 'document', d.id, d.title,
       concat_ws(' · ', d.category, d.subcategory),
       concat_ws(' ', d.title, d.category, d.subcategory, d.original_filename,
                 array_to_string(d.tags, ' '), d.ocr_text, d.ai_summary, d.notes),
       d.issue_date::timestamptz, '/documents/' || d.id
FROM public.documents d WHERE d.deleted_at IS NULL
UNION ALL
SELECT f.company_id, 'financing', f.id, f.lender || coalesce(' — ' || f.reference, ''),
       f.type, concat_ws(' ', f.lender, f.reference, f.code, f.type, f.index_name, f.notes),
       f.start_date::timestamptz, '/financing/' || f.id
FROM public.financing_agreements f WHERE f.deleted_at IS NULL
UNION ALL
SELECT t.company_id, 'tenant', t.id, t.name, t.tax_number,
       concat_ws(' ', t.code, t.name, t.legal_name, t.tax_number, t.email, t.phone, t.address, t.notes),
       t.created_at, '/tenants/' || t.id
FROM public.tenants t WHERE t.deleted_at IS NULL
UNION ALL
SELECT c.company_id, 'project', c.id, c.name, c.project_type,
       concat_ws(' ', c.code, c.name, c.project_type, c.contractor_name, c.notes),
       c.start_date::timestamptz, '/projects/' || c.id
FROM public.capex_projects c WHERE c.deleted_at IS NULL;

GRANT SELECT ON public.v_property_acquisition_totals, public.v_property_current_valuation,
  public.v_property_debt_outstanding, public.v_property_rent_roll, public.v_property_occupancy,
  public.v_property_summary, public.v_portfolio_summary, public.v_property_timeline,
  public.v_search_index TO authenticated;