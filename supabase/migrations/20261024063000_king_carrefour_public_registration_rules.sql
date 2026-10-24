-- Règles publiques Roi du Terrain : barème à partir du 24 octobre 2026 uniquement.
-- Les tournois antérieurs continuent d'afficher les règles historiques.
create or replace function public.get_public_tournament_king_rules(p_token uuid, p_tournament_id uuid)
returns jsonb language plpgsql stable security definer set search_path to ''
as $$
declare
 t public.tournaments%rowtype;
 n integer;
 v_teams integer;
 r private.king_format_rules%rowtype;
 common private.king_format_rules%rowtype;
 v_common_body text;
begin
 select t0.* into t
 from public.tournaments t0 join public.workspaces w on w.id=t0.workspace_id
 where t0.id=p_tournament_id and w.public_enabled and w.public_token=p_token
 and (t0.format='king_of_pitch' or t0.rotation_mode='king_of_pitch');
 if not found then return null; end if;
 select count(*)::integer into n
 from public.tournament_players p
 where p.tournament_id=t.id and p.present and coalesce(p.registration_status,'confirmed')<>'waitlist';
 v_teams:=n/greatest(coalesce(t.team_size,5),1);
 select * into common from private.king_format_rules k where k.team_count=0;
 if coalesce(t.team_size,5)=5 then
   select * into r from private.king_format_rules k where k.team_count=v_teams and k.team_count>0;
 end if;
 v_common_body:=common.body;
 if t.tournament_date >= date '2026-10-24' then
   v_common_body:=concat_ws(E'\n\n',v_common_body,
   '👑 CLASSEMENT : une victoire sur Carrefour (Terres du Roi) rapporte 4 points. Une victoire sur les autres terrains rapporte 3 points. Match nul : 1 point par équipe. Défaite : 0 point. Les scores des matchs et les statistiques individuelles ne changent pas.');
 end if;
 return jsonb_build_object(
 'player_count',n,'team_count',v_teams,
 'substitutes',n%greatest(coalesce(t.team_size,5),1),
 'title',r.title,'body',r.body,
 'common_title',common.title,'common_body',v_common_body
 );
end $$;
-- Conserver les droits RPC publics déjà accordés ; aucun élargissement d'accès.
