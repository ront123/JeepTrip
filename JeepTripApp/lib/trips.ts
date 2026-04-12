/**
 * Supabase Trips helpers
 */
import { supabase } from '@/lib/supabase';

export interface Trip {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  location_area: string;
  route_file_url: string | null;
  off_road_url: string | null;
  created_by: string;
  group_id?: string; // Legacy
  group_ids?: string[]; 
  is_hidden: boolean;
  is_archived: boolean;
  max_participants: number | null;
  lat: number | null; // Destination
  lng: number | null; // Destination
  start_lat: number | null;
  start_lng: number | null;
  meeting_time: string | null;
  created_at: string;
}


let myTripsCache: { data: Trip[], timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds

/** Fetch all upcoming trips the current user is part of (via group membership) */
export async function fetchMyTrips(forceRefresh = false): Promise<Trip[]> {
  if (!forceRefresh && myTripsCache && (Date.now() - myTripsCache.timestamp < CACHE_TTL)) {
    return myTripsCache.data;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      trip_groups (group_id, groups (name)),
      trip_attendees (status, user_id, role)
    `)
    .gte('end_date', new Date().toISOString())
    .order('start_date', { ascending: true });

  if (error) throw new Error(error.message);
  
  const filtered = (data || []).filter((trip) => {
    if (trip.is_hidden) {
      return trip.trip_attendees.some((a: any) => a.user_id === user.id);
    }
    return true;
  });

  myTripsCache = { data: filtered, timestamp: Date.now() };
  return filtered;
}

export function clearTripsCache() {
  myTripsCache = null;
}

/** Fetch past trips */
export async function fetchPastTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select(`*, groups (name), trip_attendees (status, user_id, role)`)
    .lt('end_date', new Date().toISOString())
    .order('start_date', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Fetch a single trip by id */
export async function fetchTrip(id: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select(`*, trip_groups (group_id, groups (name, invite_token)), trip_attendees (status, user_id, role, users (full_name))`)
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** RSVP to a trip */
export async function upsertRSVP(
  tripId: string,
  userId: string,
  status: 'attending' | 'not_attending' | 'maybe'
) {
  const { error } = await supabase.from('trip_attendees').upsert(
    { trip_id: tripId, user_id: userId, status },
    { onConflict: 'trip_id,user_id' }
  );
  if (error) throw new Error(error.message);
}

/** Create a new trip - auto-creates a group with the trip name */
export async function createTrip(tripData: {
  title: string;
  start_date: string;
  end_date: string;
  location_area: string;
  is_hidden: boolean;
  max_participants: number | null;
  lat: number | null;
  lng: number | null;
  start_lat: number | null;
  start_lng: number | null;
  off_road_url: string | null;
  meeting_time: string | null;
}): Promise<Trip> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Auto-create a group named after the trip
  const inviteToken = Math.random().toString(36).substring(2, 10).toUpperCase();

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name: tripData.title,
      description: `Crew for trip: ${tripData.title}`,
      created_by: user.id,
      invite_token: inviteToken,
    })
    .select()
    .single();

  if (groupError) throw new Error(groupError.message);

  // 2. Add creator as group manager
  await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'manager'
  });

  // 3. Insert the trip linked to the auto-created group
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({
      ...tripData,
      group_id: group.id,
      created_by: user.id
    })
    .select()
    .single();

  if (tripError) throw new Error(tripError.message);

  clearTripsCache();

  // 4. Link trip to group via trip_groups table
  await supabase.from('trip_groups').insert({
    trip_id: trip.id,
    group_id: group.id
  });

  return trip;
}

export async function updateTrip(tripId: string, updates: Partial<Trip>) {
  const { error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', tripId);
  
  if (error) throw new Error(error.message);
  clearTripsCache();
}

export async function deleteTrip(tripId: string) {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId);
    
  if (error) throw new Error(error.message);
  clearTripsCache();
}

export async function toggleTripManager(tripId: string, targetUserId: string, setAsManager: boolean) {
  const { error } = await supabase
    .from('trip_attendees')
    .update({ role: setAsManager ? 'manager' : 'attendee' })
    .eq('trip_id', tripId)
    .eq('user_id', targetUserId);
    
  if (error) throw new Error(error.message);
}

export async function archiveTrip(tripId: string) {
  const { error } = await supabase
    .from('trips')
    .update({ is_archived: true })
    .eq('id', tripId);

  if (error) throw new Error(error.message);
}
