import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { Palette, Typography, Spacing, Radius } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';

export default function HelpScreen() {
  const { isRTL, t } = useLanguage();

  const handleContact = () => {
    Linking.openURL('mailto:support@jeeptrip.app?subject=Mission Report');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Hero Header */}
      <View style={styles.hero}>
        <LinearGradient
          colors={['#2A2A22', Palette.charcoal]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{isRTL ? 'מרכז סיוע' : 'SUPPORT'}</Text>
        </View>
        <Text style={styles.heroTitle}>{t('help_hero_title')}</Text>
        <Text style={styles.heroSubtitle}>{t('help_hero_subtitle')}</Text>
      </View>

      <View style={styles.goldLine} />

      {/* Main Guides */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('help_getting_started_title')}</Text>
        <GuideCard
          icon="shield.fill"
          title={isRTL ? 'אישור ציר' : 'Clearance'}
          description={t('help_getting_started_desc')}
          color={Palette.gold}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('help_missions_title')}</Text>
        <GuideCard
          icon="map.fill"
          title={isRTL ? 'תכנון ציר' : 'Trail Planning'}
          description={t('help_missions_desc')}
          color="#5C85BB"
        />
        <GuideCard
          icon="lock.fill"
          title={t('help_missions_private')}
          description={t('help_missions_private_desc')}
          color="#E67E22"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('help_field_tools_title')}</Text>
        <GuideCard
          icon="message.fill"
          title={isRTL ? 'קשר רדיו (צאט)' : 'Comms & Chat'}
          description={t('help_field_tools_desc')}
          color={Palette.oliveLight}
        />
      </View>

      {/* FAQs */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('help_faq_title')}</Text>
        <View style={styles.faqList}>
          <FAQItem question={t('help_faq_q1')} answer={t('help_faq_a1')} />
          <FAQItem question={t('help_faq_q2')} answer={t('help_faq_a2')} />
          <FAQItem question={t('help_faq_q3')} answer={t('help_faq_a3')} />
        </View>
      </View>

      {/* Contact Support */}
      <View style={styles.contactCard}>
        <Text style={styles.contactTitle}>{t('help_contact_support')}</Text>
        <TouchableOpacity style={styles.contactBtn} onPress={handleContact}>
          <Text style={styles.contactBtnText}>{t('help_contact_btn')}</Text>
          <IconSymbol name="envelope.fill" size={16} color={Palette.charcoal} />
        </TouchableOpacity>
      </View>

      <Text style={styles.versionText}>JeepTrip Mobile v2.1.0 • Build 154</Text>
    </ScrollView>
  );
}

function GuideCard({ icon, title, description, color }: { icon: any, title: string, description: string, color: string }) {
  return (
    <View style={styles.guideCard}>
      <View style={[styles.guideIcon, { backgroundColor: color + '22' }]}>
        <IconSymbol name={icon} size={22} color={color} />
      </View>
      <View style={styles.guideText}>
        <Text style={styles.guideTitle}>{title}</Text>
        <Text style={styles.guideDesc}>{description}</Text>
      </View>
    </View>
  );
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
  return (
    <View style={styles.faqItem}>
      <Text style={styles.faqQuestion}>{question}</Text>
      <Text style={styles.faqAnswer}>{answer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.charcoal },
  content: { paddingBottom: 60 },
  hero: {
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 40,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    backgroundColor: Palette.rust,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: 16,
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: Typography['2xl'],
    fontWeight: '900',
    color: Palette.gold,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: Typography.base,
    color: Palette.sand,
    textAlign: 'center',
    opacity: 0.8,
  },
  goldLine: { height: 2, backgroundColor: Palette.gold, opacity: 0.6 },
  
  section: { padding: Spacing.lg },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.mud,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  
  guideCard: {
    flexDirection: 'row',
    backgroundColor: Palette.charcoalMid,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.charcoalLight,
    gap: 16,
  },
  guideIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideText: { flex: 1 },
  guideTitle: {
    fontSize: Typography.md,
    fontWeight: '800',
    color: Palette.cream,
    marginBottom: 4,
  },
  guideDesc: {
    fontSize: 14,
    color: Palette.sand,
    lineHeight: 20,
    opacity: 0.9,
  },
  
  faqList: { gap: Spacing.sm },
  faqItem: {
    backgroundColor: Palette.charcoalMid,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderLeftColor: Palette.gold,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.gold,
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: 14,
    color: Palette.sand,
    lineHeight: 20,
  },
  
  contactCard: {
    margin: Spacing.lg,
    padding: Spacing.xl,
    backgroundColor: Palette.charcoalLight,
    borderRadius: Radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.gold + '44',
  },
  contactTitle: {
    fontSize: Typography.md,
    fontWeight: '700',
    color: Palette.cream,
    marginBottom: 16,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.gold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.full,
    gap: 10,
  },
  contactBtnText: {
    color: Palette.charcoal,
    fontWeight: '900',
    fontSize: 15,
  },
  versionText: {
    textAlign: 'center',
    color: Palette.mud,
    fontSize: 11,
    marginTop: 20,
  },
});
