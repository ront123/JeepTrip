import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, FlatList, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { Palette, Typography, Spacing, Radius } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { updateTrip, deleteTrip, toggleTripManager, archiveTrip } from '@/lib/trips';
import { router } from 'expo-router';

export function TripSettingsModal({ 
  visible, 
  onClose, 
  trip, 
  userId,
  onTripUpdated 
}: { 
  visible: boolean; 
  onClose: () => void; 
  trip: any;
  userId: string;
  onTripUpdated: () => void;
}) {
  const { t, isRTL } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(trip?.title || '');
  const [offroadUrl, setOffroadUrl] = useState(trip?.off_road_url || '');
  const [locationArea, setLocationArea] = useState(trip?.location_area || '');
  const [maxParticipants, setMaxParticipants] = useState(trip?.max_participants?.toString() || '');
  const [meetingTime, setMeetingTime] = useState(trip?.meeting_time || '');
  
  const [startDate, setStartDate] = useState(new Date(trip?.start_date || new Date()));
  const [endDate, setEndDate] = useState(new Date(trip?.end_date || new Date()));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  // Update state when trip prop changes
  useEffect(() => {
    if (trip) {
      setTitle(trip.title || '');
      setOffroadUrl(trip.off_road_url || '');
      setLocationArea(trip.location_area || '');
      setMaxParticipants(trip.max_participants?.toString() || '');
      setMeetingTime(trip.meeting_time || '');
      if (trip.start_date) setStartDate(new Date(trip.start_date));
      if (trip.end_date) setEndDate(new Date(trip.end_date));
    }
  }, [trip]);

  if (!trip) return null;

  const rtlText = isRTL ? { textAlign: 'right' as const } : { textAlign: 'left' as const };
  const rowStyle = isRTL ? { flexDirection: 'row-reverse' as const } : { flexDirection: 'row' as const };

  const handleMeetingTimeChange = (text: string) => {
    // Keep only numbers and colon
    let cleaned = text.replace(/[^0-9:]/g, '');
    
    // Auto-insert colon if 2 digits are entered
    if (cleaned.length === 2 && text.length === 2 && !cleaned.includes(':')) {
      cleaned += ':';
    }
    
    // Limit to exactly 5 characters
    if (cleaned.length > 5) {
      cleaned = cleaned.substring(0, 5);
    }
    
    setMeetingTime(cleaned);
  };

  const handleSave = async () => {
    // Validate meeting time format if filled
    if (meetingTime.trim() && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(meetingTime.trim())) {
      Alert.alert(isRTL ? 'שגיאה' : 'Error', isRTL ? 'אנא הזן שעה חוקית בפורמט HH:MM (לדוגמה 08:30)' : 'Please enter a valid time in HH:MM format (e.g., 08:30)');
      return;
    }

    setEditing(true);
    try {
      await updateTrip(trip.id, {
        title: title.trim(),
        location_area: locationArea.trim(),
        off_road_url: offroadUrl.trim() || null,
        meeting_time: meetingTime.trim() || null,
        max_participants: maxParticipants ? parseInt(maxParticipants) : null,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });
      Alert.alert('Success', isRTL ? 'פרטי המסע עודכנו' : 'Trip updated successfully');
      onTripUpdated();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setEditing(false);
    }
  };

  const handleArchive = () => {
    Alert.alert(
      isRTL ? 'סגירת מסע (ארכיון)' : 'Archive Trip',
      isRTL ? 'האם אתה בטוח שברצונך לסגור את המסע? לא יהיה ניתן לשלוח הודעות חדשות בצאט.' : 'Are you sure you want to archive this trip? Chat will become read-only.',
      [
        { text: isRTL ? 'ביטול' : 'Cancel', style: 'cancel' },
        { 
          text: isRTL ? 'סגור מסע' : 'Archive', 
          onPress: async () => {
             try {
               await archiveTrip(trip.id);
               Alert.alert('Archived', isRTL ? 'המסע הועבר לארכיון.' : 'Trip archived.');
               onTripUpdated();
               onClose();
             } catch(e: any) {
               Alert.alert('Error', e.message);
             }
          }
        }
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      isRTL ? 'מחיקת מסע' : 'Delete Trip',
      isRTL ? 'האם אתה בטוח שברצונך למחוק לצמיתות את המסע הזה?' : 'Are you sure you want to permanently delete this trip?',
      [
        { text: isRTL ? 'ביטול' : 'Cancel', style: 'cancel' },
        { 
          text: isRTL ? 'מחק' : 'Delete', 
          style: 'destructive',
          onPress: async () => {
             try {
               await deleteTrip(trip.id);
               Alert.alert('Deleted', isRTL ? 'המסע נמחק.' : 'Trip deleted.');
               router.back();
             } catch(e: any) {
               Alert.alert('Error', e.message);
             }
          }
        }
      ]
    );
  };

  const handleToggleManager = async (targetId: string, currentRole: string) => {
    try {
      const isManager = currentRole === 'manager';
      await toggleTripManager(trip.id, targetId, !isManager);
      onTripUpdated(); // Refresh trip to show updated badges
    } catch(e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalRoot}>
        <View style={styles.modalContent}>
          <Text style={[styles.modalTitle, rtlText]}>{isRTL ? 'הגדרות מסע' : 'Trip Settings'}</Text>
          
          <FlatList
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View style={{ marginBottom: Spacing.xl }}>
                <Text style={[styles.label, rtlText]}>{isRTL ? 'שם המסע' : 'Trip Title'}</Text>
                <TextInput style={[styles.input, rtlText]} value={title} onChangeText={setTitle} placeholderTextColor={Palette.mud} />
                
                <Text style={[styles.label, rtlText, { marginTop: Spacing.md }]}>{isRTL ? 'אזור טיול כללי (לדוג׳ מדבר יהודה)' : 'General Location'}</Text>
                <TextInput style={[styles.input, rtlText]} value={locationArea} onChangeText={setLocationArea} placeholderTextColor={Palette.mud} />

                <View style={[rowStyle, { gap: Spacing.md, marginTop: Spacing.md }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, rtlText]}>{isRTL ? 'תאריך יציאה' : 'Start Date'}</Text>
                    <TouchableOpacity style={styles.dateSelector} onPress={() => setShowStartPicker(true)}>
                      <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, rtlText]}>{isRTL ? 'תאריך חזרה' : 'End Date'}</Text>
                    <TouchableOpacity style={styles.dateSelector} onPress={() => setShowEndPicker(true)}>
                      <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Text style={[styles.label, rtlText, { marginTop: Spacing.md }]}>{isRTL ? 'שעת מפגש (לדוגמה 08:30)' : 'Meeting Time'}</Text>
                <TextInput 
                  style={[styles.input, rtlText]} 
                  value={meetingTime} 
                  onChangeText={handleMeetingTimeChange} 
                  placeholder="08:30" 
                  placeholderTextColor={Palette.mud} 
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                
                <Text style={[styles.label, rtlText, { marginTop: Spacing.md }]}>{isRTL ? 'לינק מסלול ל-OffRoad' : 'Off-Road Track URL'}</Text>
                <TextInput style={[styles.input, rtlText]} value={offroadUrl} onChangeText={setOffroadUrl} placeholderTextColor={Palette.mud} />
                
                <Text style={[styles.label, rtlText, { marginTop: Spacing.md }]}>{isRTL ? 'מקסימום ג׳יפים או ריק ללא הגבלה' : 'Max Participants (leave empty for unlmtd)'}</Text>
                <TextInput style={[styles.input, rtlText]} value={maxParticipants} onChangeText={setMaxParticipants} keyboardType="numeric" placeholderTextColor={Palette.mud} />

                <View style={[styles.actions, rowStyle, { marginTop: Spacing.lg }]}>
                   <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                     <Text style={styles.cancelBtnText}>{isRTL ? 'סגור' : 'Close'}</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={editing}>
                     {editing ? <ActivityIndicator color={Palette.charcoal} size="small" /> : <Text style={styles.saveBtnText}>{isRTL ? 'שמור' : 'Save'}</Text>}
                   </TouchableOpacity>
                </View>

                {trip.created_by === userId && !trip.is_archived && (
                  <TouchableOpacity style={styles.archiveBtn} onPress={handleArchive}>
                    <Text style={styles.archiveBtnText}>{isRTL ? 'סגור מסע (ארכיון)' : 'Archive Trip (Close)'}</Text>
                  </TouchableOpacity>
                )}

                {trip.created_by === userId && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                    <Text style={styles.deleteBtnText}>{isRTL ? 'מחק מסע לצמיתות' : 'Permanently Delete Trip'}</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.divider} />
                <Text style={[styles.sectionTitle, rtlText]}>{isRTL ? 'ניהול משתתפים ומנהלים' : 'Manage Crew & Managers'}</Text>
                <Text style={[styles.desc, rtlText]}>
                  {isRTL ? 'רק יוצר המסע יכול למנות מנהלים. מנהלים יכולים גם הם לערוך את המסע.' : 'Only the creator can appoint managers. Managers can edit trip details.'}
                </Text>
              </View>
            }
            data={trip.trip_attendees || []}
            keyExtractor={(item) => item.user_id}
            renderItem={({ item }) => {
              if (item.user_id === trip.created_by) return null; // Creator can't be modified
              const isManager = item.role === 'manager';
              const displayName = item.users?.full_name || item.user_id.substring(0,8);
              return (
                <View style={[styles.attendeeRow, rowStyle]}>
                  <Text style={{ color: Palette.cream, flex: 1, ...rtlText }}>{displayName}</Text>
                  
                  {trip.created_by === userId && (
                    <TouchableOpacity 
                      style={[styles.badgeBtn, isManager ? { backgroundColor: Palette.gold } : { backgroundColor: Palette.charcoalLight }]} 
                      onPress={() => handleToggleManager(item.user_id, item.role)}
                    >
                      <Text style={{ color: isManager ? Palette.charcoal : Palette.cream, fontSize: 10, fontWeight: '700' }}>
                        {isManager ? (isRTL ? 'מנהל' : 'MANAGER') : (isRTL ? 'משתתף' : 'ATTENDEE')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Date Pickers */}
      {showStartPicker && Platform.OS === 'android' && (
        <RNDateTimePicker value={startDate} mode="date" display="default" onChange={(event, date) => { setShowStartPicker(false); if (date) setStartDate(date); }} />
      )}
      {showEndPicker && Platform.OS === 'android' && (
        <RNDateTimePicker value={endDate} mode="date" display="default" onChange={(event, date) => { setShowEndPicker(false); if (date) setEndDate(date); }} />
      )}
      {Platform.OS === 'ios' && (showStartPicker || showEndPicker) && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.pickerContainer}>
              <RNDateTimePicker
                value={showStartPicker ? startDate : endDate}
                mode="date"
                display="inline"
                onChange={(event, date) => {
                  if (date) {
                    if (showStartPicker) setStartDate(date);
                    if (showEndPicker) setEndDate(date);
                  }
                }}
                themeVariant="dark"
              />
              <TouchableOpacity style={styles.actionBtn} onPress={() => { setShowStartPicker(false); setShowEndPicker(false); }}>
                <Text style={styles.actionBtnText}>{isRTL ? 'אישור' : 'Done'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { backgroundColor: Palette.charcoal, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, padding: Spacing.xl, height: '85%' },
  modalTitle: { fontSize: Typography.xl, fontWeight: '800', color: Palette.cream, marginBottom: Spacing.lg },
  label: { fontSize: Typography.xs, color: Palette.gold, fontWeight: '700', marginBottom: 4 },
  input: { backgroundColor: Palette.charcoalMid, borderWidth: 1, borderColor: Palette.charcoalLight, color: Palette.cream, borderRadius: Radius.md, padding: 12, fontSize: Typography.md },
  actions: { gap: Spacing.md },
  cancelBtn: { flex: 1, padding: 15, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.charcoalLight, alignItems: 'center' },
  cancelBtnText: { color: Palette.sand, fontWeight: '700' },
  saveBtn: { flex: 1, padding: 15, borderRadius: Radius.md, backgroundColor: Palette.olive, alignItems: 'center' },
  saveBtnText: { color: Palette.cream, fontWeight: '800' },
  archiveBtn: { marginTop: Spacing.xl, padding: 15, borderRadius: Radius.md, backgroundColor: 'rgba(255, 149, 0, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 149, 0, 0.3)', alignItems: 'center' },
  archiveBtnText: { color: '#ff9500', fontWeight: '700' },
  deleteBtn: { marginTop: Spacing.md, padding: 15, borderRadius: Radius.md, backgroundColor: 'rgba(255, 59, 48, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 59, 48, 0.3)', alignItems: 'center' },
  deleteBtnText: { color: '#ff3b30', fontWeight: '700' },
  divider: { height: 1, backgroundColor: Palette.charcoalLight, marginVertical: Spacing.xl },
  sectionTitle: { fontSize: Typography.lg, fontWeight: '800', color: Palette.cream, marginBottom: 8 },
  desc: { color: Palette.sand, fontSize: Typography.xs, marginBottom: Spacing.md },
  attendeeRow: { backgroundColor: Palette.charcoalMid, padding: 12, borderRadius: Radius.md, marginBottom: 8, alignItems: 'center', justifyContent: 'space-between' },
  badgeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  dateSelector: { backgroundColor: Palette.charcoalMid, borderWidth: 1, borderColor: Palette.charcoalLight, borderRadius: Radius.md, padding: 15, alignItems: 'center' },
  dateValue: { color: Palette.cream, fontSize: Typography.sm, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  pickerContainer: { backgroundColor: Palette.charcoalMid, borderRadius: Radius.lg, padding: Spacing.xl, width: '90%', alignItems: 'stretch' },
  actionBtn: { backgroundColor: Palette.olive, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.xl },
  actionBtnText: { color: Palette.cream, fontWeight: '800', fontSize: Typography.base },
});
