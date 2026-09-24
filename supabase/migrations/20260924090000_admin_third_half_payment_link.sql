-- Le responsable conserve l'identité du lien, mais l'organisateur peut le
-- renseigner depuis son tableau de bord sans dépendre de la session joueur.

create or replace function public.admin_get_third_half_assignments_v1(p_workspace_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $$
begin
  if not private.is_workspace_admin(p_workspace_id) then raise exception 'Accès administrateur requis'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'tournament_id',t.id,
      'payment_player_id',f.responsible_player_id,
      'payment_provider',f.provider,
      'payment_link',f.payment_link,
      'suggested_amount_cents',coalesce(f.suggested_amount_cents,t.cooler_suggested_cents,300),
      'cooler_player_id',coalesce(nullif(f.logistics_assignments #>> '{cooler,player_id}','')::uuid,f.responsible_player_id),
      'ice_player_id',nullif(f.logistics_assignments #>> '{ice,player_id}','')::uuid,
      'admin_contribution_mode',f.admin_contribution_mode,
      'admin_contribution_amount_cents',coalesce(f.admin_contribution_amount_cents,0),
      'admin_contribution_item',f.admin_contribution_item,
      'responsible_registered',exists(select 1 from public.tournament_players tp where tp.tournament_id=t.id and tp.player_id=f.responsible_player_id and tp.present=true and tp.registration_status<>'cancelled'),
      'payment_responsible_registered',exists(select 1 from public.tournament_players tp where tp.tournament_id=t.id and tp.player_id=f.responsible_player_id and tp.present=true and tp.registration_status<>'cancelled'),
      'registered_player_ids',coalesce((select jsonb_agg(tp.player_id order by tp.registered_at,tp.player_id) from public.tournament_players tp where tp.tournament_id=t.id and tp.present=true and tp.registration_status<>'cancelled'),'[]'::jsonb)
    ) order by t.tournament_date desc)
    from public.tournaments t left join public.third_half_funds f on f.tournament_id=t.id
    where t.workspace_id=p_workspace_id and t.status<>'finished' and coalesce(t.third_half_active,false)=true
  ),'[]'::jsonb);
end;
$$;

create or replace function public.admin_save_third_half_payment_link_v1(
  p_tournament_id uuid,
  p_responsible_player_id uuid,
  p_provider text,
  p_payment_link text,
  p_suggested_amount_cents integer
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $$
declare
  v_workspace uuid;
  v_link text := nullif(trim(coalesce(p_payment_link,'')), '');
  v_provider text := nullif(trim(coalesce(p_provider,'')), '');
  v_amount integer := coalesce(p_suggested_amount_cents,0);
  v_is_creator boolean := false;
begin
  select workspace_id into v_workspace from public.tournaments where id=p_tournament_id and third_half_active=true;
  if v_workspace is null then raise exception 'Glacière indisponible pour ce Swé'; end if;
  if not private.is_workspace_admin(v_workspace) then raise exception 'Réservé à l’administrateur'; end if;
  if v_link is null or lower(v_link) !~ '^https://[^[:space:]]+$' or char_length(v_link)>500 then raise exception 'Ajoute un lien HTTPS valide'; end if;
  if v_provider is null or char_length(v_provider)>40 then raise exception 'Choisis une solution de paiement'; end if;
  if v_amount<50 or v_amount>500 then raise exception 'Le montant doit être compris entre 0,50 € et 5 €'; end if;
  if p_responsible_player_id is null then raise exception 'Le créateur doit posséder un profil joueur SWÉ pour enregistrer son lien'; end if;
  select exists(select 1 from public.workspace_members wm where wm.workspace_id=v_workspace and wm.user_id=auth.uid() and wm.linked_player_id=p_responsible_player_id) into v_is_creator;
  if not exists(select 1 from public.tournament_players tp join public.players p on p.id=tp.player_id where tp.tournament_id=p_tournament_id and tp.player_id=p_responsible_player_id and tp.present=true and tp.registration_status<>'cancelled' and p.workspace_id=v_workspace) then
    if not v_is_creator then raise exception 'Le responsable du lien doit être inscrit à ce Swé'; end if;
    insert into public.tournament_players(tournament_id,player_id,present,registration_status,registered_at)
    values(p_tournament_id,p_responsible_player_id,true,'confirmed',now()) on conflict(tournament_id,player_id) do update set present=true,registration_status='confirmed';
  end if;

  insert into public.third_half_funds(tournament_id,workspace_id,status,responsible_player_id,provider,payment_link,suggested_amount_cents,share_enabled,payment_link_configured_at,updated_at,updated_by)
  values(p_tournament_id,v_workspace,'open',p_responsible_player_id,v_provider,v_link,v_amount,true,now(),now(),auth.uid())
  on conflict(tournament_id) do update set responsible_player_id=excluded.responsible_player_id,provider=excluded.provider,payment_link=excluded.payment_link,suggested_amount_cents=excluded.suggested_amount_cents,status='open',share_enabled=true,payment_link_configured_at=now(),updated_at=now(),updated_by=auth.uid();
  update public.tournaments set cooler_suggested_cents=v_amount where id=p_tournament_id;
  return jsonb_build_object('saved',true);
end;
$$;

revoke all on function public.admin_save_third_half_payment_link_v1(uuid,uuid,text,text,integer) from public, anon;
grant execute on function public.admin_save_third_half_payment_link_v1(uuid,uuid,text,text,integer) to authenticated;
