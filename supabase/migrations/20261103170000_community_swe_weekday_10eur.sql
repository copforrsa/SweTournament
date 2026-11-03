-- 10 EUR on weekdays before 21:30; other SWÉ rates unchanged.
DO $$
DECLARE body_sql text;
BEGIN
  SELECT pg_get_functiondef('public.create_community_swe_v3(text,text,text,uuid,timestamp with time zone,integer,text,boolean,text[],text)'::regprocedure) INTO body_sql;
  IF position('then 700 else 0 end;' IN body_sql) = 0 THEN
    RAISE EXCEPTION 'Pricing formula differs from expected value';
  END IF;
  EXECUTE replace(body_sql,'then 700 else 0 end;','then 700 else 1000 end;');
END $$;