import { View, Text, ScrollView, Image, StyleSheet, Dimensions } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { Palette } from '../../constants/theme';

const { width } = Dimensions.get('window');

// Using local assets
const DASHBOARD_IMG = require('../../assets/images/dashboard_screenshot.png');
const CREATE_IMG = require('../../assets/images/create_mission_screenshot.png');
const DETAILS_IMG = require('../../assets/images/trip_details_screenshot.png');

export default function HelpScreen() {
  const { isRTL, t } = useLanguage();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.heroTitle}>{isRTL ? 'מרכז העזרה' : 'Help Center'}</Text>
        <Text style={styles.heroSubtitle}>
          {isRTL ? 'כל מה שצריך לדעת על JeepTrip' : 'Master the JeepTrip platform'}
        </Text>
      </View>

      {/* Section 1: Dashboard */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 {isRTL ? 'מסך הבית (HQ)' : 'Dashboard'}</Text>
        <Text style={styles.description}>
          {isRTL 
            ? 'סקירה מהירה על כל המשימות הפעילות והיסטוריית הביצועים שלך.'
            : 'Quick overview of all active missions and your performance stats.'}
        </Text>
        <Image source={DASHBOARD_IMG} style={styles.mockup} resizeMode="contain" />
        <View style={styles.proTip}>
          <Text style={styles.proTipText}>
            <Text style={{ color: Palette.gold, fontWeight: 'bold' }}>💡 TIP: </Text>
            {isRTL ? 'לחץ על כרטיס משימה לכניסה מהירה לצאט.' : 'Tap any mission card to enter the chat.'}
          </Text>
        </View>
      </View>

      {/* Section 2: Create */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>➕ {isRTL ? 'פתיחת משימה' : 'Create Mission'}</Text>
        <Text style={styles.description}>
          {isRTL
            ? 'תכנון טיול חדש, העלאת קובצי GPX וקביעת מיקום מפגש.'
            : 'Plan a new trip, upload GPX files, and set meeting points.'}
        </Text>
        <Image source={CREATE_IMG} style={styles.mockup} resizeMode="contain" />
      </View>

      {/* Section 3: Chat & Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🗺️ {isRTL ? 'צאט ומפה' : 'Chat & Maps'}</Text>
        <Text style={styles.description}>
          {isRTL
            ? 'ניהול הקשר עם הצוות בשטח וניווט משותף.'
            : 'Stay in touch with the crew and navigate together.'}
        </Text>
        <Image source={DETAILS_IMG} style={styles.mockup} resizeMode="contain" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderBottomWidth: 2,
    borderBottomColor: Palette.gold,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.gold,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#888',
  },
  section: {
    marginBottom: 40,
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.1)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.gold,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#bbb',
    lineHeight: 22,
    marginBottom: 20,
  },
  mockup: {
    width: width - 80,
    height: (width - 80) * 0.8,
    borderRadius: 8,
    alignSelf: 'center',
  },
  proTip: {
    marginTop: 20,
    padding: 12,
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.gold,
    borderStyle: 'dashed',
  },
  proTipText: {
    color: '#fff',
    fontSize: 14,
  },
});
