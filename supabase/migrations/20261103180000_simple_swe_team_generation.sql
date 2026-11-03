-- Teams for simple SWÉs are separate from tournament standings and ratings.
alter table public.community_swes add column if not exists generated_teams jsonb;

create or replace function public.generate_community_swe_teams_v1(p_swe_id uuid)
returns jsonb language plpgsql security definer
set search_path=public,pg_temp as $$
declare
 v_swe public.community_swes%rowtype;
 v_roster jsonb;
 v_teams jsonb;
 v_count integer;
 v_seed text := gen_random_uuid()::text;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 select * into v_swe from public.community_swes where id=p_swe_id for update;
 if not found or v_swe.creator_user_id <> auth.uid()
 then raise exception 'Ce SWÉ ne peut pas être organisé depuis ce compte'; end if;
 if v_swe.status <> 'open' or v_swe.start_at <= now()
 then raise exception 'Le match est déjà commencé ou terminé'; end if;

 select jsonb_agg(jsonb_build_object('name',r.player_name,'type',r.type) order by md5(r.player_key||v_seed))
 into v_roster from (
   select 'member:'||p.global_player_id::text as player_key,
          coalesce(nullif(trim(g.display_name),''),'Joueur SWÉ') as player_name,
          'member'::text as type
   from public.community_swe_participants p
   join public.global_player_profiles g on g.id=p.global_player_id
   where p.swe_id=p_swe_id and p.status='confirmed'
   union all
   select 'guest:'||q.id::text, q.display_name,'guest'::text
   from public.community_swe_guest_registrations q
   where q.swe_id=p_swe_id
 ) r;
 v_count:=coalesce(jsonb_array_length(v_roster),0);
 if v_count<>v_swe.max_players then
   raise exception 'Il faut % joueurs inscrits pour générer les équipes (% actuellement)',v_swe.max_players,v_count;
 end if;

 select jsonb_build_object(
   'a',coalesce(jsonb_agg(player order by num) filter(where num<=10 and num%2=1),'[]'::jsonb),
   'b',coalesce(jsonb_agg(player order by num) filter(where num<=10 and num%2=0),'[]'::jsonb),
   'substitutes',coalesce(jsonb_agg(player order by num) filter(where num>10),'[]'::jsonb),
   'generated_at',now()
 ) into v_teams from (
   select value as player,row_number() over () as num
   from jsonb_array_elements(v_roster)
 ) ordered;
 update public.community_swes set generated_teams=v_teams where id=p_swe_id;
 return v_teams;
end $$;

revoke all on function public.generate_community_swe_teams_v1(uuid) from public,anon,authenticated;
grant execute on function public.generate_community_swe_teams_v1(uuid) to authenticated;

-- Only the creator can see team rosters through their existing private dashboard.
DO $$
declare source text;
begin
 select pg_get_functiondef('public.get_my_community_swes_v2()'::regprocedure) into source;
 if position('''generated_teams'',s.generated_teams' in source)=0 then
   if position('''guest_names'',coalesce(' in source)=0 then raise exception 'Dashboard structure changed'; end if;
   source := replace(source,'''guest_names'',coalesce(','''generated_teams'',s.generated_teams, ''guest_names'',coalesce(');
   execute source;
 end if;
end $$;
