import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { getSetting, setSetting } from '../services/settings';
import { chooseBackupFolder } from '../services/backup';

export function BackupReminderCard() {
  const { colors, typography, radius } = useTheme();
  const [visible, setVisible] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);

  useEffect(() => {
    checkVisibility();
  }, []);

  const checkVisibility = async () => {
    try {
      const folder = await getSetting('backup_folder_uri');
      const dismissed = await getSetting('backup_reminder_dismissed');
      if (!folder && dismissed !== '1') {
        setVisible(true);
      } else {
        setVisible(false);
      }
    } catch {
      setVisible(false);
    }
  };

  const handleChoose = async () => {
    setIsChoosing(true);
    try {
      const res = await chooseBackupFolder();
      if (res.granted) {
        setVisible(false);
      } else if (res.error) {
        Alert.alert('Folder Selection Notice', res.error);
      }
    } catch (err: any) {
      Alert.alert('Folder Selection Notice', err?.message || 'Could not select folder.');
    } finally {
      setIsChoosing(false);
    }
  };

  const handleDismiss = async () => {
    setVisible(false);
    await setSetting('backup_reminder_dismissed', '1');
  };

  if (!visible) return null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: `${colors.primary}40`,
          borderRadius: radius.card,
        },
      ]}
    >
      <View style={styles.contentRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name="shield-outline" size={22} color={colors.primary} />
        </View>

        <View style={styles.textWrap}>
          <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
            Secure Your Data
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
            Choose a backup folder so your transactions are automatically protected.
          </Text>
        </View>

        <Pressable onPress={handleDismiss} hitSlop={8} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={handleChoose}
          disabled={isChoosing}
          style={[
            styles.chooseBtn,
            { backgroundColor: colors.primary, borderRadius: radius.button },
          ]}
        >
          <Ionicons name="folder-open-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
            Choose Backup Folder
          </Text>
        </Pressable>

        <Pressable onPress={handleDismiss} style={styles.laterBtn}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Dismiss
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 12,
  },
  chooseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  laterBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
});

