-- Un joueur ne peut jamais noter son propre profil Fast Conquête.
create or replace function private.fast_note_peers(t uuid) returns jsonb language sql stable set search_path='' as $function$
 with me as (
 select p.id from public.players p join public.tournaments x on x.workspace_id=p.workspace_id
 where x.id=t and (exists(select 1 from public.workspace_members m where m.workspace_id=x.workspace_id and m.user_id=auth.uid() and m.active and m.linked_player_id=p.id)
 or exists(select 1 from public.global_player_profiles g where g.id=p.global_player_id and g.user_id=auth.uid()))
 ), mine as (
 select a.match_id,a.team_id,a.player_id from public.match_player_assignments a join public.matches m on m.id=a.match_id join me on me.id=a.player_id where m.tournament_id=t and m.status='finished'
 ), peers as (
 select distinct a.player_id,a.team_id=mine.team_id teammate from mine join public.match_player_assignments a on a.match_id=mine.match_id where not exists(select 1 from me where me.id=a.player_id)
 )
 select jsonb_build_object('linked',exists(select 1 from me),'self',coalesce((select jsonb_agg(id) from me),'[]'::jsonb),'with',coalesce((select jsonb_agg(distinct player_id) from peers where teammate),'[]'::jsonb),'against',coalesce((select jsonb_agg(distinct player_id) from peers where not teammate),'[]'::jsonb));
$function$;

create or replace function private.fast_conquest_notes_prevent_self_rating() returns trigger language plpgsql security definer set search_path='' as $function$
begin
 if exists(select 1 from public.players p join public.tournaments t on t.workspace_id=p.workspace_id left join public.workspace_members wm on wm.workspace_id=t.workspace_id and wm.user_id=new.user_id and wm.active and wm.linked_player_id=p.id left join public.global_player_profiles gp on gp.id=p.global_player_id and gp.user_id=new.user_id where t.id=new.tournament_id and p.id=new.player_id and (wm.user_id is not null or gp.user_id is not null)) then raise exception 'Un joueur ne peut pas se noter lui-même'; end if;
 return new;
end $function$;
drop trigger if exists fast_conquest_notes_prevent_self_rating on private.fast_conquest_notes;
create trigger fast_conquest_notes_prevent_self_rating before insert or update of player_id,user_id on private.fast_conquest_notes for each row execute function private.fast_conquest_notes_prevent_self_rating();