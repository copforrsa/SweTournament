create table if not exists private.coorganizer_tournament_onboarding (
  user_id uuid not null references auth.users(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  step text not null default 'players_notes_intro',
  first_presented_at timestamptz not null default now(),
  viewed_at timestamptz,
  clicked_at timestamptz,
  dismissed_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id,tournament_id,step),
  constraint coorganizer_tournament_onboarding_step_check
    check (step in ('players_notes_intro'))
);

alter table private.coorganizer_tournament_onboarding enable row level security;
revoke all on table private.coorganizer_tournament_onboarding from public,anon,authenticated;

create or replace function public.get_my_coorganizer_dashboard_onboarding_v1(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
  v_row private.coorganizer_tournament_onboarding%rowtype;
begin
  if v_user_id is null then raise exception 'Authentification requise'; end if;

  select t.workspace_id into v_workspace_id
  from public.tournaments t
  where t.id=p_tournament_id;
  if v_workspace_id is null then raise exception 'Tournoi introuvable'; end if;

  if not exists(
    select 1 from public.workspace_members wm
    where wm.workspace_id=v_workspace_id
      and wm.user_id=v_user_id
      and wm.role='coorganizer'
      and coalesce(wm.active,true)=true
  ) then raise exception 'Accès refusé'; end if;

  insert into private.coorganizer_tournament_onboarding(user_id,tournament_id,step)
  values(v_user_id,p_tournament_id,'players_notes_intro')
  on conflict(user_id,tournament_id,step) do nothing;

  select * into v_row
  from private.coorganizer_tournament_onboarding o
  where o.user_id=v_user_id and o.tournament_id=p_tournament_id and o.step='players_notes_intro';

  return jsonb_build_object(
    'step',v_row.step,
    'first_presented_at',v_row.first_presented_at,
    'viewed_at',v_row.viewed_at,
    'clicked_at',v_row.clicked_at,
    'dismissed_at',v_row.dismissed_at,
    'completed_at',v_row.completed_at,
    'should_highlight',v_row.clicked_at is null and v_row.dismissed_at is null and v_row.completed_at is null
  );
end
$function$;

create or replace function public.mark_my_coorganizer_dashboard_onboarding_v1(
  p_tournament_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
  v_row private.coorganizer_tournament_onboarding%rowtype;
begin
  if v_user_id is null then raise exception 'Authentification requise'; end if;
  if p_action not in ('viewed','clicked','dismissed','completed') then raise exception 'Action invalide'; end if;

  select t.workspace_id into v_workspace_id
  from public.tournaments t
  where t.id=p_tournament_id;
  if v_workspace_id is null then raise exception 'Tournoi introuvable'; end if;

  if not exists(
    select 1 from public.workspace_members wm
    where wm.workspace_id=v_workspace_id
      and wm.user_id=v_user_id
      and wm.role='coorganizer'
      and coalesce(wm.active,true)=true
  ) then raise exception 'Accès refusé'; end if;

  insert into private.coorganizer_tournament_onboarding(user_id,tournament_id,step)
  values(v_user_id,p_tournament_id,'players_notes_intro')
  on conflict(user_id,tournament_id,step) do nothing;

  update private.coorganizer_tournament_onboarding o
  set viewed_at=case when p_action='viewed' then coalesce(o.viewed_at,now()) else o.viewed_at end,
      clicked_at=case when p_action='clicked' then coalesce(o.clicked_at,now()) else o.clicked_at end,
      dismissed_at=case when p_action='dismissed' then coalesce(o.dismissed_at,now()) else o.dismissed_at end,
      completed_at=case when p_action='completed' then coalesce(o.completed_at,now()) else o.completed_at end,
      updated_at=now()
  where o.user_id=v_user_id and o.tournament_id=p_tournament_id and o.step='players_notes_intro'
  returning * into v_row;

  return jsonb_build_object(
    'step',v_row.step,
    'first_presented_at',v_row.first_presented_at,
    'viewed_at',v_row.viewed_at,
    'clicked_at',v_row.clicked_at,
    'dismissed_at',v_row.dismissed_at,
    'completed_at',v_row.completed_at,
    'should_highlight',false
  );
end
$function$;

revoke all on function public.get_my_coorganizer_dashboard_onboarding_v1(uuid) from public,anon;
revoke all on function public.mark_my_coorganizer_dashboard_onboarding_v1(uuid,text) from public,anon;
grant execute on function public.get_my_coorganizer_dashboard_onboarding_v1(uuid) to authenticated;
grant execute on function public.mark_my_coorganizer_dashboard_onboarding_v1(uuid,text) to authenticated;
