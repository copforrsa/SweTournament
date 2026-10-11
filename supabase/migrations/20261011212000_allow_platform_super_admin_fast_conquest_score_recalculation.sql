-- Autorise exclusivement le Super Admin à laisser le recalcul des scores
-- accompagner une correction de but/passe Fast Conquête, y compris après clôture.
-- Les organisateurs et co-gestionnaires gardent les règles de terrain existantes.
create or replace function private.fast_conquest_match_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare t public.tournaments%rowtype; begin
 if tg_op='UPDATE' and new.tournament_id<>old.tournament_id and exists(select 1 from public.tournaments where id=old.tournament_id and format='fast_conquest') then raise exception 'Réaffectation Fast Conquête interdite'; end if;
 select * into t from public.tournaments where id=case when tg_op='DELETE' then old.tournament_id else new.tournament_id end;
 if not found or t.format<>'fast_conquest' or current_setting('swe.fast_commit',true)='on' then return case when tg_op='DELETE' then old else new end; end if;
 if tg_op='DELETE' then
  if not private.fast_admin(t.workspace_id) then raise exception 'Suppression réservée à l’administrateur'; end if;
  raise exception 'La suppression isolée invaliderait le tableau : supprime le tournoi ou corrige le résultat via Fast Conquête';
 end if;
 if tg_op='INSERT' then raise exception 'Utilise le générateur Fast Conquête'; end if;
 if new.tournament_id is distinct from old.tournament_id or new.home_team_id is distinct from old.home_team_id or new.away_team_id is distinct from old.away_team_id or new.format_slot is distinct from old.format_slot or new.competition_type is distinct from old.competition_type then raise exception 'Composition de match protégée'; end if;
 if private.is_platform_super_admin() then return new; end if;
 if not private.swe_workspace_full_access(t.workspace_id) or not (private.fast_admin(t.workspace_id) or private.fast_designated(t.id) and private.coorganizer_can_edit_tournament(t.id)) then raise exception 'Droit de saisie requis'; end if;
 if old.status='finished' or old.pitch is null or new.status='finished' or new.pitch is distinct from old.pitch or new.rotation_role is distinct from old.rotation_role then raise exception 'Utilise les commandes Fast Conquête pour terminer ou corriger ce match'; end if;
 return new;
end $$;