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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme';
import { useThemeStore, ThemeMode } from '../../src/store/themeStore';
import { APP_NAME, APP_VERSION } from '../../src/constants';
import {
  getGroqApiKey,
  setGroqApiKey,
  deleteGroqApiKey,
  testGroqApiKey,
} from '../../src/services/aiKey';
import {
  chooseBackupFolder,
  executeBackup,
  executePreResetBackup,
  pickAndRestoreBackup,
} from '../../src/services/backup';
import { getSetting } from '../../src/services/settings';
import { resetDatabase } from '../../src/db/reset';
import { useDataStore } from '../../src/store/dataStore';
import { CategoryManagerModal } from '../../src/components/CategoryManagerModal';

export default function SettingsScreen() {
  const { colors, typography, spacing, radius, themeMode, setThemeMode } = useTheme();
  const bumpDataVersion = useDataStore((s) => s.bumpDataVersion);

  const [isSeeding, setIsSeeding] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Backup state
  const [backupFolder, setBackupFolder] = useState<string | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Modals state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [showKeyText, setShowKeyText] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  // Reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const loadSettingsData = async () => {
    try {
      const k = await getGroqApiKey();
      setApiKey(k);
      if (k) setInputKey(k);

      const folder = await getSetting('backup_folder_uri');
      setBackupFolder(folder);

      const lastTs = await getSetting('last_backup_at');
      if (lastTs) {
        const parsed = parseInt(lastTs, 10);
        if (!isNaN(parsed)) setLastBackupAt(parsed);
      }
    } catch (err) {
      console.warn('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  // Format backup folder display name
  const displayFolder = backupFolder
    ? decodeURIComponent(backupFolder.split('/').pop() || backupFolder.split('%2F').pop() || backupFolder)
    : 'Not configured';

  // Format last backup time display
  const formatLastBackup = () => {
    if (!lastBackupAt) return 'Never';
    const date = new Date(lastBackupAt);
    const diffMin = Math.floor((Date.now() - lastBackupAt) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ---------------- Theme Handlers ----------------
  const handleSelectTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  // ---------------- Groq API Key Handlers ----------------
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

    setIsSavingKey(true);
    try {
      await setGroqApiKey(cleanKey);
      setApiKey(cleanKey);
      setShowKeyModal(false);
      Alert.alert('Saved', 'Groq API key securely saved on device.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save key.');
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleRemoveKey = async () => {
    Alert.alert('Remove API Key', 'Are you sure you want to remove your Groq API key?', [
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

  // ---------------- Backup Handlers ----------------
  const handleChooseFolder = async () => {
    try {
      const res = await chooseBackupFolder();
      if (res.granted && res.directoryUri) {
        setBackupFolder(res.directoryUri);
        Alert.alert('Folder Selected', 'Backup directory configured successfully.');
      } else if (res.cancelled) {
        // User cancelled picker
      } else if (res.error) {
        Alert.alert('Folder Selection Notice', res.error);
      }
    } catch (err: any) {
      Alert.alert('Folder Selection Notice', err?.message || 'Could not select folder.');
    }
  };

  const handleBackUpNow = async () => {
    if (!backupFolder) {
      Alert.alert(
        'No Folder Selected',
        'Please select a backup folder first so Varavuselavu knows where to save your backup.'
      );
      return;
    }

    setIsBackingUp(true);
    const res = await executeBackup({ isAuto: false });
    setIsBackingUp(false);

    if (res.ok) {
      const now = Date.now();
      setLastBackupAt(now);
      Alert.alert('Backup Complete', 'Your transactions and chats have been safely backed up.');
    } else if (res.skipped && res.reason === 'no_transactions') {
      Alert.alert('Backup Skipped', 'You have no transactions to back up yet.');
    } else {
      Alert.alert('Backup Failed', res.error || 'Failed to create backup file.');
    }
  };

  const handleRestoreFromFile = async () => {
    Alert.alert(
      'Restore from File',
      'This will replace your current data with the contents of the backup file. Any pending changes will be overwritten. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose File',
          onPress: async () => {
            setIsRestoring(true);
            const res = await pickAndRestoreBackup();
            setIsRestoring(false);

            if (res.ok) {
              await loadSettingsData();
              Alert.alert('Restore Complete', 'All data has been restored from your backup.');
            } else if (res.cancelled) {
              // User cancelled file picker
            } else {
              Alert.alert('Restore Failed', res.error || 'Failed to restore from file.');
            }
          },
        },
      ]
    );
  };

  // ---------------- Reset Data Handlers ----------------
  const handleOpenReset = () => {
    Alert.alert(
      'Reset All Data',
      'Would you like to save a safety backup before resetting?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Without Backup',
          style: 'destructive',
          onPress: () => {
            setResetInput('');
            setShowResetModal(true);
          },
        },
        {
          text: 'Back Up First',
          onPress: async () => {
            const pre = await executePreResetBackup();
            if (pre.ok) {
              Alert.alert(
                'Pre-reset Backup Saved',
                `A safety copy "${pre.fileName}" was saved in your backup folder.`,
                [
                  {
                    text: 'Proceed to Reset',
                    onPress: () => {
                      setResetInput('');
                      setShowResetModal(true);
                    },
                  },
                ]
              );
            } else {
              Alert.alert('Backup Notice', pre.error || 'Failed to create safety backup.', [
                {
                  text: 'Proceed anyway',
                  style: 'destructive',
                  onPress: () => {
                    setResetInput('');
                    setShowResetModal(true);
                  },
                },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }
          },
        },
      ]
    );
  };

  const handleConfirmReset = async () => {
    if (resetInput.trim() !== 'RESET') return;

    setIsResetting(true);
    try {
      await resetDatabase();
      setShowResetModal(false);
      setResetInput('');
      bumpDataVersion({ skipAutoBackup: true });
      await loadSettingsData();
      Alert.alert(
        'Reset Successful',
        'All transactions and chats have been erased. Default categories have been restored. Your theme and Groq key were kept.'
      );
    } catch (err: any) {
      Alert.alert('Reset Failed', err?.message || 'Failed to reset database.');
    } finally {
      setIsResetting(false);
    }
  };

  // ---------------- Developer Testing Options ----------------
  const handleDevLongPress = () => {
    if (!__DEV__) return;

    Alert.alert('Developer Testing Options', 'Choose a testing action for dummy data:', [
      {
        text: 'Seed 2,000 Transactions',
        onPress: async () => {
          setIsSeeding(true);
          try {
            const { generateDummyTransactions } = await import('../../src/db/dummyData');
            await generateDummyTransactions(2000);
            bumpDataVersion();
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
            bumpDataVersion();
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
            bumpDataVersion({ skipAutoBackup: true });
            Alert.alert('Cleared', 'All transactions have been deleted.');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to clear transactions.');
          } finally {
            setIsSeeding(false);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 6)}••••••••${apiKey.slice(-4)}`
    : 'Not configured';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingHorizontal: spacing.screenPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.title, { color: colors.text, marginTop: spacing.md }]}>
          Settings
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
          Theme, categories, AI key, backup and reset
        </Text>

        <View style={styles.cardList}>
          {/* ---------------- 1. Appearance / Theme Switch ---------------- */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                  Appearance
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Choose Light, Dark, or System mode
                </Text>
              </View>
            </View>

            <View style={[styles.themeRow, { backgroundColor: colors.cardAlt }]}>
              {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => {
                const isSelected = themeMode === mode;
                const iconName =
                  mode === 'system'
                    ? 'phone-portrait-outline'
                    : mode === 'light'
                    ? 'sunny-outline'
                    : 'moon-outline';

                return (
                  <Pressable
                    key={mode}
                    onPress={() => handleSelectTheme(mode)}
                    style={[
                      styles.themeChip,
                      isSelected && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Ionicons
                      name={iconName as any}
                      size={15}
                      color={isSelected ? '#FFFFFF' : colors.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: isSelected ? '#FFFFFF' : colors.textMuted,
                          fontWeight: isSelected ? '700' : '500',
                          textTransform: 'capitalize',
                        },
                      ]}
                    >
                      {mode}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ---------------- 2. Categories Management ---------------- */}
          <Pressable
            onPress={() => setShowCategoryModal(true)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.income}18` }]}>
                <Ionicons name="pricetags-outline" size={20} color={colors.income} />
              </View>
              <View style={styles.cardText}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                  Categories
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Rename, recolor, add or hide categories
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Pressable>

          {/* ---------------- 3. Groq AI Key ---------------- */}
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
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.accent}18` }]}>
                <Ionicons name="key-outline" size={20} color={colors.accent} />
              </View>
              <View style={styles.cardText}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                  Panda AI (Groq Key)
                </Text>
                <Text
                  style={[
                    typography.caption,
                    { color: apiKey ? colors.income : colors.textMuted, fontWeight: '500' },
                  ]}
                >
                  {apiKey ? `Connected (${maskedKey})` : 'Tap to configure free API key'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Pressable>

          {/* ---------------- 4. Backup & Restore ---------------- */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                  Backup & Restore
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Folder: {displayFolder}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11, marginTop: 2 }]}>
                  Last backup: {formatLastBackup()}
                </Text>
              </View>
            </View>

            {/* Backup Actions */}
            <View style={styles.backupActions}>
              <Pressable
                onPress={handleChooseFolder}
                style={[styles.outlineBtn, { borderColor: colors.border }]}
              >
                <Ionicons name="folder-outline" size={15} color={colors.text} style={{ marginRight: 6 }} />
                <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>
                  {backupFolder ? 'Change Folder' : 'Choose Folder'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleBackUpNow}
                disabled={isBackingUp}
                style={[
                  styles.primaryActionBtn,
                  { backgroundColor: colors.primary, opacity: isBackingUp ? 0.6 : 1 },
                ]}
              >
                {isBackingUp ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
                      Back up now
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            <Pressable
              onPress={handleRestoreFromFile}
              disabled={isRestoring}
              style={[styles.restoreBtn, { borderTopColor: colors.border }]}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                    Restore from file
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* ---------------- 5. Danger Zone / Reset ---------------- */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: `${colors.expense}40` }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.expense}18` }]}>
                <Ionicons name="warning-outline" size={20} color={colors.expense} />
              </View>
              <View style={styles.cardText}>
                <Text style={[typography.body, { color: colors.expense, fontWeight: '700' }]}>
                  Danger Zone
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Erase transactions and chats. Keeps Groq key and theme.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleOpenReset}
              style={[styles.resetBtn, { backgroundColor: `${colors.expense}15`, borderColor: colors.expense }]}
            >
              <Ionicons name="trash-bin-outline" size={16} color={colors.expense} style={{ marginRight: 6 }} />
              <Text style={[typography.caption, { color: colors.expense, fontWeight: '700' }]}>
                Reset all data
              </Text>
            </Pressable>
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
      </ScrollView>

      {/* Category Manager Modal */}
      <CategoryManagerModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />

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
              <Text style={[typography.caption, { color: colors.textMuted, marginVertical: 6 }]}>
                Varavuselavu uses Groq Cloud API for free, ultra-fast AI chats with tool calling.
              </Text>

              {/* Privacy Disclosure (Doc requirement 129) */}
              <View style={[styles.privacyBox, { backgroundColor: colors.cardAlt, borderRadius: radius.button }]}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text style={[typography.caption, { color: colors.text, flex: 1, fontSize: 11 }]}>
                  Privacy Notice: When you ask a question, the matching spending data is sent to Groq to answer it.
                </Text>
              </View>

              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 12, marginBottom: 6 }]}>
                API KEY
              </Text>

              <View
                style={[
                  styles.keyInputWrap,
                  { backgroundColor: colors.cardAlt, borderColor: colors.border, borderRadius: radius.button },
                ]}
              >
                <TextInput
                  value={inputKey}
                  onChangeText={setInputKey}
                  placeholder="gsk_..."
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showKeyText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.keyInput, typography.body, { color: colors.text }]}
                />
                <Pressable onPress={() => setShowKeyText(!showKeyText)} hitSlop={8} style={styles.eyeBtn}>
                  <Ionicons
                    name={showKeyText ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>

              {/* Link to get free key */}
              <Pressable
                onPress={() => Linking.openURL('https://console.groq.com/keys')}
                style={styles.linkWrap}
              >
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                  Get a free key at console.groq.com
                </Text>
                <Ionicons name="open-outline" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
              </Pressable>

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
                  disabled={isSavingKey || !inputKey.trim()}
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: radius.button,
                      opacity: isSavingKey ? 0.6 : 1,
                    },
                  ]}
                >
                  {isSavingKey ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
                      Save Key
                    </Text>
                  )}
                </Pressable>
              </View>

              {apiKey && (
                <Pressable onPress={handleRemoveKey} style={styles.removeBtn}>
                  <Text style={[typography.caption, { color: colors.expense, fontWeight: '600' }]}>
                    Remove Key
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ---------------- Type RESET Confirmation Modal ---------------- */}
      <Modal visible={showResetModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderRadius: radius.card }]}>
            <View style={[styles.resetIconWrap, { backgroundColor: `${colors.expense}18` }]}>
              <Ionicons name="alert-circle" size={32} color={colors.expense} />
            </View>

            <Text style={[typography.title, { color: colors.expense, textAlign: 'center', marginTop: 12 }]}>
              Confirm Complete Reset
            </Text>

            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 18 },
              ]}
            >
              This will permanently delete all transactions, chats, and custom categories. Default categories will be restored. Your theme and Groq key will be kept.
            </Text>

            <Text
              style={[
                typography.caption,
                { color: colors.text, fontWeight: '700', textAlign: 'center', marginTop: 16, marginBottom: 8 },
              ]}
            >
              Type RESET to confirm:
            </Text>

            <TextInput
              value={resetInput}
              onChangeText={setResetInput}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="RESET"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.resetTextInput,
                typography.body,
                {
                  backgroundColor: colors.cardAlt,
                  borderColor: resetInput === 'RESET' ? colors.expense : colors.border,
                  color: colors.text,
                  borderRadius: radius.button,
                },
              ]}
            />

            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => setShowResetModal(false)}
                style={[styles.testBtn, { borderColor: colors.border, borderRadius: radius.button }]}
              >
                <Text style={[typography.caption, { color: colors.text }]}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmReset}
                disabled={resetInput.trim() !== 'RESET' || isResetting}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: colors.expense,
                    borderRadius: radius.button,
                    opacity: resetInput.trim() === 'RESET' && !isResetting ? 1 : 0.4,
                  },
                ]}
              >
                {isResetting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
                    Erase Data
                  </Text>
                )}
              </Pressable>
            </View>
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 110,
  },
  cardList: {
    marginTop: 20,
    gap: 14,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardHeaderRow: {
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
  themeRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginTop: 14,
    gap: 4,
  },
  themeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  backupActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginTop: 16,
  },
  footer: {
    marginTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    maxHeight: '88%',
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
  keyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  keyInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
  },
  eyeBtn: {
    padding: 6,
  },
  linkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
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
  resetIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetTextInput: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
