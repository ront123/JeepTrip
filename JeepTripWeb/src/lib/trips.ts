import { supabase } from './supabase';

export interface Trip {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  location_area: string;
  route_file_url: string | null;
  off_road_url: string | null;
  created_by: string;
  group_id?: string;
  group_ids?: string[];
  is_hidden: boolean;
  is_archived: boolean;
  max_participants: number | null;
  lat: number | null;
  lng: number | null;
  start_lat: number | null;
  start_lng: number | null;
  meeting_time: string | null;
  created_at: string;
  trip_attendees?: any[];
  trip_groups?: any[];
}

let myTripsCache: { data: Trip[]; timestamp: number } | null = null;
const CACHE_TTL = 30000;

export async function fetchMyTrips(forceRefresh = false): Promise<Trip[]> {
  if (!forceRefresh && myTripsCache && Date.now() - myTripsCache.timestamp < CACHE_TTL) {
    return myTripsCache.data;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('trips')
    .select(`*, trip_groups (group_id, groups (name)), trip_attendees (status, user_id, role)`)
    .gte('end_date', new Date().toISOString())
    .order('start_date', { ascending: true });

  if (error) throw new Error(error.message);

  const filtered = (data || []).filter((trip) => {
    if (trip.is_hidden) return trip.trip_attendees.some((a: any) => a.user_id === user.id);
    return true;
  });

  myTripsCache = { data: filtered, timestamp: Date.now() };
  return filtered;
}

export function clearTripsCache() { myTripsCache = null; }

export async function fetchTrip(id: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select(`*, trip_groups (group_id, groups (name, invite_token)), trip_attendees (status, user_id, role, users (full_name))`)
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function upsertRSVP(tripId: string, userId: string, status: 'attending' | 'not_attending' | 'maybe') {
  const { error } = await supabase.from('trip_attendees').upsert(
    { trip_id: tripId, user_id: userId, status },
    { onConflict: 'trip_id,user_id' }
  );
  if (error) throw new Error(error.message);
}

export async function createTrip(tripData: {
  title: string; start_date: string; end_date: string; location_area: string;
  is_hidden: boolean; max_participants: number | null; lat: number | null; lng: number | null;
  start_lat: number | null; start_lng: number | null; off_road_url: string | null; meeting_time: string | null;
}): Promise<Trip> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const inviteToken = Math.random().toString(36).substring(2, 10).toUpperCase();

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name: tripData.title, description: `Crew for trip: ${tripData.title}`, created_by: user.id, invite_token: inviteToken })
    .select().single();

  if (groupError) throw new Error(groupError.message);

  await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, role: 'manager' });

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({ ...tripData, group_id: group.id, created_by: user.id })
    .select().single();

  if (tripError) throw new Error(tripError.message);
  
  clearTripsCache();
  await supabase.from('trip_groups').insert({ trip_id: trip.id, group_id: group.id });
  
  // 5. Auto-RSVP the creator
  await supabase.from('trip_attendees').insert({
    trip_id: trip.id,
    user_id: user.id,
    status: 'attending',
    role: 'manager'
  });

  return trip;
}

export async function updateTrip(tripId: string, updates: Partial<Trip>) {
  const { error } = await supabase.from('trips').update(updates).eq('id', tripId);
  if (error) throw new Error(error.message);
  clearTripsCache();
}

export async function deleteTrip(tripId: string) {
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) throw new Error(error.message);
  clearTripsCache();
}

export async function archiveTrip(tripId: string) {
  const { error } = await supabase.from('trips').update({ is_archived: true }).eq('id', tripId);
  if (error) throw new Error(error.message);
  clearTripsCache();
}

export async function toggleTripManager(tripId: string, userId: string, setAsManager: boolean) {
  const { error } = await supabase
    .from('trip_attendees')
    .update({ role: setAsManager ? 'manager' : 'attendee' })
    .eq('trip_id', tripId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
