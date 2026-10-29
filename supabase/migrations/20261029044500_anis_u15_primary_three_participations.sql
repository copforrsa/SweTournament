-- Mise à jour de la fusion logique : garder le profil historique « Anis U15 » comme identité principale.
-- Les anciennes compositions, buts, passes, matchs et notes restent sur leurs identifiants d'origine.
begin;
do $$
declare
  v_ws uuid:='3a7b90b2-46a1-4125-9e6b-f580455b5cdb';
  v_u15 uuid:='1d772fdd-4dc8-46b6-8fd9-358c8cb33f8b';
  v_anis uuid:='424e024a-c6b3-4715-865b-f14c1cef5762';
begin
  if (select count(*) from public.players where id in (v_anis,v_u15) and workspace_id=v_ws)<>2
    then raise exception 'Les deux joueurs de Forssa sont introuvables'; end if;
  if (select count(distinct tournament_id) from public.tournament_players
      where player_id in(v_anis,v_u15) and present and registration_status='confirmed')<>3
    then raise exception 'Nombre de participations inattendu'; end if;
  -- La migration précédente utilisait Anis comme principal. Ne retirer que cette liaison précise.
  delete from private.player_identity_aliases
    where source_player_id=v_u15 and canonical_player_id=v_anis and workspace_id=v_ws;
  if not exists(select 1 from private.player_identity_aliases
    where source_player_id=v_anis and canonical_player_id=v_u15 and workspace_id=v_ws) then
    insert into private.player_identity_aliases(source_player_id,canonical_player_id,workspace_id)
    values(v_anis,v_u15,v_ws);
  end if;
end $$;
commit;

-- Compteur de participations réelles : seul le profil canonique est présenté,
-- toutes les présences confirmées à des tournois terminés sont réunies.
create or replace function public.get_workspace_player_participation_counts_v1(p_workspace_id uuid)
returns table(player_id uuid,participations bigint)
language plpgsql stable security definer set search_path to ''
as $$
begin
  if auth.uid() is null or not private.is_workspace_member(p_workspace_id) then
    raise exception 'Accès au groupe refusé' using errcode='42501';
  end if;
  return query
    select coalesce(a.canonical_player_id,tp.player_id),
           count(distinct tp.tournament_id)::bigint
    from public.tournament_players tp
    join public.tournaments t on t.id=tp.tournament_id
    join public.players p on p.id=tp.player_id
    left join private.player_identity_aliases a
      on a.source_player_id=tp.player_id and a.workspace_id=p_workspace_id
    where t.workspace_id=p_workspace_id and p.workspace_id=p_workspace_id
      and t.status='finished' and tp.present=true and tp.registration_status='confirmed'
    group by coalesce(a.canonical_player_id,tp.player_id);
end $$;
revoke all on function public.get_workspace_player_participation_counts_v1(uuid) from public,anon;
grant execute on function public.get_workspace_player_participation_counts_v1(uuid) to authenticated;