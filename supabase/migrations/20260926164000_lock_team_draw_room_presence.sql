-- Le suivi de présence est accessible exclusivement par les fonctions SECURITY DEFINER.
create policy "no direct draw room presence access"
on public.team_draw_room_presence_v2
as restrictive
for all
to public
using (false)
with check (false);
