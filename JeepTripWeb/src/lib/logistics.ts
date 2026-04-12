import { supabase } from './supabase';

export interface LogisticsItem {
  id: string;
  trip_id: string;
  category: 'general' | 'rescue' | 'food';
  item_name: string;
  is_completed: boolean;
  completed_by: string | null;
  created_at: string;
}

export interface LogisticsTemplate {
  id: string;
  name: string;
  items: any[];
  created_by: string;
}

export async function fetchLogistics(tripId: string): Promise<LogisticsItem[]> {
  const { data, error } = await supabase
    .from('logistics_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addLogisticsItem(tripId: string, category: string, itemName: string) {
  const { error } = await supabase.from('logistics_items').insert({
    trip_id: tripId, category, item_name: itemName,
  });
  if (error) throw new Error(error.message);
}

export async function toggleItemCompletion(itemId: string, currentStatus: boolean, userId: string) {
  const { error } = await supabase.from('logistics_items').update({
    is_completed: !currentStatus,
    completed_by: !currentStatus ? userId : null,
  }).eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function updateLogisticsItem(itemId: string, updates: Partial<LogisticsItem>) {
  const { error } = await supabase.from('logistics_items').update(updates).eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function deleteLogisticsItem(itemId: string) {
  const { error } = await supabase.from('logistics_items').delete().eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function fetchLogisticsTemplates(): Promise<LogisticsTemplate[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('logistics_templates').select('*').eq('created_by', user.id);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveLogisticsTemplate(name: string, items: LogisticsItem[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('logistics_templates').insert({
    name, items, created_by: user.id,
  });
  if (error) throw new Error(error.message);
}

export async function applyLogisticsTemplate(tripId: string, templateId: string) {
  const { data: template } = await supabase.from('logistics_templates').select('*').eq('id', templateId).single();
  if (!template) throw new Error('Template not found');
  const itemsToInsert = template.items.map((item: any) => ({
    trip_id: tripId, category: item.category, item_name: item.item_name, is_completed: false,
  }));
  const { error } = await supabase.from('logistics_items').insert(itemsToInsert);
  if (error) throw new Error(error.message);
}
