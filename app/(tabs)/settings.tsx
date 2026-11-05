import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { APP_NAME, APP_VERSION } from '../../src/constants';

export default function SettingsScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const [isSeeding, setIsSeeding] = useState(false);

  const handleDevLongPress = () => {
    if (!__DEV__) return;

    Alert.alert(
      'Developer Testing Options',
      'Choose a testing action for dummy transaction data:',
      [
        {
          text: 'Seed 2,000 Transactions',
          onPress: async () => {
            setIsSeeding(true);
            try {
              const { generateDummyTransactions } = await import('../../src/db/dummyData');
              await generateDummyTransactions(2000);
              Alert.alert('Success', 'Seeded 2,000 dummy transactions.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to seed dummy data.');
            } finally {
              setIsSeeding(false);
            }
          },
        },
        {
          text: 'Seed 10,000 Transactions',
          onPress: async () => {
            setIsSeeding(true);
            try {
              const { generateDummyTransactions } = await import('../../src/db/dummyData');
              await generateDummyTransactions(10000);
              Alert.alert('Success', 'Seeded 10,000 dummy transactions.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to seed dummy data.');
            } finally {
              setIsSeeding(false);
            }
          },
        },
        {
          text: 'Clear All Transactions',
          style: 'destructive',
          onPress: async () => {
            setIsSeeding(true);
            try {
              const { clearAllTransactions } = await import('../../src/db/dummyData');
              await clearAllTransactions();
              Alert.alert('Cleared', 'All transactions have been deleted.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to clear transactions.');
            } finally {
              setIsSeeding(false);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.content, { paddingHorizontal: spacing.screenPadding }]}>
        <Text style={[typography.title, { color: colors.text, marginTop: spacing.md }]}>
          Settings
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
          Theme, categories, AI key, backup and reset
        </Text>

        <View style={styles.cardList}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                  Theme
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  System default (Light / Dark)
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.income}18` }]}>
                <Ionicons name="pricetags-outline" size={20} color={colors.income} />
              </View>
              <View style={styles.cardText}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                  Categories
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Manage income and expense categories
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.accent}18` }]}>
                <Ionicons name="key-outline" size={20} color={colors.accent} />
              </View>
              <View style={styles.cardText}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                  Groq API Key
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Securely stored on device for AI chat
                </Text>
              </View>
            </View>
          </View>
        </View>

        {isSeeding && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
              Processing test transactions...
            </Text>
          </View>
        )}

        {/* Footer / Version info with hidden developer long-press */}
        <View style={styles.footer}>
          <Pressable
            onLongPress={handleDevLongPress}
            delayLongPress={1000}
            hitSlop={16}
          >
            <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
              {APP_NAME} v{APP_VERSION}
              {__DEV__ ? ' (Dev Mode · Long press for test data)' : ''}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  cardList: {
    marginTop: 20,
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardText: {
    flex: 1,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginTop: 16,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 90,
    alignItems: 'center',
  },
});
