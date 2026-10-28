-- Fusion logique sans modifier les compositions verrouillées des tournois historiques.
-- La fiche principale est Anis ; Anis U15 reste liée aux archives, mais ne s'affiche plus comme profil indépendant.
create table if not exists private.player_identity_aliases (
 source_player_id uuid primary key references public.players(id) on delete restrict,
 canonical_player_id uuid not null references public.players(id) on delete restrict,
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 created_at timestamptz not null default now(),
 constraint separate_alias_players check(source_player_id <> canonical_player_id)
);
alter table private.player_identity_aliases enable row level security;
revoke all on private.player_identity_aliases from public,anon,authenticated;
create or replace function private.validate_player_identity_alias()
returns trigger language plpgsql set search_path to ''
as $$
begin
 if not exists (select 1 from public.players p where p.id=new.source_player_id and p.workspace_id=new.workspace_id)
    or not exists (select 1 from public.players p where p.id=new.canonical_player_id and p.workspace_id=new.workspace_id)
 then raise exception 'Les profils fusionnés doivent appartenir au même espace'; end if;
 if exists (select 1 from private.player_identity_aliases a where a.source_player_id=new.canonical_player_id)
 then raise exception 'Le profil principal ne peut pas être un alias'; end if;
 if exists (select 1 from private.player_identity_aliases a where a.canonical_player_id=new.source_player_id and a.source_player_id<>new.source_player_id)
 then raise exception 'Le profil source a déjà des alias'; end if;
 return new;
end $$;
drop trigger if exists validate_player_identity_alias on private.player_identity_aliases;
create trigger validate_player_identity_alias before insert or update on private.player_identity_aliases
for each row execute function private.validate_player_identity_alias();
create or replace function public.get_workspace_player_identity_aliases(p_workspace_id uuid)
returns table(source_player_id uuid,canonical_player_id uuid)
language plpgsql stable security definer set search_path to ''
as $$
begin
 if auth.uid() is null or not private.is_workspace_member(p_workspace_id)
 then raise exception 'Accès au groupe refusé' using errcode='42501'; end if;
 return query select a.source_player_id,a.canonical_player_id
 from private.player_identity_aliases a where a.workspace_id=p_workspace_id;
end $$;
revoke all on function public.get_workspace_player_identity_aliases(uuid) from public,anon;
grant execute on function public.get_workspace_player_identity_aliases(uuid) to authenticated;

-- Archivage intact : les IDs historiques ne sont pas modifiés (Conquête verrouillé).
insert into private.player_identity_aliases(source_player_id,canonical_player_id,workspace_id)
values('1d772fdd-4dc8-46b6-8fd9-358c8cb33f8b','424e024a-c6b3-4715-865b-f14c1cef5762','3a7b90b2-46a1-4125-9e6b-f580455b5cdb')
on conflict (source_player_id) do nothing;