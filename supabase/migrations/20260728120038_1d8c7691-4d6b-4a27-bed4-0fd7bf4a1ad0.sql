-- ============================================================
-- Pedra Rioja — Phase 1 Foundation
-- ============================================================

CREATE TYPE public.app_role AS ENUM (
  'owner', 'manager', 'bookkeeper', 'assistant', 'approver', 'viewer'
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- companies
-- ------------------------------------------------------------
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  tax_number text,
  country_code char(2) NOT NULL DEFAULT 'PT',
  base_currency char(3) NOT NULL DEFAULT 'EUR',
  fiscal_year_start_month smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER companies_set_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- user_roles
-- ------------------------------------------------------------
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (user_id, company_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE INDEX user_roles_user_id_idx ON public.user_roles (user_id);
CREATE INDEX user_roles_company_id_idx ON public.user_roles (company_id);

-- ------------------------------------------------------------
-- security definer helpers (no recursive RLS)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_company_role(_user_id uuid, _company_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND company_id = _company_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND company_id = _company_id
  );
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY created_at
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.shares_company_with(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles a
    JOIN public.user_roles b ON a.company_id = b.company_id
    WHERE a.user_id = _viewer AND b.user_id = _target
  );
$$;

-- ------------------------------------------------------------
-- settings
-- ------------------------------------------------------------
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (company_id, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER settings_set_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- audit_log
-- ------------------------------------------------------------
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX audit_log_company_created_idx ON public.audit_log (company_id, created_at DESC);
CREATE INDEX audit_log_entity_idx ON public.audit_log (entity_type, entity_id);

-- ------------------------------------------------------------
-- policies
-- ------------------------------------------------------------

-- companies
CREATE POLICY "Members can view their company"
  ON public.companies FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), id));

CREATE POLICY "Owners can update their company"
  ON public.companies FOR UPDATE TO authenticated
  USING (public.has_company_role(auth.uid(), id, 'owner'))
  WITH CHECK (public.has_company_role(auth.uid(), id, 'owner'));

-- profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Owners and managers can view company profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.shares_company_with(auth.uid(), id)
    AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owners can view all company roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, 'owner'));

-- settings
CREATE POLICY "Members can view settings"
  ON public.settings FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Finance roles can insert settings"
  ON public.settings FOR INSERT TO authenticated
  WITH CHECK (
    public.has_company_role(auth.uid(), company_id, 'owner')
    OR public.has_company_role(auth.uid(), company_id, 'manager')
    OR public.has_company_role(auth.uid(), company_id, 'bookkeeper')
  );

CREATE POLICY "Finance roles can update settings"
  ON public.settings FOR UPDATE TO authenticated
  USING (
    public.has_company_role(auth.uid(), company_id, 'owner')
    OR public.has_company_role(auth.uid(), company_id, 'manager')
    OR public.has_company_role(auth.uid(), company_id, 'bookkeeper')
  )
  WITH CHECK (
    public.has_company_role(auth.uid(), company_id, 'owner')
    OR public.has_company_role(auth.uid(), company_id, 'manager')
    OR public.has_company_role(auth.uid(), company_id, 'bookkeeper')
  );

CREATE POLICY "Owners can delete settings"
  ON public.settings FOR DELETE TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, 'owner'));

-- audit_log (read-only from the app; writes happen server-side)
CREATE POLICY "Finance roles can read the audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (
    public.has_company_role(auth.uid(), company_id, 'owner')
    OR public.has_company_role(auth.uid(), company_id, 'manager')
    OR public.has_company_role(auth.uid(), company_id, 'bookkeeper')
  );

-- ------------------------------------------------------------
-- new user bootstrap: profile + role
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
  _existing_users int;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email,
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO _company_id FROM public.companies ORDER BY created_at LIMIT 1;
  IF _company_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO _existing_users FROM public.user_roles WHERE company_id = _company_id;

  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (NEW.id, _company_id, CASE WHEN _existing_users = 0 THEN 'owner'::public.app_role ELSE 'viewer'::public.app_role END)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- the operating company
-- ------------------------------------------------------------
INSERT INTO public.companies (name, legal_name, country_code, base_currency)
VALUES ('Pedra Rioja', 'Pedra Rioja', 'PT', 'EUR');
