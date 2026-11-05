import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { getDatabase } from '../db';
import { getSetting, setSetting } from '../services/settings';
import { pickAndRestoreBackup } from '../services/backup';

export function FirstLaunchRestoreModal() {
  const { colors, typography, radius } = useTheme();
  const [visible, setVisible] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const prompted = await getSetting('first_launch_prompted');
      if (prompted === '1') return;

      const db = await getDatabase();
      const row = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM transactions;'
      );

      if ((row?.count || 0) === 0) {
        setVisible(true);
      } else {
        // Already has data, mark prompted
        await setSetting('first_launch_prompted', '1');
      }
    } catch {
      // Ignore
    }
  };

  const handleStartFresh = async () => {
    await setSetting('first_launch_prompted', '1');
    setVisible(false);
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    const res = await pickAndRestoreBackup();
    setIsRestoring(false);

    if (res.ok) {
      await setSetting('first_launch_prompted', '1');
      setVisible(false);
      Alert.alert('Restored', 'Your transactions and chats have been successfully restored!');
    } else if (res.error) {
      Alert.alert('Restore Failed', res.error);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.card }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="sparkles" size={28} color={colors.primary} />
          </View>

          <Text style={[typography.title, { color: colors.text, textAlign: 'center', marginTop: 12 }]}>
            Restore from a Backup?
          </Text>

          <Text
            style={[
              typography.caption,
              { color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 18 },
            ]}
          >
            If you previously used Varavuselavu, you can restore all your transactions and chats from your backup file.
          </Text>

          <View style={styles.btnColumn}>
            <Pressable
              onPress={handleRestore}
              disabled={isRestoring}
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, borderRadius: radius.button },
              ]}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '700' }]}>
                    Choose Backup File
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={handleStartFresh}
              disabled={isRestoring}
              style={[
                styles.secondaryBtn,
                { borderColor: colors.border, borderRadius: radius.button },
              ]}
            >
              <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                Start Fresh
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnColumn: {
    width: '100%',
    marginTop: 24,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
  },
});

