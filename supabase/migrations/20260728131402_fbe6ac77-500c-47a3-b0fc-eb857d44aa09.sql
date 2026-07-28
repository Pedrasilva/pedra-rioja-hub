CREATE OR REPLACE FUNCTION public.tg_sync_dimension_value()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  ON CONFLICT (dimension_id, entity_id) WHERE entity_id IS NOT NULL DO UPDATE
    SET label = EXCLUDED.label, code = EXCLUDED.code, updated_at = now();
  RETURN NEW;
END $function$;