-- Administrative progress view for the Fast Conquête post-match voting room.
-- It deliberately exposes only participation counts, never who rated whom.
create or replace function public.fast_conquest_note_access_summary(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  t public.tournaments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;

  select * into t
  from public.tournaments
  where id = p_tournament_id
    and format = 'fast_conquest';

  if not found then
    raise exception 'Fast Conquête introuvable';
  end if;

  if not private.fast_admin(t.workspace_id) then
    raise exception 'Accès organisateur requis';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'user_id', x.user_id,
        'name', x.name,
        'role', x.role,
        'rated', x.rated,
        'expected', x.expected,
        'has_voted', x.rated > 0,
        'completed', x.completed,
        'last_vote_at', x.last_vote_at
      )
      order by lower(x.name), x.user_id
    )
    from (
      select
        m.user_id,
        coalesce(p.name, 'Co-gestionnaire') as name,
        m.role,
        (
          select count(*)
          from private.fast_conquest_notes n
          where n.tournament_id = t.id
            and n.user_id = m.user_id
            and (n.rating is not null or n.initial_skills is not null)
        ) as rated,
        (
          select count(*)
          from private.fast_note_participants(t.id) fp
          where fp.player_id is distinct from m.linked_player_id
        ) as expected,
        exists (
          select 1
          from private.fast_conquest_note_completions c
          where c.tournament_id = t.id
            and c.user_id = m.user_id
        ) as completed,
        (
          select max(n.updated_at)
          from private.fast_conquest_notes n
          where n.tournament_id = t.id
            and n.user_id = m.user_id
            and (n.rating is not null or n.initial_skills is not null)
        ) as last_vote_at
      from public.workspace_members m
      left join public.players p on p.id = m.linked_player_id
      left join public.tournament_players tp
        on tp.tournament_id = t.id
       and tp.player_id = m.linked_player_id
      where m.workspace_id = t.workspace_id
        and m.active
        and (
          m.role = 'admin'
          or (
            m.role = 'coorganizer'
            and tp.present
            and tp.registration_status <> 'waitlist'
          )
        )
    ) x
  ), '[]'::jsonb);
end
$function$;

revoke all on function public.fast_conquest_note_access_summary(uuid) from public, anon;
grant execute on function public.fast_conquest_note_access_summary(uuid) to authenticated;
