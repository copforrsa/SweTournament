do $patch$
declare definition text;
begin
 select pg_get_functiondef('public.save_my_third_half_plan_v1(uuid,uuid,text,integer,text,uuid,uuid,uuid)'::regprocedure) into definition;
 if strpos(definition,'''cooler'', ''ice'', ''beers_12'', ''soft_drinks'', ''snacks'', ''other''')=0 then raise exception 'Unexpected contribution validation'; end if;
 definition:=replace(definition,'''cooler'', ''ice'', ''beers_12'', ''soft_drinks'', ''snacks'', ''other''','''cooler'', ''ice'', ''beers_3'', ''beers_5'', ''beers_6'', ''beers_12'', ''ti_punch'', ''fruits'', ''cups'', ''soft_drinks'', ''snacks'', ''other''');
 execute definition;
end $patch$;