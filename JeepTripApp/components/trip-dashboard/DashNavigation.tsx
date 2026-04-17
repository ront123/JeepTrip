import React, { memo, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

interface DashNavigationProps {
  trip: any;
  isRTL: boolean;
  t: (key: any) => string;
  activeTab: string;
  handleOpenMap: (type: 'waze' | 'google' | 'apple', target?: 'start' | 'dest') => void;
}

const mapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }
];

export const DashNavigation = memo(({
  trip,
  isRTL,
  t,
  activeTab,
  handleOpenMap,
}: DashNavigationProps) => {
  const rowStyle = isRTL ? { flexDirection: 'row-reverse' as const } : { flexDirection: 'row' as const };

  const mapContent = useMemo(() => {
    if (!trip?.lat || !trip?.lng) return null;
    return (
      <View style={[styles.card, { height: 260, padding: 0, overflow: 'hidden' }]}>
        <MapView
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={{
            latitude: trip.start_lat || trip.lat,
            longitude: trip.start_lng || trip.lng,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
          customMapStyle={mapStyle}
        >
          <Marker coordinate={{ latitude: trip.lat, longitude: trip.lng }} title="Destination" pinColor="red" />
          {trip.start_lat && (
            <Marker coordinate={{ latitude: trip.start_lat, longitude: trip.start_lng }} title="Start of Route" pinColor="green" />
          )}
        </MapView>
      </View>
    );
  }, [trip?.lat, trip?.lng, trip?.start_lat, trip?.start_lng]);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.tabContent}>
        {activeTab === 'navigation' && (trip?.lat && trip?.lng) ? mapContent : (
          <View style={[styles.card, { height: 160, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 40, opacity: 0.5 }}>🧭</Text>
            <Text style={{ color: Palette.sand, marginTop: 10 }}>
               {!(trip?.lat && trip?.lng) ? 'Map not configured' : 'Loading Map...'}
            </Text>
          </View>
        )}

        <View style={[rowStyle, { gap: 10 }]}>
           <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1 }]} onPress={() => handleOpenMap('waze', 'start')}>
             <Text style={styles.actionBtnTextSecondary}>🏁 {isRTL ? 'נווט להתחלת המסלול' : 'Start Point'}</Text>
           </TouchableOpacity>
           <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1 }]} onPress={() => handleOpenMap('waze', 'dest')}>
             <Text style={styles.actionBtnTextSecondary}>🚩 {isRTL ? 'נווט ליעד' : 'Destination'}</Text>
           </TouchableOpacity>
        </View>

        {trip?.off_road_url && (
          <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => Linking.openURL(trip.off_road_url)}>
            <LinearGradient colors={['#FF5722', '#F44336']} style={styles.ctaGradient}>
              <Text style={styles.actionBtnTextPrimary}>🚙 {isRTL ? 'פתח ב-OffRoad' : 'Open in OffRoad'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scrollContent: { padding: Spacing.md, paddingBottom: 50 },
  tabContent: { gap: Spacing.lg },
  card: { backgroundColor: Palette.charcoalMid, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.charcoalLight, padding: Spacing.lg },
  actionBtnSecondary: { backgroundColor: Palette.charcoalLight, paddingVertical: Spacing.md, paddingHorizontal: 4, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.gold + '44' },
  actionBtnTextSecondary: { color: Palette.gold, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  actionBtnPrimary: { borderRadius: Radius.md, overflow: 'hidden' },
  ctaGradient: { paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  actionBtnTextPrimary: { color: Palette.cream, fontWeight: '800', fontSize: Typography.base, letterSpacing: 1 },
});
