import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  id: string;
  trip_id: string;
  sender_id: string;
  content: string;
  image_url: string | null; // Legacy
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  created_at: string;
  users?: {
    full_name: string;
  };
}

/** Fetch messages for a trip */
export async function fetchMessages(tripId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('trip_messages')
    .select(`
      *,
      users:sender_id (full_name)
    `)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Upload a file to Supabase Storage */
export async function uploadMediaFile(uri: string, type: 'image' | 'video'): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const fileExt = uri.split('.').pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  // Use fetch to get the file as a blob
  const response = await fetch(uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('trip-media')
    .upload(filePath, blob, {
      contentType: type === 'image' ? 'image/jpeg' : 'video/mp4',
      upsert: true
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage
    .from('trip-media')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/** Send a message */
export async function sendMessage(tripId: string, content: string, mediaUrl: string | null = null, mediaType: 'image' | 'video' | null = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('trip_messages')
    .insert({
      trip_id: tripId,
      sender_id: user.id,
      content,
      media_url: mediaUrl,
      media_type: mediaType,
      image_url: mediaType === 'image' ? mediaUrl : null // Backward compatibility
    });

  if (error) throw new Error(error.message);

  const { data: insertedData } = await supabase
    .from('trip_messages')
    .select(`*, users:sender_id (full_name)`)
    .eq('sender_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return insertedData;
}

/** Fetch private messages */
export async function fetchPrivateMessages(otherUserId: string): Promise<ChatMessage[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('private_messages')
    .select(`
      *,
      users:sender_id (full_name)
    `)
    .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Send a private message */
export async function sendPrivateMessage(recipientId: string, content: string, mediaUrl: string | null = null, mediaType: 'image' | 'video' | null = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('private_messages')
    .insert({
      sender_id: user.id,
      recipient_id: recipientId,
      content,
      media_url: mediaUrl,
      media_type: mediaType,
      image_url: mediaType === 'image' ? mediaUrl : null // Backward compatibility
    });

  if (error) throw new Error(error.message);
}
