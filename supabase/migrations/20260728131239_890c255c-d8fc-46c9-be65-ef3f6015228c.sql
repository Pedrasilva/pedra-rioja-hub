CREATE OR REPLACE FUNCTION public.record_property_event(_company_id uuid, _property_id uuid, _event_date date, _event_type text, _title text, _description text, _amount numeric, _source_type text, _source_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _property_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.property_events
    (company_id, property_id, event_date, event_type, title, description, amount,
     source_type, source_id, is_manual)
  VALUES (_company_id, _property_id, coalesce(_event_date, current_date), _event_type,
          _title, _description, _amount, _source_type, _source_id, false)
  ON CONFLICT (source_type, source_id, event_type) WHERE source_id IS NOT NULL DO UPDATE
    SET event_date = EXCLUDED.event_date, title = EXCLUDED.title,
        description = EXCLUDED.description, amount = EXCLUDED.amount, updated_at = now();
END $function$;