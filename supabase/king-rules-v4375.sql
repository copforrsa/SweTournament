create table private.king_format_rules(
 team_count integer primary key check(team_count in (0,3,4,5,6,7)),
 title text not null check(char_length(title) between 1 and 120),
 body text not null check(char_length(body) between 1 and 6000),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
alter table private.king_format_rules enable row level security;
revoke all on private.king_format_rules from public,anon,authenticated;
insert into private.king_format_rules(team_count,title,body) values
(0,'Matchs nuls — règle commune','Sur Mercedes et Boulogne, l’admin choisit avant le tournoi : Shifumi 1 manche, Shifumi 3 manches ou tirs au but (TAB).
À Carrefour, le Roi doit être battu : en cas de match nul, le Roi reste et le prétendant sort.
Exception : lors du tout premier match à Carrefour, il n’y a pas encore de Roi. En cas de nul, TAB obligatoire à 3 tireurs pour désigner le premier Roi. Pas de Shifumi pour devenir Roi : la couronne se gagne sur le terrain !'),
(3,'15 joueurs — 3 équipes — 1 terrain','Carrefour : Terres du Roi.
Deux équipes jouent et une équipe attend. Le match dure 10 minutes OU s’arrête à 2 buts d’écart.
Le gagnant reste Roi. Le perdant sort et l’équipe en attente entre à Carrefour.
Si le Roi perd par 2 buts avant les 10 minutes, il sort immédiatement et l’équipe en attente entre.'),
(4,'20 joueurs — 4 équipes — 2 terrains','Carrefour : Terres du Roi. Le deuxième terrain : Terres des Bannis.
Aucune équipe n’attend : on applique le circuit classique.
Le gagnant de Carrefour reste Roi. Le perdant de Carrefour descend sur les Terres des Bannis.
Le gagnant des Terres des Bannis monte défier le Roi. Le perdant reste sur les Terres des Bannis.'),
(5,'25 joueurs — 5 équipes — 2 terrains','Deux matchs se jouent et une équipe attend. Chaque match dure 10 minutes OU s’arrête à 2 buts d’écart.
Si le Roi perd par 2 buts avant la limite, il sort et l’équipe en attente entre immédiatement à Carrefour.
Sur l’autre terrain, si le match se termine avant celui de Carrefour, le gagnant sort du terrain et attend son tour pour aller défier le Roi.
L’objectif est de faire tourner rapidement les cinq équipes malgré les deux terrains.'),
(6,'30 joueurs — 6 équipes — 3 terrains','Circuit complet du Royaume : Boulogne (Terres des Bannis) → Mercedes (Terrain de Conquête) → Carrefour (Terres du Roi).
Le gagnant de Carrefour reste Roi ; le perdant descend à Mercedes.
Le gagnant de Mercedes monte à Carrefour ; le perdant descend à Boulogne.
Le gagnant de Boulogne monte à Mercedes ; le perdant reste sur les Terres des Bannis.'),
(7,'35 joueurs — 7 équipes — 3 terrains','Même circuit du Royaume, avec une équipe en attente. Chaque match dure 10 minutes OU s’arrête à 2 buts d’écart.
Les équipes progressent de Boulogne vers Mercedes puis Carrefour, et redescendent dans le sens inverse lorsqu’elles perdent.
Si une équipe gagne alors que son prochain terrain est encore occupé, elle attend la fin du match concerné avant de poursuivre son ascension.
L’équipe en attente entre dans la rotation dès qu’une place se libère selon le circuit.');

create function public.super_admin_get_king_rules() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
 return (select jsonb_agg(jsonb_build_object('team_count',r.team_count,'title',r.title,'body',r.body) order by r.team_count) from private.king_format_rules r);
end $$;
revoke all on function public.super_admin_get_king_rules() from public,anon;
grant execute on function public.super_admin_get_king_rules() to authenticated;

create function public.super_admin_save_king_rule(p_team_count integer,p_title text,p_body text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_platform_super_admin() then raise exception 'Accès Super Admin requis'; end if;
 update private.king_format_rules set title=btrim(p_title),body=btrim(p_body),updated_at=now(),updated_by=auth.uid() where team_count=p_team_count;
 if not found then raise exception 'Cas de règlement inconnu'; end if;
end $$;
revoke all on function public.super_admin_save_king_rule(integer,text,text) from public,anon;
grant execute on function public.super_admin_save_king_rule(integer,text,text) to authenticated;

create function public.get_public_tournament_king_rules(p_token uuid,p_tournament_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t public.tournaments%rowtype; n integer; v_teams integer; r private.king_format_rules%rowtype; common private.king_format_rules%rowtype;
begin
 select t0.* into t from public.tournaments t0 join public.workspaces w on w.id=t0.workspace_id
 where t0.id=p_tournament_id and w.public_enabled and w.public_token=p_token and (t0.format='king_of_pitch' or t0.rotation_mode='king_of_pitch');
 if not found then return null; end if;
 select count(*)::integer into n from public.tournament_players p where p.tournament_id=t.id and p.present and coalesce(p.registration_status,'confirmed')<>'waitlist';
 v_teams:=n/greatest(coalesce(t.team_size,5),1);
 select * into common from private.king_format_rules k where k.team_count=0;
 if coalesce(t.team_size,5)=5 then select * into r from private.king_format_rules k where k.team_count=v_teams and k.team_count>0; end if;
 return jsonb_build_object('player_count',n,'team_count',v_teams,'substitutes',n%greatest(coalesce(t.team_size,5),1),'title',r.title,'body',r.body,'common_title',common.title,'common_body',common.body);
end $$;
revoke all on function public.get_public_tournament_king_rules(uuid,uuid) from public;
grant execute on function public.get_public_tournament_king_rules(uuid,uuid) to anon,authenticated;

