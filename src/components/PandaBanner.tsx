import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface PandaBannerProps {
  netPaise: number;
  totalIncomePaise: number;
}

export function PandaBanner({ netPaise, totalIncomePaise }: PandaBannerProps) {
  const { colors, typography, radius } = useTheme();

  // Mood determination
  let message = 'Vanakkam! Track every rupee, save for what matters.';
  let moodIcon: keyof typeof Ionicons.glyphMap = 'happy-outline';
  let moodColor = colors.primary;

  if (totalIncomePaise === 0 && netPaise < 0) {
    message = 'Recorded expenses without income yet! Add pocket money or earnings.';
    moodIcon = 'help-circle-outline';
    moodColor = colors.accent;
  } else if (netPaise < 0) {
    message = 'Spending exceeded income! Time to go easy on canteen snacks.';
    moodIcon = 'alert-circle-outline';
    moodColor = colors.expense;
  } else if (netPaise > 0) {
    message = 'Great job staying in the green! Keep it up.';
    moodIcon = 'checkmark-circle-outline';
    moodColor = colors.income;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.card,
        },
      ]}
    >
      <View style={[styles.avatarCircle, { backgroundColor: `${moodColor}15` }]}>
        <Text style={styles.pandaEmoji}>🐼</Text>
      </View>
      <View style={styles.textWrap}>
        <View style={styles.titleRow}>
          <Text style={[typography.caption, { color: moodColor, fontWeight: '700' }]}>
            VARAVU PANDA
          </Text>
          <Ionicons name={moodIcon} size={14} color={moodColor} style={{ marginLeft: 4 }} />
        </View>
        <Text style={[typography.caption, { color: colors.text, marginTop: 2 }]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pandaEmoji: {
    fontSize: 24,
  },
  textWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
