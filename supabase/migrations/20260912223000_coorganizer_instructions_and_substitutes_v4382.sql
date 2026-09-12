-- SWÉ Tournament V43.82 — private co-manager instructions and roster/substitute synchronization.

alter table public.coorganizer_permissions
  add column if not exists personal_instructions text;

alter table public.coorganizer_permissions
  drop constraint if exists coorganizer_permissions_personal_instructions_check;
alter table public.coorganizer_permissions
  add constraint coorganizer_permissions_personal_instructions_check
  check (personal_instructions is null or char_length(personal_instructions) <= 2000);

drop function if exists public.admin_get_coorganizer_permissions(uuid);
create function public.admin_get_coorganizer_permissions(p_workspace_id uuid)
returns table(
  user_id uuid,email text,active boolean,created_at timestamptz,
  can_invite_coorganizers boolean,can_enter_scores boolean,can_add_members boolean,can_delete_members boolean,
  can_create_tournaments boolean,can_view_players boolean,can_generate_teams boolean,
  can_generate_team_codes boolean,can_edit_player_personal_info boolean,
  linked_player_id uuid,temporary_admin_until timestamptz,personal_instructions text
)
language plpgsql security definer set search_path='public','auth','private','pg_temp'
as $$
begin
  if not private.is_workspace_admin(p_workspace_id) then raise exception 'Accès réservé à l’administrateur'; end if;
  return query select wm.user_id,u.email::text,coalesce(wm.active,true),wm.created_at,
    coalesce(cp.can_invite_coorganizers,false),coalesce(cp.can_enter_scores,false),
    coalesce(cp.can_add_members,false),coalesce(cp.can_delete_members,false),
    coalesce(cp.can_create_tournaments,false),coalesce(cp.can_view_players,true),
    coalesce(cp.can_generate_teams,false),coalesce(cp.can_generate_team_codes,false),
    coalesce(cp.can_edit_player_personal_info,false),wm.linked_player_id,
    cp.temporary_admin_until,cp.personal_instructions
  from public.workspace_members wm
  left join auth.users u on u.id=wm.user_id
  left join public.coorganizer_permissions cp on cp.workspace_id=wm.workspace_id and cp.user_id=wm.user_id
  where wm.workspace_id=p_workspace_id and wm.role='coorganizer'
  order by wm.created_at;
end $$;

drop function if exists public.get_my_coorganizer_permissions(uuid);
create function public.get_my_coorganizer_permissions(p_workspace_id uuid)
returns table(
  can_invite_coorganizers boolean,can_enter_scores boolean,can_add_members boolean,can_delete_members boolean,
  can_create_tournaments boolean,can_view_players boolean,can_generate_teams boolean,
  can_generate_team_codes boolean,can_edit_player_personal_info boolean,
  temporary_admin_until timestamptz,personal_instructions text
)
language plpgsql security definer set search_path='public','private','pg_temp'
as $$
begin
  if not private.is_workspace_coorganizer(p_workspace_id) then raise exception 'Accès refusé'; end if;
  return query select coalesce(cp.can_invite_coorganizers,false),coalesce(cp.can_enter_scores,false),
    coalesce(cp.can_add_members,false),coalesce(cp.can_delete_members,false),
    coalesce(cp.can_create_tournaments,false),coalesce(cp.can_view_players,true),
    coalesce(cp.can_generate_teams,false),coalesce(cp.can_generate_team_codes,false),
    coalesce(cp.can_edit_player_personal_info,false),cp.temporary_admin_until,cp.personal_instructions
  from public.workspace_members wm
  left join public.coorganizer_permissions cp on cp.workspace_id=wm.workspace_id and cp.user_id=wm.user_id
  where wm.workspace_id=p_workspace_id and wm.user_id=(select auth.uid()) and wm.role='coorganizer';
end $$;

drop function if exists public.admin_save_coorganizer_settings(uuid,uuid,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,uuid,timestamptz);
create function public.admin_save_coorganizer_settings(
  p_workspace_id uuid,p_user_id uuid,p_can_invite boolean,p_can_scores boolean,
  p_can_add boolean,p_can_delete boolean,p_can_create_tournaments boolean default false,
  p_can_view_players boolean default true,p_can_generate_teams boolean default false,
  p_can_generate_team_codes boolean default false,p_can_edit_player_personal_info boolean default false,
  p_linked_player_id uuid default null,p_temporary_admin_until timestamptz default null,
  p_personal_instructions text default null
) returns void
language plpgsql security definer set search_path='public','private','auth','pg_temp'
as $$
declare v_current uuid;v_global uuid;v_instruction text:=nullif(btrim(coalesce(p_personal_instructions,'')),'');
begin
  if not private.is_workspace_admin(p_workspace_id) then raise exception 'Accès réservé à l’administrateur'; end if;
  if char_length(coalesce(v_instruction,''))>2000 then raise exception 'La consigne personnalisée est limitée à 2000 caractères'; end if;
  select wm.linked_player_id into v_current from public.workspace_members wm
  where wm.workspace_id=p_workspace_id and wm.user_id=p_user_id and wm.role='coorganizer' for update;
  if not found then raise exception 'Co-organisateur introuvable'; end if;
  if v_current is not null and p_linked_player_id is distinct from v_current then
    raise exception 'Le membre associé est verrouillé. Seul le Super Admin peut délier ou corriger cette liaison.';
  end if;
  if p_linked_player_id is not null and not exists(
    select 1 from public.players p where p.id=p_linked_player_id and p.workspace_id=p_workspace_id and p.active=true and p.is_group_member=true
  ) then raise exception 'Joueur invalide'; end if;

  insert into public.coorganizer_permissions(
    workspace_id,user_id,can_invite_coorganizers,can_enter_scores,can_add_members,can_delete_members,
    can_create_tournaments,can_view_players,can_generate_teams,can_generate_team_codes,
    can_edit_player_personal_info,temporary_admin_until,personal_instructions,updated_at
  ) values(
    p_workspace_id,p_user_id,p_can_invite,p_can_scores,p_can_add,p_can_delete,
    p_can_create_tournaments,p_can_view_players,p_can_generate_teams,p_can_generate_team_codes,
    p_can_edit_player_personal_info,p_temporary_admin_until,v_instruction,now()
  ) on conflict(workspace_id,user_id) do update set
    can_invite_coorganizers=excluded.can_invite_coorganizers,can_enter_scores=excluded.can_enter_scores,
    can_add_members=excluded.can_add_members,can_delete_members=excluded.can_delete_members,
    can_create_tournaments=excluded.can_create_tournaments,can_view_players=excluded.can_view_players,
    can_generate_teams=excluded.can_generate_teams,can_generate_team_codes=excluded.can_generate_team_codes,
    can_edit_player_personal_info=excluded.can_edit_player_personal_info,
    temporary_admin_until=excluded.temporary_admin_until,personal_instructions=excluded.personal_instructions,updated_at=now();

  if v_current is null and p_linked_player_id is not null then
    select g.id into v_global from public.global_player_profiles g where g.user_id=p_user_id limit 1;
    if v_global is null then raise exception 'Le co-gestionnaire doit disposer d’un ID SWÉ avant le rattachement.'; end if;
    if exists(select 1 from public.players p where p.id=p_linked_player_id and p.global_player_id is not null and p.global_player_id<>v_global) then
      raise exception 'Ce membre est déjà rattaché à un autre ID SWÉ';
    end if;
    update public.workspace_members set linked_player_id=p_linked_player_id
      where workspace_id=p_workspace_id and user_id=p_user_id and role='coorganizer';
    update public.players set global_player_id=v_global where id=p_linked_player_id;
    delete from public.player_skill_ratings
      where workspace_id=p_workspace_id and evaluator_user_id=p_user_id and player_id=p_linked_player_id;
  elsif v_current is not null then
    select g.id into v_global from public.global_player_profiles g where g.user_id=p_user_id limit 1;
    if v_global is not null then
      update public.players set global_player_id=v_global
      where id=v_current and (global_player_id is null or global_player_id=v_global);
    end if;
  end if;
end $$;

create or replace function private.read_my_tournament_presentation_v1(p_tournament_id uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
 select jsonb_build_object(
   'my_player_id',wm.linked_player_id,
   'is_coorganizer',wm.role='coorganizer',
   'personal_instructions',case when wm.role='coorganizer' then cp.personal_instructions else null end,
   'tournament_rating_windows',coalesce((
     select jsonb_agg(jsonb_build_object('tournament_id',rs.tournament_id,'opened_at',rs.opened_at,'closes_at',rs.closes_at,'status',rs.status))
     from public.tournament_rating_sessions rs where rs.tournament_id=t.id
   ),'[]'::jsonb)
 )
 from public.tournaments t
 join public.workspace_members wm on wm.workspace_id=t.workspace_id
 left join public.coorganizer_permissions cp on cp.workspace_id=wm.workspace_id and cp.user_id=wm.user_id
 where t.id=p_tournament_id and wm.user_id=(select auth.uid()) and (select auth.uid()) is not null
   and wm.active and wm.role in ('admin','coorganizer');
$$;

create or replace function public.sync_tournament_substitutes(p_tournament_id uuid)
returns jsonb language plpgsql security definer set search_path='public','private','pg_temp'
as $$
declare t public.tournaments%rowtype;v_capacity integer:=0;v_assigned integer:=0;v_free integer:=0;v_substitutes integer:=0;
begin
  select * into t from public.tournaments where id=p_tournament_id and status<>'finished' for update;
  if not found then raise exception 'Tournoi indisponible'; end if;
  if not (private.is_workspace_admin(t.workspace_id) or private.coorganizer_has_permission(t.workspace_id,'generate_teams')) then
    raise exception 'Autorisation refusée pour gérer les compositions';
  end if;

  select count(*)*greatest(2,least(11,coalesce(t.team_size,5))) into v_capacity
  from public.teams tm where tm.tournament_id=t.id;
  select count(distinct tp.player_id) into v_assigned
  from public.team_players tp join public.teams tm on tm.id=tp.team_id
  join public.tournament_players tr on tr.tournament_id=t.id and tr.player_id=tp.player_id
  where tm.tournament_id=t.id and tr.present and coalesce(tr.registration_status,'confirmed')<>'waitlist';
  v_free:=greatest(0,v_capacity-v_assigned);

  update public.tournament_players set is_substitute=false where tournament_id=t.id;
  with unassigned as (
    select tr.player_id,row_number() over(order by tr.registered_at nulls last,tr.player_id) position
    from public.tournament_players tr
    where tr.tournament_id=t.id and tr.present and coalesce(tr.registration_status,'confirmed')<>'waitlist'
      and not exists(
        select 1 from public.team_players tp join public.teams tm on tm.id=tp.team_id
        where tm.tournament_id=t.id and tp.player_id=tr.player_id
      )
  )
  update public.tournament_players tr set is_substitute=(v_capacity>0 and u.position>v_free)
  from unassigned u where tr.tournament_id=t.id and tr.player_id=u.player_id;

  select count(*) into v_substitutes from public.tournament_players
  where tournament_id=t.id and present and coalesce(registration_status,'confirmed')<>'waitlist' and is_substitute;

  delete from public.match_player_assignments a using public.matches m
  where a.match_id=m.id and m.tournament_id=t.id and m.status='scheduled';
  insert into public.match_player_assignments(match_id,player_id,team_id)
  select m.id,tp.player_id,tm.id from public.matches m
  join public.teams tm on tm.id in (m.home_team_id,m.away_team_id)
  join public.team_players tp on tp.team_id=tm.id
  where m.tournament_id=t.id and m.status='scheduled'
  on conflict(match_id,player_id) do update set team_id=excluded.team_id;

  return jsonb_build_object('capacity',v_capacity,'assigned',v_assigned,'free_slots',v_free,'substitute_count',v_substitutes);
end $$;

revoke all on function public.admin_get_coorganizer_permissions(uuid) from public,anon;
revoke all on function public.get_my_coorganizer_permissions(uuid) from public,anon;
revoke all on function public.admin_save_coorganizer_settings(uuid,uuid,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,uuid,timestamptz,text) from public,anon;
revoke all on function public.sync_tournament_substitutes(uuid) from public,anon;
revoke all on function private.read_my_tournament_presentation_v1(uuid) from public,anon,authenticated;
grant execute on function public.admin_get_coorganizer_permissions(uuid) to authenticated;
grant execute on function public.get_my_coorganizer_permissions(uuid) to authenticated;
grant execute on function public.admin_save_coorganizer_settings(uuid,uuid,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,uuid,timestamptz,text) to authenticated;
grant execute on function public.sync_tournament_substitutes(uuid) to authenticated;

notify pgrst,'reload schema';
