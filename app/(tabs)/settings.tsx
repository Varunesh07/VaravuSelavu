import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { APP_NAME, APP_VERSION } from '../../src/constants';
import {
  getGroqApiKey,
  setGroqApiKey,
  deleteGroqApiKey,
  testGroqApiKey,
} from '../../src/services/aiKey';

export default function SettingsScreen() {
  const { colors, typography, spacing, radius } = useTheme();

  const [isSeeding, setIsSeeding] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Modal State for Groq Key
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing key
  useEffect(() => {
    getGroqApiKey().then((k) => {
      setApiKey(k);
      if (k) setInputKey(k);
    });
  }, []);

  const handleOpenKeyModal = async () => {
    const k = await getGroqApiKey();
    setApiKey(k);
    setInputKey(k || '');
    setShowKeyModal(true);
  };

  const handleTestKey = async () => {
    if (!inputKey.trim()) {
      Alert.alert('Empty Key', 'Please enter a Groq API key to test.');
      return;
    }
    setIsTesting(true);
    const result = await testGroqApiKey(inputKey.trim());
    setIsTesting(false);

    if (result.valid) {
      Alert.alert('Success', 'Your Groq API key is valid and working!');
    } else {
      Alert.alert('Test Failed', result.error || 'Failed to validate key.');
    }
  };

  const handleSaveKey = async () => {
    const cleanKey = inputKey.trim();
    if (!cleanKey) {
      Alert.alert('Empty Key', 'Please enter an API key or tap Remove.');
      return;
    }

    setIsSaving(true);
    try {
      await setGroqApiKey(cleanKey);
      setApiKey(cleanKey);
      setShowKeyModal(false);
      Alert.alert('Saved', 'Groq API key securely saved on device.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save key.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    Alert.alert('Remove API Key', 'Are you sure you want to delete your Groq API key?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteGroqApiKey();
          setApiKey(null);
          setInputKey('');
          setShowKeyModal(false);
        },
      },
    ]);
  };

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

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 6)}••••••••${apiKey.slice(-4)}`
    : 'Not configured';

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
          {/* Theme Option */}
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

          {/* Categories Option */}
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

          {/* Groq AI Key Option */}
          <Pressable
            onPress={handleOpenKeyModal}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.accent}18` }]}>
                <Ionicons name="key-outline" size={20} color={colors.accent} />
              </View>
              <View style={styles.cardText}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                  Groq API Key
                </Text>
                <Text
                  style={[
                    typography.caption,
                    { color: apiKey ? colors.income : colors.textMuted, fontWeight: '500' },
                  ]}
                >
                  {apiKey ? `Connected (${maskedKey})` : 'Tap to configure for Panda AI'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Pressable>
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

      {/* Groq API Key Modal */}
      <Modal visible={showKeyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderRadius: radius.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[typography.title, { color: colors.text }]}>Groq API Key</Text>
              <Pressable onPress={() => setShowKeyModal(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[typography.caption, { color: colors.textMuted, marginVertical: 8 }]}>
                Varavuselavu uses Groq Cloud API for free, ultra-fast AI chats with tool use.
              </Text>

              {/* Privacy Disclosure (Doc requirement 129) */}
              <View style={[styles.privacyBox, { backgroundColor: colors.cardAlt, borderRadius: radius.button }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[typography.caption, { color: colors.text, flex: 1, fontSize: 11 }]}>
                  Privacy Notice: When you ask a question, only the matching spending data requested by Panda is sent to Groq to answer it.
                </Text>
              </View>

              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 14, marginBottom: 6 }]}>
                API KEY
              </Text>

              <TextInput
                value={inputKey}
                onChangeText={setInputKey}
                placeholder="gsk_..."
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.keyInput,
                  typography.body,
                  {
                    backgroundColor: colors.cardAlt,
                    borderColor: colors.border,
                    color: colors.text,
                    borderRadius: radius.button,
                  },
                ]}
              />

              {/* Action Buttons */}
              <View style={styles.modalBtnRow}>
                <Pressable
                  onPress={handleTestKey}
                  disabled={isTesting || !inputKey.trim()}
                  style={[
                    styles.testBtn,
                    {
                      borderColor: colors.border,
                      borderRadius: radius.button,
                      opacity: isTesting ? 0.6 : 1,
                    },
                  ]}
                >
                  {isTesting ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                      Test Key
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={handleSaveKey}
                  disabled={isSaving || !inputKey.trim()}
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: radius.button,
                      opacity: isSaving ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
                    Save Key
                  </Text>
                </Pressable>
              </View>

              {apiKey && (
                <Pressable
                  onPress={handleRemoveKey}
                  style={styles.removeBtn}
                >
                  <Text style={[typography.caption, { color: colors.expense, fontWeight: '600' }]}>
                    Remove Key
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 8,
  },
  keyInput: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  testBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
  },
  saveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  removeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
});
