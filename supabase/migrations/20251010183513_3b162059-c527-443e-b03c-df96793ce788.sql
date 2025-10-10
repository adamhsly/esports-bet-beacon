CREATE OR REPLACE FUNCTION public.set_faceit_match_date()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Use started_at if available, otherwise fall back to scheduled_at
  NEW.match_date := COALESCE((NEW.started_at)::date, (NEW.scheduled_at)::date);
  RETURN NEW;
END;
$function$;