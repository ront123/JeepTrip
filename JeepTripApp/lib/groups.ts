import { supabase } from '@/lib/supabase';

export interface Group {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  invite_token?: string;
  member_count?: number;
  user_role?: 'member' | 'manager';
}

/** Fetch all groups the current user belongs to */
export async function fetchMyGroups(): Promise<Group[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // We query group_members for the user, and join the full group details
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      role,
      groups (
        id,
        name,
        description,
        created_by,
        created_at,
        invite_token,
        group_members (count)
      )
    `)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  // Flatten the nested response
  return (data || []).map((row: any) => {
    const g = row.groups;
    return {
      id: g.id,
    name: g.name,
    description: g.description,
    created_by: g.created_by,
    created_at: g.created_at,
    invite_token: g.invite_token,
    member_count: g.group_members[0].count,
    user_role: row.role,
  };
});
}

/** Join a group using an invite token */
export async function joinGroupByToken(token: string) {
const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error('Not authenticated');

// 1. Find group by token
const { data: group, error: fetchError } = await supabase
  .from('groups')
  .select('id, name')
  .eq('invite_token', token)
  .single();

if (fetchError || !group) throw new Error('Invalid invite link or group not found.');

// 2. Add as a member
const { error: joinError } = await supabase
  .from('group_members')
  .insert({
    group_id: group.id,
    user_id: user.id,
    role: 'member'
  });

// Ignore if already a member
if (joinError && !joinError.message.includes('duplicate key')) {
  throw new Error(joinError.message);
}

return group;
}

/** Create a new group and automatically add the creator as a manager */
export async function createGroup(name: string, description: string): Promise<Group> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Insert the group
  const { data: newGroup, error: groupError } = await supabase
    .from('groups')
    .insert({
      name,
      description,
      created_by: user.id
    })
    .select()
    .single();

  if (groupError) throw new Error(groupError.message);

  // 2. Insert the group member row linking this user as 'manager'
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: newGroup.id,
      user_id: user.id,
      role: 'manager'
    });

  if (memberError) {
    // If linking fails, we ideally should rollback the group creation or handle it.
    // Assuming simple flow here.
    throw new Error('Group created but failed to link manager: ' + memberError.message);
  }

  return {
    ...newGroup,
    member_count: 1,
    user_role: 'manager'
  };
}

/** Get all users not in a given group */
export async function fetchUsersNotInGroup(groupId: string): Promise<{ id: string; full_name: string; email: string }[]> {
  // 1. Get all members
  const { data: members } = await supabase.from('group_members').select('user_id').eq('group_id', groupId);
  const memberIds = members?.map(m => m.user_id) || [];

  // 2. Get all approved users
  const { data: users, error } = await supabase.from('users').select('id, full_name, email').eq('status', 'approved');
  if (error) throw new Error(error.message);

  // 3. Filter out members
  return (users || []).filter(u => !memberIds.includes(u.id));
}

/** Add a list of users as members to a group */
export async function addGroupMembers(groupId: string, userIds: string[]) {
  const inserts = userIds.map(uid => ({ group_id: groupId, user_id: uid, role: 'member' }));
  const { error } = await supabase.from('group_members').insert(inserts);
  if (error) throw new Error(error.message);
}
