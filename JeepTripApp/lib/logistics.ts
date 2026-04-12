import { supabase } from '@/lib/supabase';

export interface LogisticsItem {
  id: string;
  trip_id: string;
  category: string;
  item_name: string;
  assigned_to: string | null;
  is_completed: boolean;
  created_at: string;
}

/** Fetch all logistics for a trip */
export async function fetchLogistics(tripId: string): Promise<LogisticsItem[]> {
  const { data, error } = await supabase
    .from('logistics_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Add a new item */
export async function addLogisticsItem(tripId: string, category: string, itemName: string) {
  const { error } = await supabase
    .from('logistics_items')
    .insert({ trip_id: tripId, category, item_name: itemName });
  
  if (error) throw new Error(error.message);
}

/** Toggle completion status and claim the item */
export async function toggleItemCompletion(itemId: string, currentStatus: boolean, userId: string) {
  const { error } = await supabase
    .from('logistics_items')
    .update({ 
      is_completed: !currentStatus,
      assigned_to: !currentStatus ? userId : null
    })
    .eq('id', itemId);

  if (error) throw new Error(error.message);
}

/** Update an item name or category */
export async function updateLogisticsItem(itemId: string, updates: Partial<LogisticsItem>) {
  const { error } = await supabase
    .from('logistics_items')
    .update(updates)
    .eq('id', itemId);

  if (error) throw new Error(error.message);
}

/** Delete an item */
export async function deleteLogisticsItem(itemId: string) {
  const { error } = await supabase
    .from('logistics_items')
    .delete()
    .eq('id', itemId);

  if (error) throw new Error(error.message);
}

export interface LogisticsTemplate {
  id: string;
  name: string;
}

export async function fetchLogisticsTemplates(): Promise<LogisticsTemplate[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('logistics_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveLogisticsTemplate(templateName: string, items: LogisticsItem[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Insert Template
  const { data: template, error: tmplError } = await supabase
    .from('logistics_templates')
    .insert({ user_id: user.id, name: templateName })
    .select()
    .single();

  if (tmplError) throw new Error(tmplError.message);

  // Insert Items
  if (items.length > 0) {
    const freshItems = items.map(item => ({
      template_id: template.id,
      category: item.category,
      item_name: item.item_name
    }));

    const { error: itemsError } = await supabase
      .from('logistics_template_items')
      .insert(freshItems);

    if (itemsError) throw new Error(itemsError.message);
  }
}

export async function applyLogisticsTemplate(tripId: string, templateId: string) {
  // Fetch template items
  const { data: templateItems, error: fetchError } = await supabase
    .from('logistics_template_items')
    .select('*')
    .eq('template_id', templateId);

  if (fetchError) throw new Error(fetchError.message);
  if (!templateItems || templateItems.length === 0) return;

  // Insert as actual trip items
  const newItems = templateItems.map(tItem => ({
    trip_id: tripId,
    category: tItem.category,
    item_name: tItem.item_name,
  }));

  const { error: insertError } = await supabase
    .from('logistics_items')
    .insert(newItems);

  if (insertError) throw new Error(insertError.message);
}
