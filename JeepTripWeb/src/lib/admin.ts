import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  vehicle_details: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export async function fetchPendingUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateUserStatus(userId: string, status: 'approved' | 'rejected') {
  const { error } = await supabase.from('users').update({ status }).eq('id', userId);
  if (error) throw new Error(error.message);
}
