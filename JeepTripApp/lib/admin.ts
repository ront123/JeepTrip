import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  vehicle_details: string;
  status: 'pending' | 'approved' | 'rejected';
  role: 'user' | 'admin';
  created_at: string;
}

/** Fetch all users pending approval */
export async function fetchPendingUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Update user status (approve or reject) */
export async function updateUserStatus(userId: string, newStatus: 'approved' | 'rejected') {
  const { error } = await supabase
    .from('users')
    .update({ status: newStatus })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}
