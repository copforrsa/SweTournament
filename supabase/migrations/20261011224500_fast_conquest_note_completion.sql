create table if not exists private.fast_conquest_note_completions (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

create or replace function public.fast_conquest_note_completion_status(p_tournament_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare t public.tournaments%rowtype; expected_count integer; rated_count integer; done boolean;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select * into t from public.tournaments where id=p_tournament_id and format='fast_conquest';
  if not found then raise exception 'Fast Conquête introuvable'; end if;
  if not private.swe_workspace_full_access(t.workspace_id) or not private.fast_present(t.id) then raise exception 'Accès réservé aux évaluateurs présents'; end if;
  select count(*) into expected_count from private.fast_note_participants(t.id) x where not ((private.fast_note_peers(t.id)->'self') ? x.player_id::text);
  select count(*) into rated_count from private.fast_note_participants(t.id) x where not ((private.fast_note_peers(t.id)->'self') ? x.player_id::text) and exists (select 1 from private.fast_conquest_notes n where n.tournament_id=t.id and n.user_id=auth.uid() and n.player_id=x.player_id and (n.rating is not null or n.initial_skills is not null));
  select exists(select 1 from private.fast_conquest_note_completions c where c.tournament_id=t.id and c.user_id=auth.uid()) into done;
  return jsonb_build_object('complete',done,'rated',rated_count,'expected',expected_count);
end $function$;

create or replace function public.fast_conquest_complete_notes(p_tournament_id uuid, p_complete boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare t public.tournaments%rowtype; s private.fast_conquest_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select * into t from public.tournaments where id=p_tournament_id and format='fast_conquest' for update;
  if not found then raise exception 'Fast Conquête introuvable'; end if;
  if not private.swe_workspace_full_access(t.workspace_id) or not private.fast_present(t.id) then raise exception 'Accès réservé aux évaluateurs présents'; end if;
  select * into s from private.fast_conquest_sessions where tournament_id=t.id;
  if not found or not s.notes_open or s.notes_closed then raise exception 'Notes fermées ou clôturées'; end if;
  if p_complete then
    insert into private.fast_conquest_note_completions(tournament_id,user_id,completed_at) values(t.id,auth.uid(),now()) on conflict(tournament_id,user_id) do update set completed_at=excluded.completed_at;
  else
    delete from private.fast_conquest_note_completions where tournament_id=t.id and user_id=auth.uid();
  end if;
  return public.fast_conquest_note_completion_status(t.id);
end $function$;

revoke all on function public.fast_conquest_note_completion_status(uuid) from public;
revoke all on function public.fast_conquest_complete_notes(uuid,boolean) from public;
grant execute on function public.fast_conquest_note_completion_status(uuid) to authenticated;
grant execute on function public.fast_conquest_complete_notes(uuid,boolean) to authenticated;
