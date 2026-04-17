import React, { memo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { addLogisticsItem, deleteLogisticsItem, updateLogisticsItem, toggleItemCompletion, fetchLogistics, LogisticsItem, LogisticsTemplate } from '@/lib/logistics';

interface DashLogisticsProps {
  tripId: string;
  userId: string;
  logistics: LogisticsItem[];
  canManageTrip: boolean;
  isRTL: boolean;
  t: (key: any) => string;
  logisticsCategory: 'general' | 'rescue' | 'food';
  setLogisticsCategory: (cat: 'general' | 'rescue' | 'food') => void;
  setLogistics: (logs: LogisticsItem[]) => void;
  handleOpenTemplates: () => void;
  showTemplatesModal: boolean;
  setShowTemplatesModal: (show: boolean) => void;
  userTemplates: LogisticsTemplate[];
  handleLoadTemplate: (templateId: string) => void;
  handleSaveAsTemplate: () => void;
}

const LogisticsItemRow = memo(({ item, isRTL, handleEditRequest, handleToggleLogistics }: any) => {
  const rtlText = isRTL ? { textAlign: 'right' as const } : { textAlign: 'left' as const };
  const rowStyle = isRTL ? { flexDirection: 'row-reverse' as const } : { flexDirection: 'row' as const };

  return (
    <View style={[styles.card, { paddingVertical: Spacing.md, marginBottom: Spacing.sm, gap: 12 }, rowStyle]}>
      <TouchableOpacity 
        style={[styles.checkbox, item.is_completed && styles.checkboxActive]}
        onPress={() => handleToggleLogistics(item)}
      >
        {item.is_completed && <Text style={{ color: Palette.charcoal, fontWeight: '800', fontSize: 12 }}>✓</Text>}
      </TouchableOpacity>
      <TouchableOpacity 
        style={{ flex: 1 }}
        onPress={() => handleEditRequest(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.itemTitle, rtlText, item.is_completed && { textDecorationLine: 'line-through', opacity: 0.6 }]}>
          {item.item_name}
        </Text>
        {item.completed_by_name && (
          <Text style={[styles.completedBy, rtlText]}>
            {isRTL ? `ע"י ${item.completed_by_name}` : `by ${item.completed_by_name}`}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
});

export const DashLogistics = memo(({
  tripId,
  userId,
  logistics,
  canManageTrip,
  isRTL,
  t,
  logisticsCategory,
  setLogisticsCategory,
  setLogistics,
  handleOpenTemplates,
  showTemplatesModal,
  setShowTemplatesModal,
  userTemplates,
  handleLoadTemplate,
  handleSaveAsTemplate,
}: DashLogisticsProps) => {
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<LogisticsItem | null>(null);

  const rtlText = isRTL ? { textAlign: 'right' as const } : { textAlign: 'left' as const };
  const rowStyle = isRTL ? { flexDirection: 'row-reverse' as const } : { flexDirection: 'row' as const };

  const handleAdd = async () => {
    if (!newItemName.trim()) return;
    try {
      await addLogisticsItem(tripId, logisticsCategory, newItemName.trim());
      setNewItemName('');
      fetchLogistics(tripId).then(setLogistics);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to add item');
    }
  };

  const handleUpdate = async (item: LogisticsItem, name: string) => {
    try {
      await updateLogisticsItem(item.id, { item_name: name });
      setEditingItem(null);
      setNewItemName('');
      fetchLogistics(tripId).then(setLogistics);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLogisticsItem(id);
      fetchLogistics(tripId).then(setLogistics);
    } catch (e) { console.error(e); }
  };

  const handleToggle = async (item: LogisticsItem) => {
    try {
      await toggleItemCompletion(item.id, item.is_completed, userId);
      fetchLogistics(tripId).then(setLogistics);
    } catch (e) { console.error(e); }
  };

  const filtered = logistics.filter(l => l.category === logisticsCategory);

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.categoryTabs, rowStyle]}>
        {(['general', 'rescue', 'food'] as const).map(cat => (
          <TouchableOpacity key={cat} style={[styles.categoryTab, logisticsCategory === cat && styles.categoryTabActive]} onPress={() => setLogisticsCategory(cat)}>
            <Text style={[styles.categoryTabText, logisticsCategory === cat && styles.categoryTabTextActive]}>
              {cat === 'general' ? (isRTL ? 'ברכב' : 'In Car') : cat === 'rescue' ? (isRTL ? 'חילוץ' : 'Rescue') : (isRTL ? 'אוכל/שתיה' : 'Food/Drink')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {canManageTrip && (
        <View style={[rowStyle, { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, justifyContent: 'space-between' }]}>
          <TouchableOpacity onPress={handleOpenTemplates}>
            <Text style={{ color: Palette.gold, fontWeight: '700', fontSize: Typography.sm }}>📄 {isRTL ? 'תבניות לוגיסטיקה' : 'Logistics Templates'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.scrollContent}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        renderItem={({ item }) => (
          <LogisticsItemRow 
            item={item} 
            isRTL={isRTL} 
            handleToggleLogistics={handleToggle} 
            handleDeleteLogistics={handleDelete}
            handleEditRequest={(itemRow: any) => {
              Alert.alert(
                isRTL ? 'ניהול פריט' : 'Manage Item',
                itemRow.item_name,
                [
                  { text: isRTL ? 'ביטול' : 'Cancel', style: 'cancel' },
                  { text: isRTL ? 'מחיקה' : 'Delete', style: 'destructive', onPress: () => handleDelete(itemRow.id) },
                  { text: isRTL ? 'עריכה' : 'Edit', onPress: () => {
                    setEditingItem(itemRow);
                    setNewItemName(itemRow.item_name);
                  }}
                ]
              );
            }}
          />
        )}
      />

      <View style={[styles.inputRow, rowStyle]}>
        <TextInput
          style={[styles.textInput, rtlText, { paddingVertical: Platform.OS === 'ios' ? 12 : 8, minHeight: 48, maxHeight: 120 }]}
          placeholderTextColor={Palette.mud}
          placeholder={editingItem ? (isRTL ? 'ערוך שם פריט...' : 'Edit name...') : (isRTL ? 'הוסף פריט...' : 'Add item...')}
          value={newItemName}
          onChangeText={setNewItemName}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={() => editingItem ? handleUpdate(editingItem, newItemName) : handleAdd()}>
          <Text style={{ color: Palette.charcoal, fontWeight: '800' }}>{editingItem ? '✓' : '+'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showTemplatesModal} animationType="slide" transparent>
         <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
           <View style={{ backgroundColor: Palette.charcoal, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, padding: Spacing.xl, height: '70%' }}>
              <View style={[rowStyle, { justifyContent: 'space-between', marginBottom: Spacing.lg }]}>
                <Text style={[styles.sectionTitle, rtlText]}>{isRTL ? 'תבניות לוגיסטיקה' : 'Logistics Templates'}</Text>
                <TouchableOpacity onPress={() => setShowTemplatesModal(false)}>
                  <Text style={{ color: Palette.sand, fontWeight: '700' }}>{isRTL ? 'סגור' : 'Close'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[styles.actionBtn, { marginBottom: Spacing.xl }]} onPress={handleSaveAsTemplate}>
                <Text style={styles.actionBtnText}>💾 {isRTL ? 'שמור רשימה נוכחית כתבנית' : 'Save current list as template'}</Text>
              </TouchableOpacity>

              <Text style={[styles.label, rtlText, { marginBottom: Spacing.md }]}>{isRTL ? 'טען תבנית קיימת' : 'Load Existing Template'}</Text>
              
              <FlatList
                data={userTemplates}
                keyExtractor={t => t.id}
                ListEmptyComponent={<Text style={{ color: Palette.sand, ...rtlText }}>{isRTL ? 'אין תבניות שמורות' : 'No saved templates'}</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity style={[styles.card, { padding: Spacing.md, marginBottom: Spacing.md }]} onPress={() => handleLoadTemplate(item.id)}>
                    <Text style={[styles.cardTitle, rtlText]}>{item.name}</Text>
                    <Text style={{ color: Palette.gold, fontSize: 10, fontWeight: '700', marginTop: 4, ...rtlText }}>{isRTL ? 'לחץ לטעינה למסע הזה' : 'Tap to load into this trip'}</Text>
                  </TouchableOpacity>
                )}
              />
           </View>
         </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  scrollContent: { padding: Spacing.md, paddingBottom: 50 },
  card: { backgroundColor: Palette.charcoalMid, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.charcoalLight, padding: Spacing.lg },
  cardTitle: { fontSize: Typography.base, fontWeight: '800', color: Palette.cream, marginBottom: Spacing.xs },
  itemTitle: { fontSize: Typography.base, fontWeight: '700', color: Palette.cream },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Palette.gold, marginBottom: Spacing.sm },
  label: { fontSize: 12, color: Palette.gold, fontWeight: '700' },
  completedBy: { fontSize: 10, color: Palette.sand, marginTop: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Palette.gold, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: Palette.gold },
  actionBtn: { backgroundColor: Palette.charcoalLight, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1, borderColor: '#3A3A32' },
  actionBtnText: { color: Palette.cream, fontSize: Typography.base, fontWeight: '600' },
  categoryTabs: { flexDirection: 'row', backgroundColor: Palette.charcoalMid, borderBottomWidth: 1, borderBottomColor: Palette.charcoalLight },
  categoryTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  categoryTabActive: { borderBottomColor: Palette.gold },
  categoryTabText: { color: Palette.mud, fontSize: 12, fontWeight: '700' },
  categoryTabTextActive: { color: Palette.gold },
  inputRow: { backgroundColor: Palette.charcoalMid, padding: 10, borderTopWidth: 1, borderTopColor: Palette.charcoalLight, gap: 10, alignItems: 'center' },
  textInput: { flex: 1, backgroundColor: Palette.charcoal, color: Palette.cream, padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.charcoalLight },
  sendBtn: { backgroundColor: Palette.gold, width: 45, height: 45, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
});
