import { supabase } from './supabase';

export interface ChatMessage {
  id: string;
  trip_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  created_at: string;
  users?: { full_name: string };
}

export async function fetchMessages(tripId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('trip_messages')
    .select(`*, users:sender_id (full_name)`)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function sendMessage(tripId: string, content: string, mediaUrl: string | null = null, mediaType: 'image' | 'video' | null = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('trip_messages').insert({
    trip_id: tripId,
    sender_id: user.id,
    content,
    media_url: mediaUrl,
    media_type: mediaType,
    image_url: mediaType === 'image' ? mediaUrl : null,
  });

  if (error) throw new Error(error.message);
}

export async function uploadMediaFile(file: File, type: 'image' | 'video'): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const ext = file.name.split('.').pop();
  const filePath = `${user.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('trip-media')
    .upload(filePath, file, { contentType: file.type, upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from('trip-media').getPublicUrl(filePath);
  return data.publicUrl;
}

export async function fetchPrivateMessages(otherUserId: string): Promise<ChatMessage[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('private_messages')
    .select(`*, users:sender_id (full_name)`)
    .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function sendPrivateMessage(recipientId: string, content: string, mediaUrl: string | null = null, mediaType: 'image' | 'video' | null = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('private_messages').insert({
    sender_id: user.id, recipient_id: recipientId, content,
    media_url: mediaUrl, media_type: mediaType,
    image_url: mediaType === 'image' ? mediaUrl : null,
  });

  if (error) throw new Error(error.message);
}
