import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Modal,
  LogBox,
  FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { Palette, Typography, Spacing, Radius } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchMyGroups, Group } from '@/lib/groups';
import { createTrip } from '@/lib/trips';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('Google Maps API Key is missing. Live search will not work.');
}

// Suppress known warning caused by GooglePlacesAutocomplete's internal FlatList inside our form ScrollView
LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

export default function CreateTripScreen() {
  const { groupId } = useLocalSearchParams();
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000));
  const [meetingTime, setMeetingTime] = useState(new Date());
  const [isHidden, setIsHidden] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [startLat, setStartLat] = useState('');
  const [startLng, setStartLng] = useState('');
  const [offRoadUrl, setOffRoadUrl] = useState('');

  // Picker State
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);


  const handleCreate = async () => {
    if (!title.trim() || !location.trim()) {
      Alert.alert(isRTL ? 'שדות חסרים' : 'Missing Fields', isRTL ? 'אנא מלא שם וכתובת' : 'Please fill in the title and location.');
      return;
    }

    setLoading(true);
    try {
      await createTrip({
        title,
        location_area: location,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_hidden: isHidden,
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        start_lat: startLat ? parseFloat(startLat) : null,
        start_lng: startLng ? parseFloat(startLng) : null,
        off_road_url: offRoadUrl || null,
        meeting_time: formatTime(meetingTime),
      });
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (date: Date) => {
    return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(isRTL ? 'he-IL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const rtlText = isRTL ? { textAlign: 'right' as const } : {};
  const rowStyle = isRTL ? { flexDirection: 'row-reverse' as const } : { flexDirection: 'row' as const };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient colors={[Palette.charcoal, '#1C1E16']} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, rowStyle]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name={isRTL ? 'chevron.right' : 'chevron.left.forwardslash.chevron.right'} size={28} color={Palette.gold} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerSub, rtlText]}>MISSION CONTROL</Text>
            <Text style={[styles.headerTitle, rtlText]}>{isRTL ? 'תכנון מסע חדש' : 'Plan New Trip'}</Text>
          </View>
        </View>

        <View style={styles.goldLine} />

        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <View style={styles.formSection}>
              <Text style={[styles.label, rtlText]}>{isRTL ? 'שם המסע' : 'Trip Title'}</Text>
              <TextInput
                style={[styles.input, rtlText]}
                placeholder={isRTL ? 'למשל: חוצי נגב 2026' : 'e.g. Negev Crossing 2026'}
                placeholderTextColor={Palette.mud}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={[styles.label, rtlText]}>{isRTL ? 'בחירת יעד להגעה (Google Maps)' : 'Search Destination'}</Text>
              <GooglePlacesAutocomplete
                placeholder={isRTL ? 'חפש מקום...' : 'Search for a place...'}
                fetchDetails={true}
                onPress={(data, details = null) => {
                  setLocation(data.description);
                  if (details) {
                    setLat(details.geometry.location.lat.toString());
                    setLng(details.geometry.location.lng.toString());
                  }
                }}
                query={{
                  key: GOOGLE_MAPS_API_KEY,
                  language: isRTL ? 'he' : 'en',
                  components: 'country:il',
                }}
                styles={{
                  container: { flex: 0 },
                  textInput: [styles.input, { textAlign: isRTL ? 'right' : 'left' }],
                  listView: { 
                    position: 'absolute',
                    top: 50,
                    backgroundColor: Palette.charcoalMid, 
                    borderRadius: Radius.md, 
                    zIndex: 2000,
                    elevation: 5,
                    maxHeight: 200,
                    width: '100%',
                  },
                  row: { backgroundColor: Palette.charcoalMid, padding: 13 },
                  description: { color: Palette.cream },
                }}
                enablePoweredByContainer={false}
                onFail={(error) => {
                  console.error('Google Places Error:', error);
                  Alert.alert('Search Error', 'Could not fetch places. Check your API Key or network connection.');
                }}
                textInputProps={{
                  placeholderTextColor: Palette.mud,
                }}
              />

              <Text style={[styles.label, rtlText]}>{isRTL ? 'בחירת נקודת התחלה' : 'Search Start Point'}</Text>
              <GooglePlacesAutocomplete
                placeholder={isRTL ? 'חפש נקודת מפגש...' : 'Search for meeting point...'}
                fetchDetails={true}
                onPress={(data, details = null) => {
                  if (details) {
                    setStartLat(details.geometry.location.lat.toString());
                    setStartLng(details.geometry.location.lng.toString());
                  }
                }}
                query={{
                  key: GOOGLE_MAPS_API_KEY,
                  language: isRTL ? 'he' : 'en',
                  components: 'country:il',
                }}
                styles={{
                  container: { flex: 0 },
                  textInput: [styles.input, { textAlign: isRTL ? 'right' : 'left' }],
                  listView: { 
                    position: 'absolute',
                    top: 50,
                    backgroundColor: Palette.charcoalMid, 
                    borderRadius: Radius.md, 
                    zIndex: 1500,
                    elevation: 5,
                    maxHeight: 200,
                    width: '100%',
                  },
                  row: { backgroundColor: Palette.charcoalMid, padding: 13 },
                  description: { color: Palette.cream },
                }}
                enablePoweredByContainer={false}
                onFail={(error) => {
                  console.error('Google Places Error:', error);
                  Alert.alert('Search Error', 'Could not fetch places. Check your API Key or network connection.');
                }}
                textInputProps={{
                  placeholderTextColor: Palette.mud,
                }}
              />

              <View style={[rowStyle, { gap: Spacing.md }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, rtlText]}>{isRTL ? 'תאריך יציאה' : 'Start Date'}</Text>
                  <TouchableOpacity style={styles.dateSelector} onPress={() => setShowStartPicker(true)}>
                    <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
                  </TouchableOpacity>
                  {Platform.OS === 'android' && showStartPicker && (
                    <RNDateTimePicker
                      value={startDate}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        setShowStartPicker(false);
                        if (date) setStartDate(date);
                      }}
                    />
                  )}
                  {Platform.OS === 'ios' && (
                    <Modal visible={showStartPicker} transparent animationType="fade">
                      <View style={styles.modalOverlay}>
                        <View style={styles.pickerContainer}>
                          <RNDateTimePicker
                            value={startDate}
                            mode="date"
                            display="inline"
                            onChange={(event, date) => { if (date) setStartDate(date); }}
                            themeVariant="dark"
                          />
                          <TouchableOpacity style={styles.doneBtn} onPress={() => setShowStartPicker(false)}>
                            <Text style={styles.doneBtnText}>Save Date</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, rtlText]}>{isRTL ? 'תאריך חזרה' : 'End Date'}</Text>
                  <TouchableOpacity style={styles.dateSelector} onPress={() => setShowEndPicker(true)}>
                    <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
                  </TouchableOpacity>
                  {Platform.OS === 'android' && showEndPicker && (
                    <RNDateTimePicker
                      value={endDate}
                      mode="date"
                      display="default"
                      minimumDate={startDate}
                      onChange={(event, date) => {
                        setShowEndPicker(false);
                        if (date) setEndDate(date);
                      }}
                    />
                  )}
                  {Platform.OS === 'ios' && (
                    <Modal visible={showEndPicker} transparent animationType="fade">
                      <View style={styles.modalOverlay}>
                        <View style={styles.pickerContainer}>
                          <RNDateTimePicker
                            value={endDate}
                            mode="date"
                            display="inline"
                            minimumDate={startDate}
                            onChange={(event, date) => { if (date) setEndDate(date); }}
                            themeVariant="dark"
                          />
                          <TouchableOpacity style={styles.doneBtn} onPress={() => setShowEndPicker(false)}>
                            <Text style={styles.doneBtnText}>Save Date</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>
                  )}
                </View>
              </View>

              <View style={{ flex: 1, marginTop: Spacing.xs }}>
                <Text style={[styles.label, rtlText]}>{isRTL ? 'שעת מפגש' : 'Meeting Time'}</Text>
                <TouchableOpacity style={styles.dateSelector} onPress={() => setShowTimePicker(true)}>
                  <Text style={styles.dateValue}>{formatTime(meetingTime)}</Text>
                </TouchableOpacity>
                {Platform.OS === 'android' && showTimePicker && (
                  <RNDateTimePicker
                    value={meetingTime}
                    mode="time"
                    is24Hour={true}
                    display="default"
                    onChange={(event, date) => {
                      setShowTimePicker(false);
                      if (date) setMeetingTime(date);
                    }}
                  />
                )}
                {Platform.OS === 'ios' && (
                  <Modal visible={showTimePicker} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                      <View style={styles.pickerContainer}>
                        <RNDateTimePicker
                          value={meetingTime}
                          mode="time"
                          display="spinner"
                          is24Hour={true}
                          onChange={(event, date) => { if (date) setMeetingTime(date); }}
                          themeVariant="dark"
                        />
                        <TouchableOpacity style={styles.doneBtn} onPress={() => setShowTimePicker(false)}>
                          <Text style={styles.doneBtnText}>Save Time</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>
                )}
              </View>


              <Text style={[styles.label, rtlText]}>{isRTL ? 'מכסת משתתפים' : 'Participant Limit'}</Text>
              <TextInput
                style={[styles.input, rtlText]}
                placeholder={isRTL ? 'השאר ריק ללא הגבלה' : 'Unlimited if empty'}
                placeholderTextColor={Palette.mud}
                keyboardType="number-pad"
                value={maxParticipants}
                onChangeText={setMaxParticipants}
              />

              <Text style={[styles.label, rtlText]}>{isRTL ? 'קישור למסלול (Offroad / External)' : 'Offroad / External Route Link'}</Text>
              <TextInput
                style={[styles.input, rtlText]}
                placeholder="https://..."
                placeholderTextColor={Palette.mud}
                value={offRoadUrl}
                onChangeText={setOffRoadUrl}
              />

              <View style={[styles.switchRow, rowStyle]}>
                <View>
                  <Text style={[styles.label, { marginBottom: 2 }]}>{isRTL ? 'מסע מוסתר' : 'Hidden Trip'}</Text>
                  <Text style={{ color: Palette.sand, fontSize: 10 }}>{isRTL ? 'יוצג רק למי שיקבל הזמנה אישית' : 'Only visible to invitees'}</Text>
                </View>
                <Switch
                  value={isHidden}
                  onValueChange={setIsHidden}
                  trackColor={{ false: Palette.charcoalMid, true: Palette.gold }}
                  thumbColor={isHidden ? Palette.cream : Palette.mud}
                />
              </View>

              <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={Palette.charcoal} />
                ) : (
                  <Text style={styles.createBtnText}>{isRTL ? 'שגר מסע' : 'Launch Mission'}</Text>
                )}
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.charcoal },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, alignItems: 'center', gap: Spacing.md },
  backButton: { padding: Spacing.xs },
  headerSub: { fontSize: Typography.xs, color: Palette.gold, fontWeight: '700', letterSpacing: 2 },
  headerTitle: { fontSize: Typography.xl, fontWeight: '900', color: Palette.cream },
  goldLine: { height: 2, backgroundColor: Palette.gold, opacity: 0.6, marginHorizontal: Spacing.md },
  scrollContent: { padding: Spacing.md, paddingBottom: 50 },
  formSection: { gap: Spacing.md },
  label: { fontSize: Typography.xs, color: Palette.gold, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  input: { backgroundColor: Palette.charcoalMid, borderBottomWidth: 2, borderBottomColor: Palette.charcoalLight, color: Palette.cream, padding: 15, borderRadius: Radius.md, fontSize: Typography.md },
  dateSelector: { backgroundColor: Palette.charcoalMid, padding: 15, borderRadius: Radius.md, borderBottomWidth: 2, borderBottomColor: Palette.charcoalLight },
  dateValue: { color: Palette.cream, fontSize: Typography.md, fontWeight: '600' },
  groupPicker: { flexWrap: 'wrap', gap: Spacing.sm },
  groupOption: { backgroundColor: Palette.charcoalMid, paddingHorizontal: 15, paddingVertical: 10, borderRadius: Radius.full, borderWidth: 1, borderColor: Palette.charcoalLight },
  groupOptionSelected: { backgroundColor: Palette.gold, borderColor: Palette.gold },
  groupOptionText: { color: Palette.sand, fontWeight: '600', fontSize: Typography.sm },
  groupOptionTextSelected: { color: Palette.charcoal, fontWeight: '800' },
  switchRow: { justifyContent: 'space-between', alignItems: 'center', marginVertical: Spacing.md, backgroundColor: Palette.charcoalMid, padding: 12, borderRadius: Radius.md },
  createBtn: { backgroundColor: Palette.gold, padding: 18, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.xl },
  createBtnText: { color: Palette.charcoal, fontWeight: '900', fontSize: Typography.base, letterSpacing: 1 },
  doneBtn: { backgroundColor: Palette.gold, padding: 15, borderRadius: Radius.md, marginTop: 15, alignItems: 'center', width: '100%' },
  doneBtnText: { color: Palette.charcoal, fontSize: Typography.base, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  pickerContainer: { backgroundColor: Palette.charcoalMid, borderRadius: Radius.lg, padding: Spacing.lg, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: Palette.charcoalLight },
});
