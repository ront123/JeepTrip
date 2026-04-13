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

export interface AdminTrip {
  id: string;
  title: string;
  location_area: string;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
  is_hidden: boolean;
  is_archived: boolean;
  creator_name?: string;
  creator_email?: string;
  attendee_count: number;
}

export interface UserTripCount {
  user_id: string;
  full_name: string;
  email: string;
  trip_count: number;
}

export interface AdminStats {
  totalUsers: number;
  approvedUsers: number;
  pendingUsers: number;
  totalTrips: number;
  activeTrips: number;
  archivedTrips: number;
}

const ADMIN_EMAIL = 'ront123@gmail.com';

export function isAdminEmail(email: string | undefined): boolean {
  return email === ADMIN_EMAIL;
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

export async function fetchAdminStats(): Promise<AdminStats> {
  // Fetch all users
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('status');
  if (usersErr) throw new Error(usersErr.message);

  const totalUsers = users?.length ?? 0;
  const approvedUsers = users?.filter(u => u.status === 'approved').length ?? 0;
  const pendingUsers = users?.filter(u => u.status === 'pending').length ?? 0;

  // Fetch all trips
  const { data: trips, error: tripsErr } = await supabase
    .from('trips')
    .select('is_archived, end_date');
  if (tripsErr) throw new Error(tripsErr.message);

  const now = new Date().toISOString();
  const totalTrips = trips?.length ?? 0;
  const activeTrips = trips?.filter(t => !t.is_archived && t.end_date >= now).length ?? 0;
  const archivedTrips = trips?.filter(t => t.is_archived || t.end_date < now).length ?? 0;

  return { totalUsers, approvedUsers, pendingUsers, totalTrips, activeTrips, archivedTrips };
}

export async function fetchAllTrips(): Promise<AdminTrip[]> {
  const { data: trips, error: tripsErr } = await supabase
    .from('trips')
    .select('id, title, location_area, start_date, end_date, created_by, created_at, is_hidden, is_archived')
    .order('created_at', { ascending: false });

  if (tripsErr) throw new Error(tripsErr.message);
  if (!trips || trips.length === 0) return [];

  // Fetch creators & attendees for each trip
  const creatorIds = [...new Set(trips.map(t => t.created_by))];

  const { data: creators } = await supabase
    .from('users')
    .select('id, full_name, email')
    .in('id', creatorIds);

  const creatorMap = new Map((creators || []).map(c => [c.id, c]));

  // Fetch attendee counts
  const { data: attendees } = await supabase
    .from('trip_attendees')
    .select('trip_id, user_id');

  const attendeeCountMap = new Map<string, number>();
  (attendees || []).forEach(a => {
    attendeeCountMap.set(a.trip_id, (attendeeCountMap.get(a.trip_id) || 0) + 1);
  });

  return trips.map(trip => {
    const creator = creatorMap.get(trip.created_by);
    return {
      ...trip,
      creator_name: creator?.full_name || 'Unknown',
      creator_email: creator?.email || '',
      attendee_count: attendeeCountMap.get(trip.id) || 0,
    };
  });
}

export async function fetchTripsPerUser(): Promise<UserTripCount[]> {
  const { data: trips, error } = await supabase
    .from('trips')
    .select('created_by');
  if (error) throw new Error(error.message);

  // Count trips per user
  const countMap = new Map<string, number>();
  (trips || []).forEach(t => {
    countMap.set(t.created_by, (countMap.get(t.created_by) || 0) + 1);
  });

  if (countMap.size === 0) return [];

  const userIds = [...countMap.keys()];
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email')
    .in('id', userIds);

  return (users || []).map(u => ({
    user_id: u.id,
    full_name: u.full_name || 'Unknown',
    email: u.email || '',
    trip_count: countMap.get(u.id) || 0,
  })).sort((a, b) => b.trip_count - a.trip_count);
}
