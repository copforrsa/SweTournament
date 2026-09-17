-- Team invitations are served exclusively through audited RPCs.  Direct Data
-- API access would let an anonymous caller read, create or alter invitations.
alter table public.team_player_invitations enable row level security;

revoke all on table public.team_player_invitations from anon, authenticated;

-- SECURITY DEFINER RPCs used by the public registration flow keep working:
-- get_public_workspace_snapshot, public_create_team_with_member_code_v2 and
-- public_respond_team_invitation are owned by postgres and validate the token.

notify pgrst,'reload schema';
