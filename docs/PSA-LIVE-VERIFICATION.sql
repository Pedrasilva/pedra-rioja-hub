-- ============================================================================
-- PSA HUB — LIVE FINANCE VERIFICATION SCRIPT (READ-ONLY)
-- ============================================================================
-- Purpose : verify every material assumption in docs/PSA-BOOKKEEPING-INVENTORY.md
--           against the live PSA Hub database, before Phase 6e is designed.
-- Safety  : SELECT statements only. No DDL, no DML, no temp tables, no new
--           functions, no SET / RESET, no RLS changes. Nothing here writes.
-- How     : run section by section (see "HOW TO RUN" at the bottom).
--           Sections are independent — a failure in one does not block others.
-- Privacy : aggregates only. No descriptions, IBANs, emails, phones, or
--           document bodies are selected. Samples return ids + minimal fields,
--           capped at 20 rows.
-- Note    : several sections use the query_to_xml() catalogue trick to count
--           rows in tables that may or may not exist. That is a read-only
--           built-in; it executes the SELECT it is given and nothing else.
-- ============================================================================


-- ============================================================================
-- SECTION 0 — REQUIRED — WHICH FINANCE OBJECTS ACTUALLY EXIST
-- Establishes the real object list. Every later section is optional relative
-- to this one: if a table is absent here, skip the sections that use it.
-- ============================================================================
SELECT
  c.relnamespace::regnamespace::text            AS schema_name,
  c.relname                                     AS object_name,
  CASE c.relkind WHEN 'r' THEN 'table'
                 WHEN 'p' THEN 'partitioned_table'
                 WHEN 'v' THEN 'view'
                 WHEN 'm' THEN 'materialized_view'
                 WHEN 'f' THEN 'foreign_table'
                 ELSE c.relkind::text END       AS object_kind,
  c.relrowsecurity                              AS rls_enabled,
  c.relforcerowsecurity                         AS rls_forced,
  c.reltuples::bigint                           AS planner_estimated_rows,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size
FROM pg_class c
WHERE c.relnamespace::regnamespace::text = 'public'
  AND c.relkind IN ('r','p','v','m','f')
  AND (
       c.relname LIKE 'financial%'
    OR c.relname LIKE 'bank%'
    OR c.relname LIKE 'counterpart%'
    OR c.relname LIKE 'expense%'
    OR c.relname LIKE 'vat%'
    OR c.relname LIKE '%invoice%'
    OR c.relname LIKE '%payment%'
    OR c.relname LIKE '%reconcil%'
    OR c.relname IN ('companies','company_contacts','documents','document_links',
                     'audit_log','profiles','user_roles','projects','clients',
                     'suppliers','deals','contacts')
  )
ORDER BY object_kind, object_name;


-- ============================================================================
-- SECTION 1 — REQUIRED — EXACT ROW COUNTS FOR EVERY FINANCE-RELATED TABLE
-- Exact counts (not planner estimates), computed only for tables that exist.
-- ============================================================================
WITH t AS (
  SELECT c.oid, c.relnamespace::regnamespace::text AS schema_name, c.relname AS table_name
  FROM pg_class c
  WHERE c.relnamespace::regnamespace::text = 'public'
    AND c.relkind IN ('r','p')
    AND (
         c.relname LIKE 'financial%' OR c.relname LIKE 'bank%'
      OR c.relname LIKE 'counterpart%' OR c.relname LIKE 'expense%'
      OR c.relname LIKE 'vat%' OR c.relname LIKE '%invoice%'
      OR c.relname LIKE '%payment%' OR c.relname LIKE '%reconcil%'
      OR c.relname IN ('companies','documents','document_links','audit_log')
    )
)
SELECT
  t.schema_name,
  t.table_name,
  (xpath('/row/c/text()',
     query_to_xml(format('SELECT count(*) AS c FROM %I.%I', t.schema_name, t.table_name),
                  false, true, '')
  ))[1]::text::bigint AS exact_row_count
FROM t
ORDER BY exact_row_count DESC NULLS LAST, table_name;


-- ============================================================================
-- SECTION 2 — REQUIRED — COLUMN INVENTORY FOR THE FINANCE TABLES
-- Confirms column names/types before any later section assumes them.
-- Cross-check this against the inventory document field-by-field.
-- ============================================================================
SELECT
  c.table_name,
  c.ordinal_position       AS col_pos,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND (
       c.table_name LIKE 'financial%' OR c.table_name LIKE 'bank%'
    OR c.table_name LIKE 'counterpart%' OR c.table_name LIKE 'expense%'
    OR c.table_name LIKE 'vat%'
    OR c.table_name IN ('companies','documents','document_links')
  )
ORDER BY c.table_name, c.ordinal_position;


-- ============================================================================
-- SECTION 3 — REQUIRED — ENUM TYPES AND THEIR VALUES
-- Verifies lifecycle/status vocabularies against the canonical contract.
-- ============================================================================
SELECT
  t.typname                                  AS enum_type,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typnamespace::regnamespace::text = 'public'
GROUP BY t.typname
ORDER BY t.typname;


-- ============================================================================
-- SECTION 4 — REQUIRED — PRIMARY KEYS, UNIQUE AND CHECK CONSTRAINTS
-- ============================================================================
SELECT
  rel.relname                        AS table_name,
  con.conname                        AS constraint_name,
  CASE con.contype WHEN 'p' THEN 'primary_key'
                   WHEN 'u' THEN 'unique'
                   WHEN 'c' THEN 'check'
                   WHEN 'x' THEN 'exclusion' END AS constraint_kind,
  pg_get_constraintdef(con.oid)      AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relnamespace::regnamespace::text = 'public'
  AND con.contype IN ('p','u','c','x')
  AND (rel.relname LIKE 'financial%' OR rel.relname LIKE 'bank%'
    OR rel.relname LIKE 'expense%' OR rel.relname LIKE 'vat%'
    OR rel.relname IN ('companies','documents','document_links'))
ORDER BY rel.relname, constraint_kind, con.conname;


-- ============================================================================
-- SECTION 5 — REQUIRED — FOREIGN KEYS (both directions matter for Phase 6e)
-- ============================================================================
SELECT
  src.relname                   AS from_table,
  con.conname                   AS fk_name,
  tgt.relname                   AS to_table,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class src ON src.oid = con.conrelid
JOIN pg_class tgt ON tgt.oid = con.confrelid
WHERE con.contype = 'f'
  AND src.relnamespace::regnamespace::text = 'public'
  AND (
       src.relname LIKE 'financial%' OR src.relname LIKE 'bank%'
    OR src.relname LIKE 'expense%'   OR src.relname LIKE 'vat%'
    OR src.relname IN ('companies','documents','document_links')
    OR tgt.relname IN ('companies','financial_classifications','expense_categories')
  )
ORDER BY from_table, to_table, fk_name;


-- ============================================================================
-- SECTION 6 — REQUIRED — INDEXES ON FINANCE TABLES
-- ============================================================================
SELECT
  i.tablename  AS table_name,
  i.indexname  AS index_name,
  i.indexdef   AS definition
FROM pg_indexes i
WHERE i.schemaname = 'public'
  AND (i.tablename LIKE 'financial%' OR i.tablename LIKE 'bank%'
    OR i.tablename LIKE 'expense%'   OR i.tablename LIKE 'vat%'
    OR i.tablename IN ('companies','documents','document_links'))
ORDER BY i.tablename, i.indexname;


-- ============================================================================
-- SECTION 7 — REQUIRED — RLS STATUS AND POLICIES
-- Any finance table with rls_enabled = false is a security finding.
-- ============================================================================
SELECT
  c.relname               AS table_name,
  c.relrowsecurity        AS rls_enabled,
  count(p.polname)        AS policy_count
FROM pg_class c
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relnamespace::regnamespace::text = 'public'
  AND c.relkind = 'r'
  AND (c.relname LIKE 'financial%' OR c.relname LIKE 'bank%'
    OR c.relname LIKE 'expense%'   OR c.relname LIKE 'vat%'
    OR c.relname IN ('companies','documents','document_links'))
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relrowsecurity, policy_count, c.relname;

-- 7b — policy detail (expressions matter: look for fail-open `true` USING)
SELECT
  c.relname                        AS table_name,
  p.polname                        AS policy_name,
  CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
                ELSE 'ALL' END     AS command,
  pg_get_expr(p.polqual,  p.polrelid) AS using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expr,
  (SELECT string_agg(r.rolname, ',') FROM pg_roles r WHERE r.oid = ANY(p.polroles)) AS roles
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relnamespace::regnamespace::text = 'public'
  AND (c.relname LIKE 'financial%' OR c.relname LIKE 'bank%'
    OR c.relname LIKE 'expense%'   OR c.relname LIKE 'vat%'
    OR c.relname IN ('companies','documents','document_links'))
ORDER BY c.relname, p.polname;

-- 7c — table-level GRANTs (PostgREST reachability)
SELECT table_name, grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon','authenticated','service_role')
  AND (table_name LIKE 'financial%' OR table_name LIKE 'bank%'
    OR table_name LIKE 'expense%'   OR table_name IN ('companies'))
GROUP BY table_name, grantee
ORDER BY table_name, grantee;


-- ============================================================================
-- SECTION 8 — REQUIRED — TRIGGERS ON FINANCE TABLES
-- ============================================================================
SELECT
  c.relname                      AS table_name,
  tg.tgname                      AS trigger_name,
  p.proname                      AS function_name,
  tg.tgenabled                   AS enabled_flag,
  pg_get_triggerdef(tg.oid)      AS definition
FROM pg_trigger tg
JOIN pg_class c ON c.oid = tg.tgrelid
JOIN pg_proc  p ON p.oid = tg.tgfoid
WHERE NOT tg.tgisinternal
  AND c.relnamespace::regnamespace::text = 'public'
  AND (c.relname LIKE 'financial%' OR c.relname LIKE 'bank%'
    OR c.relname LIKE 'expense%'   OR c.relname LIKE 'vat%'
    OR c.relname IN ('companies','documents','document_links'))
ORDER BY c.relname, tg.tgname;


-- ============================================================================
-- SECTION 9 — REQUIRED — FUNCTIONS THAT REFERENCE FINANCE TABLES
-- Name + security mode + which finance tables the body mentions.
-- (Text match on the body — indicative, not a parse.)
-- ============================================================================
SELECT
  p.proname                                   AS function_name,
  CASE WHEN p.prosecdef THEN 'security_definer' ELSE 'invoker' END AS security_mode,
  pg_get_function_identity_arguments(p.oid)   AS arguments,
  (SELECT string_agg(x.t, ', ')
     FROM (VALUES ('financial_documents'),('financial_document_lines'),
                  ('financial_document_payments'),('financial_payments'),
                  ('financial_classifications'),('financial_periods'),
                  ('financial_period_totals'),('financial_income_items'),
                  ('financial_expense_items'),('financial_debts'),
                  ('financial_suppliers'),('financial_clients'),
                  ('bank_transactions'),('bank_accounts'),
                  ('bank_statement_imports'),('bank_classification_rules'),
                  ('companies')) AS x(t)
    WHERE pg_get_functiondef(p.oid) ILIKE '%'||x.t||'%')  AS references_tables
FROM pg_proc p
WHERE p.pronamespace::regnamespace::text = 'public'
  AND p.prokind = 'f'
  AND EXISTS (
    SELECT 1 FROM (VALUES ('financial_'),('bank_'),('companies')) AS y(t)
    WHERE pg_get_functiondef(p.oid) ILIKE '%'||y.t||'%')
ORDER BY p.proname;


-- ============================================================================
-- SECTION 10 — REQUIRED — DATE RANGES AND LIFECYCLE COUNTS PER TABLE
-- Run each block only if Section 0 listed the table. Each is standalone.
-- ============================================================================

-- 10a — financial_documents: volume, span, lifecycle, direction
SELECT
  'financial_documents'                    AS table_name,
  count(*)                                 AS rows_total,
  min(issue_date)                          AS earliest_issue_date,
  max(issue_date)                          AS latest_issue_date,
  min(created_at)                          AS earliest_created_at,
  max(created_at)                          AS latest_created_at,
  count(*) FILTER (WHERE created_at > now() - interval '90 days') AS created_last_90d
FROM public.financial_documents;

SELECT status, doc_type, count(*) AS rows_count,
       min(issue_date) AS first_issue, max(issue_date) AS last_issue
FROM public.financial_documents
GROUP BY status, doc_type
ORDER BY rows_count DESC;

-- 10b — financial_document_lines
SELECT 'financial_document_lines' AS table_name, count(*) AS rows_total,
       count(DISTINCT document_id) AS distinct_documents,
       min(created_at) AS earliest_created_at, max(created_at) AS latest_created_at
FROM public.financial_document_lines;

-- 10c — payments (PSA table name is financial_document_payments; the canonical
--       name is financial_payments — run whichever Section 0 reported)
SELECT 'financial_document_payments' AS table_name, count(*) AS rows_total,
       min(payment_date) AS earliest_payment, max(payment_date) AS latest_payment,
       min(created_at) AS earliest_created_at, max(created_at) AS latest_created_at
FROM public.financial_document_payments;

-- 10d — legacy planning layer
SELECT 'financial_income_items'  AS table_name, count(*) AS rows_total,
       min(created_at) AS earliest_created_at, max(created_at) AS latest_created_at
FROM public.financial_income_items;

SELECT 'financial_expense_items' AS table_name, count(*) AS rows_total,
       min(created_at) AS earliest_created_at, max(created_at) AS latest_created_at
FROM public.financial_expense_items;

SELECT 'financial_debts'         AS table_name, count(*) AS rows_total,
       min(created_at) AS earliest_created_at, max(created_at) AS latest_created_at
FROM public.financial_debts;

-- 10e — periods
SELECT status AS period_status, count(*) AS rows_count,
       min(period_start) AS first_period, max(period_start) AS last_period
FROM public.financial_periods
GROUP BY status ORDER BY rows_count DESC;

-- 10f — classifications: shared vs company scope, active flags
SELECT
  count(*)                                          AS rows_total,
  count(*) FILTER (WHERE company_id IS NULL)        AS shared_scope_rows,
  count(*) FILTER (WHERE company_id IS NOT NULL)    AS company_scope_rows,
  count(*) FILTER (WHERE is_active)                 AS active_rows,
  count(DISTINCT nature)                            AS distinct_natures
FROM public.financial_classifications;

-- 10g — soft-delete / archive columns actually in use (metadata probe first)
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('deleted_at','archived_at','is_archived','is_active','status','company_id')
  AND (table_name LIKE 'financial%' OR table_name LIKE 'bank%'
    OR table_name LIKE 'expense%' OR table_name = 'companies')
ORDER BY table_name, column_name;


-- ============================================================================
-- SECTION 11 — REQUIRED — PRODUCTION vs SEED vs TEST vs IMPORTED PROVENANCE
-- Aggregate only. Columns referenced here must appear in Section 2 first;
-- drop any predicate whose column is missing.
-- ============================================================================

-- 11a — financial_documents provenance buckets
SELECT
  count(*)                                                             AS rows_total,
  count(*) FILTER (WHERE invoicexpress_id IS NOT NULL)                 AS invoicexpress_created,
  count(*) FILTER (WHERE atcud IS NOT NULL AND atcud <> '')            AS has_atcud,
  count(*) FILTER (WHERE permalink_pdf IS NOT NULL)                    AS has_certified_pdf,
  count(*) FILTER (WHERE created_by IS NULL)                           AS created_by_null_likely_backfill,
  count(DISTINCT created_by)                                           AS distinct_creators,
  count(*) FILTER (WHERE date_trunc('second', created_at)
                          = date_trunc('second', updated_at))          AS never_updated
FROM public.financial_documents;

-- 11b — creation clustering: many rows in one second => bulk import/backfill
SELECT date_trunc('minute', created_at) AS created_minute,
       count(*) AS rows_created
FROM public.financial_documents
GROUP BY 1
HAVING count(*) > 5
ORDER BY rows_created DESC
LIMIT 20;

-- 11c — test-data smell (aggregate counts only, no content returned)
SELECT
  count(*) FILTER (WHERE document_number ILIKE '%test%')  AS number_contains_test,
  count(*) FILTER (WHERE document_number ILIKE '%demo%')  AS number_contains_demo,
  count(*) FILTER (WHERE document_number IS NULL
                      OR document_number = '')            AS number_missing,
  count(*) FILTER (WHERE gross_amount = 0)                AS zero_value_documents,
  count(*) FILTER (WHERE gross_amount < 0)                AS negative_documents
FROM public.financial_documents;

-- 11d — OCR provenance, if an ocr/source column exists (check Section 2 first)
-- SELECT source, count(*) AS rows_count FROM public.financial_documents GROUP BY source;

-- 11e — bank transactions provenance
SELECT
  count(*)                                              AS rows_total,
  count(DISTINCT import_id)                             AS distinct_imports,
  count(*) FILTER (WHERE import_id IS NULL)             AS manually_entered,
  min(transaction_date)                                 AS earliest_txn,
  max(transaction_date)                                 AS latest_txn
FROM public.bank_transactions;

-- 11f — audit_log coverage for finance entities (if audit_log exists)
SELECT table_name AS audited_table, action, count(*) AS entries,
       min(created_at) AS first_entry, max(created_at) AS last_entry
FROM public.audit_log
WHERE table_name LIKE 'financial%' OR table_name LIKE 'bank%'
GROUP BY table_name, action
ORDER BY entries DESC;


-- ============================================================================
-- SECTION 12 — REQUIRED (Step 3B) — `companies` ROLE ANALYSIS
-- Determines whether `companies` is a counterparty master, a CRM entity, or
-- both — the decision that drives the counterparties rename strategy.
-- ============================================================================

-- 12a — role flags as stored
SELECT
  count(*)                                                       AS rows_total,
  count(*) FILTER (WHERE is_supplier)                            AS flagged_supplier,
  count(*) FILTER (WHERE is_client)                              AS flagged_client,
  count(*) FILTER (WHERE is_supplier AND is_client)              AS flagged_both,
  count(*) FILTER (WHERE NOT coalesce(is_supplier,false)
                     AND NOT coalesce(is_client,false))          AS flagged_neither
FROM public.companies;

-- 12b — roles as actually used by referencing data
WITH used_supplier AS (
  SELECT DISTINCT company_id FROM public.financial_documents
  WHERE company_id IS NOT NULL AND doc_type IN ('purchase_invoice','bill','expense','purchase')
), used_client AS (
  SELECT DISTINCT company_id FROM public.financial_documents
  WHERE company_id IS NOT NULL AND doc_type IN ('sales_invoice','invoice','credit_note','receipt')
), used_any_doc AS (
  SELECT DISTINCT company_id FROM public.financial_documents WHERE company_id IS NOT NULL
)
SELECT
  (SELECT count(*) FROM public.companies)                      AS companies_total,
  (SELECT count(*) FROM used_supplier)                         AS used_as_supplier,
  (SELECT count(*) FROM used_client)                           AS used_as_client,
  (SELECT count(*) FROM used_supplier s JOIN used_client c USING (company_id)) AS used_in_both_roles,
  (SELECT count(*) FROM used_any_doc)                          AS referenced_by_finance_docs,
  (SELECT count(*) FROM public.companies co
     WHERE NOT EXISTS (SELECT 1 FROM used_any_doc u WHERE u.company_id = co.id))
                                                               AS never_referenced_by_finance;

-- 12c — every table that references companies, with live reference counts.
--       Metadata-driven: only real FKs are counted, so nothing can 404.
WITH refs AS (
  SELECT src.relname AS from_table,
         (SELECT a.attname FROM pg_attribute a
           WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[1]) AS from_column
  FROM pg_constraint con
  JOIN pg_class src ON src.oid = con.conrelid
  JOIN pg_class tgt ON tgt.oid = con.confrelid
  WHERE con.contype = 'f' AND tgt.relname = 'companies'
    AND src.relnamespace::regnamespace::text = 'public'
)
SELECT
  refs.from_table,
  refs.from_column,
  (xpath('/row/c/text()', query_to_xml(
     format('SELECT count(*) AS c FROM public.%I WHERE %I IS NOT NULL',
            refs.from_table, refs.from_column), false, true, '')
  ))[1]::text::bigint AS non_null_references,
  (xpath('/row/c/text()', query_to_xml(
     format('SELECT count(DISTINCT %I) AS c FROM public.%I', refs.from_column, refs.from_table),
     false, true, '')
  ))[1]::text::bigint AS distinct_companies_referenced
FROM refs
ORDER BY non_null_references DESC NULLS LAST;

-- 12d — NIF hygiene (counts + duplicate groups only, no names emitted)
SELECT
  count(*)                                                        AS rows_total,
  count(*) FILTER (WHERE nif IS NULL OR btrim(nif) = '')          AS nif_missing,
  count(*) FILTER (WHERE nif IS NOT NULL AND nif !~ '^[0-9]{9}$') AS nif_not_9_digits,
  count(DISTINCT nif) FILTER (WHERE nif IS NOT NULL)              AS distinct_nifs
FROM public.companies;

SELECT nif, count(*) AS duplicate_rows
FROM public.companies
WHERE nif IS NOT NULL AND btrim(nif) <> ''
GROUP BY nif HAVING count(*) > 1
ORDER BY duplicate_rows DESC
LIMIT 20;

SELECT lower(btrim(name)) AS normalised_name, count(*) AS duplicate_rows
FROM public.companies
GROUP BY 1 HAVING count(*) > 1
ORDER BY duplicate_rows DESC
LIMIT 20;

-- 12e — default_classification_id resolution
SELECT
  count(*)                                                   AS rows_total,
  count(default_classification_id)                           AS with_default_classification,
  count(DISTINCT default_classification_id)                  AS distinct_classification_ids
FROM public.companies;

-- resolves against financial_classifications?
SELECT count(*) AS resolves_to_financial_classifications
FROM public.companies co
JOIN public.financial_classifications fc ON fc.id = co.default_classification_id;

-- resolves against expense_categories? (skip if Section 0 has no such table)
SELECT count(*) AS resolves_to_expense_categories
FROM public.companies co
JOIN public.expense_categories ec ON ec.id = co.default_classification_id;

-- unresolved against both
SELECT count(*) AS unresolved_default_classification_ids
FROM public.companies co
WHERE co.default_classification_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.financial_classifications fc WHERE fc.id = co.default_classification_id)
  AND NOT EXISTS (SELECT 1 FROM public.expense_categories ec       WHERE ec.id = co.default_classification_id);

-- sample of unresolved rows: ids only
SELECT co.id AS company_id, co.default_classification_id
FROM public.companies co
WHERE co.default_classification_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.financial_classifications fc WHERE fc.id = co.default_classification_id)
LIMIT 20;


-- ============================================================================
-- SECTION 13 — REQUIRED (Step 3C) — LEGACY PLANNING vs DOCUMENT CHAIN
-- Assumptions, stated explicitly:
--   * legacy items are monthly rows keyed by a month/period column; the query
--     below groups on the first month-like column reported in Section 2 —
--     adjust the GROUP BY expression if your column differs;
--   * document-chain months use financial_documents.issue_date;
--   * payment months use payment_date;
--   * sales vs purchases split by doc_type — adjust the IN-lists to match the
--     real enum values returned by Section 3.
-- ============================================================================

-- 13a — legacy income by month
SELECT date_trunc('month', period_month)::date AS month,
       count(*)      AS legacy_income_rows,
       sum(amount)   AS legacy_income_total
FROM public.financial_income_items
GROUP BY 1 ORDER BY 1;

-- 13b — legacy expenses by month
SELECT date_trunc('month', period_month)::date AS month,
       count(*)      AS legacy_expense_rows,
       sum(amount)   AS legacy_expense_total
FROM public.financial_expense_items
GROUP BY 1 ORDER BY 1;

-- 13c — legacy debt by month
SELECT date_trunc('month', period_month)::date AS month,
       count(*)      AS legacy_debt_rows,
       sum(amount)   AS legacy_debt_total
FROM public.financial_debts
GROUP BY 1 ORDER BY 1;

-- 13d — document chain by month, split by direction
SELECT date_trunc('month', issue_date)::date AS month,
       count(*) FILTER (WHERE doc_type IN ('sales_invoice','invoice','credit_note','receipt'))   AS sales_docs,
       sum(gross_amount) FILTER (WHERE doc_type IN ('sales_invoice','invoice','credit_note','receipt')) AS sales_gross,
       count(*) FILTER (WHERE doc_type IN ('purchase_invoice','bill','expense','purchase'))      AS purchase_docs,
       sum(gross_amount) FILTER (WHERE doc_type IN ('purchase_invoice','bill','expense','purchase')) AS purchase_gross,
       sum(vat_amount)   AS vat_total
FROM public.financial_documents
WHERE status <> 'cancelled'
GROUP BY 1 ORDER BY 1;

-- 13e — payments and outstanding by month
SELECT date_trunc('month', payment_date)::date AS month,
       count(*)      AS payment_rows,
       sum(amount)   AS payments_total
FROM public.financial_document_payments
GROUP BY 1 ORDER BY 1;

SELECT date_trunc('month', issue_date)::date AS month,
       sum(coalesce(gross_amount,0) - coalesce(paid_amount,0)) AS outstanding_total
FROM public.financial_documents
WHERE status <> 'cancelled'
GROUP BY 1 ORDER BY 1;

-- 13f — side-by-side legacy vs document chain, with absolute and % variance
WITH legacy AS (
  SELECT date_trunc('month', period_month)::date AS month,
         sum(amount) AS legacy_income, 0::numeric AS legacy_expense
  FROM public.financial_income_items GROUP BY 1
  UNION ALL
  SELECT date_trunc('month', period_month)::date, 0, sum(amount)
  FROM public.financial_expense_items GROUP BY 1
), legacy_m AS (
  SELECT month, sum(legacy_income) AS legacy_income, sum(legacy_expense) AS legacy_expense
  FROM legacy GROUP BY month
), docs_m AS (
  SELECT date_trunc('month', issue_date)::date AS month,
         sum(gross_amount) FILTER (WHERE doc_type IN ('sales_invoice','invoice','credit_note','receipt'))  AS doc_income,
         sum(gross_amount) FILTER (WHERE doc_type IN ('purchase_invoice','bill','expense','purchase'))     AS doc_expense
  FROM public.financial_documents WHERE status <> 'cancelled' GROUP BY 1
)
SELECT
  coalesce(l.month, d.month)                              AS month,
  coalesce(l.legacy_income,0)                             AS legacy_income,
  coalesce(d.doc_income,0)                                AS document_income,
  coalesce(d.doc_income,0) - coalesce(l.legacy_income,0)  AS income_abs_diff,
  round(100 * (coalesce(d.doc_income,0) - coalesce(l.legacy_income,0))
        / nullif(abs(coalesce(l.legacy_income,0)),0), 1)  AS income_pct_diff,
  coalesce(l.legacy_expense,0)                            AS legacy_expense,
  coalesce(d.doc_expense,0)                               AS document_expense,
  coalesce(d.doc_expense,0) - coalesce(l.legacy_expense,0) AS expense_abs_diff,
  round(100 * (coalesce(d.doc_expense,0) - coalesce(l.legacy_expense,0))
        / nullif(abs(coalesce(l.legacy_expense,0)),0), 1) AS expense_pct_diff
FROM legacy_m l
FULL JOIN docs_m d ON d.month = l.month
ORDER BY month;

-- 13g — period totals table vs recomputed document totals (dashboard source)
SELECT p.id AS period_id, p.period_start, p.status,
       count(d.id)              AS documents_in_period,
       sum(d.gross_amount)      AS documents_gross,
       sum(d.vat_amount)        AS documents_vat
FROM public.financial_periods p
LEFT JOIN public.financial_documents d
       ON d.period_id = p.id AND d.status <> 'cancelled'
GROUP BY p.id, p.period_start, p.status
ORDER BY p.period_start;


-- ============================================================================
-- SECTION 14 — REQUIRED — BANKING
-- ============================================================================

-- 14a — accounts and transaction volume (no IBANs returned)
SELECT a.id AS account_id, a.name AS account_name, a.currency,
       count(t.id)                AS transactions,
       min(t.transaction_date)    AS earliest_txn,
       max(t.transaction_date)    AS latest_txn,
       sum(t.amount)              AS net_amount
FROM public.bank_accounts a
LEFT JOIN public.bank_transactions t ON t.bank_account_id = a.id
GROUP BY a.id, a.name, a.currency
ORDER BY transactions DESC;

-- 14b — transaction status distribution
SELECT status AS transaction_status, count(*) AS rows_count,
       min(transaction_date) AS first_txn, max(transaction_date) AS last_txn
FROM public.bank_transactions
GROUP BY status ORDER BY rows_count DESC;

-- 14c — import batches
SELECT status AS import_status, count(*) AS batches,
       min(created_at) AS first_import, max(created_at) AS last_import
FROM public.bank_statement_imports
GROUP BY status ORDER BY batches DESC;

-- 14d — reconciliation coverage
SELECT
  count(*)                                                     AS transactions_total,
  count(*) FILTER (WHERE status = 'reconciled')                AS reconciled,
  count(*) FILTER (WHERE status <> 'reconciled')               AS not_reconciled,
  round(100.0 * count(*) FILTER (WHERE status = 'reconciled') / nullif(count(*),0), 1)
                                                               AS reconciled_pct
FROM public.bank_transactions;

-- 14e — duplicate candidates (fingerprint column if present, else natural key)
SELECT bank_account_id, transaction_date, amount, count(*) AS duplicate_rows
FROM public.bank_transactions
GROUP BY 1,2,3 HAVING count(*) > 1
ORDER BY duplicate_rows DESC
LIMIT 20;

-- 14f — classification rules and whether they are used at all
SELECT count(*) AS rules_total,
       count(*) FILTER (WHERE is_active) AS active_rules,
       min(created_at) AS first_rule, max(created_at) AS last_rule
FROM public.bank_classification_rules;

-- 14g — orphan references: transactions pointing at missing accounts/imports
SELECT count(*) AS txns_with_missing_account
FROM public.bank_transactions t
WHERE t.bank_account_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.bank_accounts a WHERE a.id = t.bank_account_id);


-- ============================================================================
-- SECTION 15 — OPTIONAL — INCOMPLETE WORKFLOW EVIDENCE
-- Omit any block whose table/column Section 0/2 did not report.
-- ============================================================================

-- 15a — internal transfers awaiting pairing
SELECT count(*) AS transfers_flagged,
       count(*) FILTER (WHERE transfer_pair_id IS NULL) AS awaiting_pairing
FROM public.bank_transactions
WHERE is_internal_transfer IS TRUE;

-- 15b — documents fully paid yet not marked as such (and the reverse)
SELECT
  count(*) FILTER (WHERE coalesce(paid_amount,0) >= coalesce(gross_amount,0)
                     AND coalesce(gross_amount,0) > 0
                     AND payment_state <> 'paid')                 AS paid_but_not_marked,
  count(*) FILTER (WHERE payment_state = 'paid'
                     AND coalesce(paid_amount,0) < coalesce(gross_amount,0)) AS marked_paid_but_short,
  count(*) FILTER (WHERE coalesce(paid_amount,0) > coalesce(gross_amount,0)) AS overpaid
FROM public.financial_documents;

-- 15c — settlements deleted rather than reversed: documents whose paid_amount
--       does not match the sum of surviving payment rows
SELECT count(*) AS documents_with_payment_drift
FROM public.financial_documents d
LEFT JOIN (
  SELECT document_id, sum(amount) AS payments_sum
  FROM public.financial_document_payments GROUP BY document_id
) p ON p.document_id = d.id
WHERE round(coalesce(d.paid_amount,0),2) <> round(coalesce(p.payments_sum,0),2);

SELECT d.id AS document_id, d.status, d.paid_amount,
       coalesce(p.payments_sum,0) AS payments_sum
FROM public.financial_documents d
LEFT JOIN (
  SELECT document_id, sum(amount) AS payments_sum
  FROM public.financial_document_payments GROUP BY document_id
) p ON p.document_id = d.id
WHERE round(coalesce(d.paid_amount,0),2) <> round(coalesce(p.payments_sum,0),2)
LIMIT 20;

-- 15d — InvoiceXpress sync state
SELECT
  count(*)                                              AS rows_total,
  count(*) FILTER (WHERE invoicexpress_id IS NOT NULL)  AS synced,
  count(*) FILTER (WHERE invoicexpress_id IS NULL
                     AND status = 'issued')             AS issued_but_unsynced,
  count(*) FILTER (WHERE permalink_pdf IS NULL
                     AND invoicexpress_id IS NOT NULL)  AS synced_without_pdf
FROM public.financial_documents;

-- 15e — documents with no stored attachment
SELECT count(*) AS documents_without_attachment
FROM public.financial_documents d
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_links dl WHERE dl.entity_id = d.id
);

-- 15f — VAT vocabulary actually in use
SELECT vat_rate, count(*) AS lines_count
FROM public.financial_document_lines
GROUP BY vat_rate ORDER BY lines_count DESC
LIMIT 20;

-- 15g — data behind UI that is still a placeholder
SELECT 'bank_accounts'             AS table_name, count(*) AS rows_total FROM public.bank_accounts
UNION ALL SELECT 'bank_classification_rules', count(*) FROM public.bank_classification_rules
UNION ALL SELECT 'vat_rates',                  count(*) FROM public.vat_rates;


-- ============================================================================
-- SECTION 16 — REQUIRED — FINAL SUMMARY (one row, paste this first)
-- Each subquery is independent; drop any line whose table does not exist.
-- ============================================================================
SELECT
  (SELECT count(*) FROM public.companies)                        AS companies_rows,
  (SELECT count(*) FROM public.financial_documents)              AS documents_rows,
  (SELECT count(*) FROM public.financial_document_lines)         AS document_lines_rows,
  (SELECT count(*) FROM public.financial_document_payments)      AS payment_rows,
  (SELECT count(*) FROM public.financial_classifications)        AS classification_rows,
  (SELECT count(*) FROM public.financial_periods)                AS period_rows,
  (SELECT count(*) FROM public.financial_income_items)           AS legacy_income_rows,
  (SELECT count(*) FROM public.financial_expense_items)          AS legacy_expense_rows,
  (SELECT count(*) FROM public.financial_debts)                  AS legacy_debt_rows,
  (SELECT count(*) FROM public.bank_accounts)                    AS bank_account_rows,
  (SELECT count(*) FROM public.bank_transactions)                AS bank_transaction_rows,
  (SELECT count(*) FROM public.bank_statement_imports)           AS bank_import_rows,
  (SELECT count(*) FROM public.bank_classification_rules)        AS bank_rule_rows,
  (SELECT count(*) FROM pg_class c WHERE c.relnamespace::regnamespace::text='public'
     AND c.relkind='r' AND NOT c.relrowsecurity
     AND (c.relname LIKE 'financial%' OR c.relname LIKE 'bank%'
       OR c.relname='companies'))                                AS finance_tables_without_rls;


-- ============================================================================
-- HOW TO RUN / WHAT TO SEND BACK
-- ============================================================================
-- Run in sections, not as one script. Sections 0–9 are catalogue queries and
-- always succeed. Sections 10–16 touch real tables: if a table or column named
-- there was not reported by Section 0 / Section 2, delete that block rather
-- than fighting the error. Run Section 0 and Section 2 FIRST and adjust the
-- later blocks (doc_type values, period_month, paid_amount, status) to the
-- names they actually report.
--
-- ESSENTIAL — please paste back in full:
--   Section 0   object inventory
--   Section 1   exact row counts
--   Section 3   enum values
--   Section 7   RLS status + policy detail
--   Section 12  companies role analysis (all blocks)
--   Section 13f legacy vs document-chain variance
--   Section 16  final summary row
--
-- IMPORTANT — paste if output size allows:
--   Section 5   foreign keys
--   Section 8   triggers
--   Section 10  date ranges and lifecycle counts
--   Section 11  provenance
--   Section 14  banking
--
-- OPTIONAL — omit if the output is large:
--   Section 2   full column inventory (or send only for financial_documents,
--               financial_document_lines, financial_document_payments, companies)
--   Section 4   constraints
--   Section 6   indexes
--   Section 9   function inventory
--   Section 15  incomplete-workflow evidence
--
-- Nothing here returns invoice text, contact details, IBANs or document bodies.
-- Samples are capped at 20 rows and return ids plus numeric diagnostics only.
-- ============================================================================
