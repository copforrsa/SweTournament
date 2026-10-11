do $$
declare context_definition text; manage_definition text;
begin
  select pg_get_functiondef('public.fast_conquest_context(uuid)'::regprocedure) into context_definition;
  if position('if not (a or d or c) then raise exception ''Accès réservé aux gestionnaires désignés et capitaines''; end if;' in context_definition)=0 then raise exception 'Garde Fast Conquête context introuvable'; end if;
  context_definition := replace(context_definition, 'if not (a or d or c) then raise exception ''Accès réservé aux gestionnaires désignés et capitaines''; end if;' || E'\n select * into s from private.fast_conquest_sessions where tournament_id=t.id;', E'select * into s from private.fast_conquest_sessions where tournament_id=t.id;\n if not (a or d or c or (coalesce(s.notes_open,false) and private.fast_present(t.id))) then raise exception ''Accès réservé aux gestionnaires désignés et capitaines''; end if;');
  context_definition := replace(context_definition, '''my_notes'',case when a or d then', '''my_notes'',case when a or d or (coalesce(s.notes_open,false) and private.fast_present(t.id)) then');
  execute context_definition;

  select pg_get_functiondef('public.fast_conquest_manage(uuid,text,jsonb)'::regprocedure) into manage_definition;
  if position('if not (a or private.fast_designated(t.id) or p_action=''confirm'' and exists' in manage_definition)=0 then raise exception 'Garde Fast Conquête manage introuvable'; end if;
  manage_definition := replace(manage_definition, 'if not (a or private.fast_designated(t.id) or p_action=''confirm'' and exists', 'if not (a or private.fast_designated(t.id) or (p_action=''note'' and private.fast_present(t.id)) or p_action=''confirm'' and exists');
  execute manage_definition;
end $$;
