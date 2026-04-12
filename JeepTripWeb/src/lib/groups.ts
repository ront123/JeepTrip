import { supabase } from './supabase';

export async function joinGroupByToken(token: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_token', token)
    .single();

  if (groupError || !group) throw new Error('Invalid invite token');

  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) throw new Error('Already a member of this group');

  const { error: joinError } = await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'member',
  });

  if (joinError) throw new Error(joinError.message);
  return group;
}
