import React, { memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Palette, Typography, Spacing, Radius } from '@/constants/theme';

interface DashOverviewProps {
  trip: any;
  isRTL: boolean;
  t: (key: any) => string;
  userId: string;
  canManageTrip: boolean;
  weather: { temp: number; icon: string; desc: string } | null;
  handleRsvp: (status: 'attending' | 'maybe' | 'not_attending') => void;
  setShowSettingsModal: (show: boolean) => void;
  handleShareInvite: () => void;
  handleAddToCalendar: () => void;
}

export const DashOverview = memo(({
  trip,
  isRTL,
  t,
  userId,
  canManageTrip,
  weather,
  handleRsvp,
  setShowSettingsModal,
  handleShareInvite,
  handleAddToCalendar,
}: DashOverviewProps) => {
  const rtlText = isRTL ? { textAlign: 'right' as const } : { textAlign: 'left' as const };
  const rowStyle = isRTL ? { flexDirection: 'row-reverse' as const } : { flexDirection: 'row' as const };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={[styles.cardTitle, rtlText]}>{trip?.title}</Text>
          <Text style={[styles.cardSub, rtlText]}>
            📍 {trip?.location_area}   |   👥 {trip?.groups?.name}
            {trip?.meeting_time && `   |   🕒 ${trip.meeting_time}`}
          </Text>
        </View>

        {canManageTrip && (
          <View style={[rowStyle, { gap: Spacing.md, marginBottom: Spacing.md }]}>
            <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1, paddingVertical: 10 }]} onPress={() => setShowSettingsModal(true)}>
              <Text style={[styles.actionBtnTextSecondary, { color: Palette.cream }]}>⚙️ {isRTL ? 'הגדרות' : 'Settings'}</Text>
            </TouchableOpacity>
            {!trip?.is_archived && (
              <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1, paddingVertical: 10, borderColor: Palette.gold }]} onPress={handleShareInvite}>
                <Text style={[styles.actionBtnTextSecondary, { color: Palette.gold }]}>🔗 {isRTL ? 'שלח הזמנה' : 'Invite Link'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {trip?.is_archived && (
          <View style={styles.archiveBanner}>
            <Text style={styles.archiveBannerText}>
              🏁 {isRTL ? 'המסע הסתיים. הצאט במצב קריאה בלבד.' : 'Mission accomplished. Chat is read-only.'}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.actionBtn} onPress={handleAddToCalendar}>
          <Text style={styles.actionBtnText}>📅 {t('btn_add_calendar')}</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={[rowStyle, { justifyContent: 'space-between', marginBottom: Spacing.sm }]}>
            <Text style={[styles.sectionTitle, rtlText, { marginBottom: 0 }]}>{t('rsvp_status')}</Text>
            {trip?.max_participants && (
              <Text style={{ color: Palette.sand, fontSize: 12 }}>
                {trip.trip_attendees?.filter((a: any) => a.status === 'attending').length || 0} / {trip.max_participants}
              </Text>
            )}
          </View>
          
          <View style={[styles.rsvpRow, rowStyle]}>
            {(() => {
              const attendeesCount = trip.trip_attendees?.filter((a: any) => a.status === 'attending').length || 0;
              const isFull = trip.max_participants && attendeesCount >= trip.max_participants;
              const myRsvp = trip.trip_attendees?.find((a: any) => a.user_id === userId)?.status;

              return (
                <>
                  <TouchableOpacity 
                    style={[styles.rsvpBtn, myRsvp === 'attending' && styles.rsvpBtnActive, isFull && myRsvp !== 'attending' && { opacity: 0.5 }]}
                    disabled={isFull && myRsvp !== 'attending'}
                    onPress={() => !isFull || myRsvp === 'attending' ? handleRsvp('attending') : null}
                  >
                    <Text style={myRsvp === 'attending' ? styles.rsvpBtnText : styles.rsvpBtnTextInactive}>
                      {isFull && myRsvp !== 'attending' ? 'FULL' : `✅ ${t('rsvp_attending')}`}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.rsvpBtn, myRsvp === 'maybe' && styles.rsvpBtnActive]}
                    onPress={() => handleRsvp('maybe')}
                  >
                    <Text style={myRsvp === 'maybe' ? styles.rsvpBtnText : styles.rsvpBtnTextInactive}>❓ {t('rsvp_maybe')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.rsvpBtn, myRsvp === 'not_attending' && styles.rsvpBtnActive]}
                    onPress={() => handleRsvp('not_attending')}
                  >
                    <Text style={myRsvp === 'not_attending' ? styles.rsvpBtnText : styles.rsvpBtnTextInactive}>❌ {t('rsvp_not_attending')}</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, rtlText]}>☀️ {isRTL ? 'מזג אוויר חזוי' : 'Forecast'}</Text>
          {weather ? (
             <View style={[rowStyle, { alignItems: 'center', gap: 10 }]}>
               <Text style={{ fontSize: 32 }}>{weather.icon}</Text>
               <View>
                 <Text style={{ color: Palette.cream, fontSize: 24, fontWeight: '800' }}>{weather.temp}°C</Text>
                 <Text style={{ color: Palette.sand, fontSize: 14 }}>{weather.desc}</Text>
               </View>
             </View>
          ) : (
            <Text style={[styles.bodyText, rtlText]}>{t('weather_loading')}</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scrollContent: { padding: Spacing.md, paddingBottom: 50 },
  tabContent: { gap: Spacing.lg },
  card: { backgroundColor: Palette.charcoalMid, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.charcoalLight, padding: Spacing.lg },
  cardTitle: { fontSize: Typography.xl, fontWeight: '800', color: Palette.cream, marginBottom: Spacing.xs },
  cardSub: { fontSize: Typography.sm, color: Palette.sand },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Palette.gold, marginBottom: Spacing.sm },
  bodyText: { fontSize: Typography.sm, color: Palette.sand },
  actionBtn: { backgroundColor: Palette.charcoalLight, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1, borderColor: '#3A3A32' },
  actionBtnText: { color: Palette.cream, fontSize: Typography.base, fontWeight: '600' },
  actionBtnSecondary: { backgroundColor: Palette.charcoalLight, paddingVertical: Spacing.md, paddingHorizontal: 4, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.gold + '44' },
  actionBtnTextSecondary: { color: Palette.gold, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  rsvpRow: { gap: Spacing.xs, flexDirection: 'row' },
  rsvpBtn: { flex: 1, backgroundColor: Palette.charcoalLight, paddingVertical: 10, paddingHorizontal: 4, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  rsvpBtnActive: { backgroundColor: Palette.olive, borderColor: Palette.oliveLight, borderWidth: 1 },
  rsvpBtnText: { color: Palette.cream, fontWeight: '800', fontSize: 11 },
  rsvpBtnTextInactive: { color: Palette.sand, fontWeight: '600', fontSize: 11 },
  archiveBanner: { backgroundColor: 'rgba(255, 149, 0, 0.1)', padding: 12, borderRadius: Radius.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(255, 149, 0, 0.2)', alignItems: 'center' },
  archiveBannerText: { color: '#ff9500', fontSize: 12, fontWeight: '700' },
});
