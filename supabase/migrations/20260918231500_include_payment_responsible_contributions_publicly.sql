create or replace function public.get_public_third_half_contributions_v1(p_token uuid,p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $$
declare v_result jsonb;
begin
  if not exists(
    select 1 from public.tournaments t join public.workspaces w on w.id=t.workspace_id
    where t.id=p_tournament_id and w.public_token=p_token and w.public_enabled=true and t.third_half_active=true
  ) then raise exception 'Lien de 3e mi-temps indisponible'; end if;
  with contributions as (
    select p.id player_id,p.name player_name,coalesce(gp.avatar_url,p.avatar_url) avatar_url,
      tp.third_half_contribution_mode contribution_mode,
      case when tp.third_half_contribution_mode='money' then least(500,greatest(0,coalesce(tp.third_half_pledge_cents,0))) else 0 end contribution_amount_cents,
      tp.third_half_contribution_item contribution_item
    from public.tournament_players tp
    join public.players p on p.id=tp.player_id
    left join public.global_player_profiles gp on gp.id=p.global_player_id
    where tp.tournament_id=p_tournament_id and tp.present=true and tp.registration_status<>'cancelled'
      and tp.third_half_participating=true and tp.third_half_contribution_mode in ('money','supplies')
    union all
    select p.id,p.name,coalesce(gp.avatar_url,p.avatar_url),f.admin_contribution_mode,
      case when f.admin_contribution_mode='money' then least(500,greatest(0,coalesce(f.admin_contribution_amount_cents,0))) else 0 end,
      f.admin_contribution_item
    from public.third_half_funds f
    join public.players p on p.id=f.admin_contribution_player_id
    left join public.global_player_profiles gp on gp.id=p.global_player_id
    where f.tournament_id=p_tournament_id and f.admin_contribution_mode in ('money','supplies')
    union all
    select p.id,p.name,coalesce(gp.avatar_url,p.avatar_url),f.responsible_contribution_mode,
      case when f.responsible_contribution_mode='money' then least(500,greatest(0,coalesce(f.responsible_contribution_amount_cents,0))) else 0 end,
      f.responsible_contribution_item
    from public.third_half_funds f
    join public.players p on p.id=f.responsible_player_id
    left join public.global_player_profiles gp on gp.id=p.global_player_id
    where f.tournament_id=p_tournament_id and f.responsible_contribution_mode in ('money','supplies')
      and not (
        f.admin_contribution_player_id is not distinct from f.responsible_player_id
        and f.admin_contribution_mode in ('money','supplies')
      )
  )
  select jsonb_build_object(
    'money_pool_cents',coalesce(sum(case when contribution_mode='money' then contribution_amount_cents else 0 end),0),
    'money_donor_count',count(*) filter(where contribution_mode='money'),
    'contributions',coalesce(jsonb_agg(jsonb_build_object('player_id',player_id,'player_name',player_name,'avatar_url',avatar_url,'contribution_mode',contribution_mode,'contribution_amount_cents',contribution_amount_cents,'contribution_item',contribution_item) order by player_name),'[]'::jsonb)
  ) into v_result from contributions;
  return coalesce(v_result,jsonb_build_object('money_pool_cents',0,'money_donor_count',0,'contributions','[]'::jsonb));
end;
$$;