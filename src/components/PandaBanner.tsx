import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Panda } from './panda/Panda';
import { getHomePandaMood } from '../utils/pandaMood';

interface PandaBannerProps {
  totalIncomePaise: number;
  totalExpensePaise: number;
}

export function PandaBanner({ totalIncomePaise, totalExpensePaise }: PandaBannerProps) {
  const { colors, typography, radius } = useTheme();

  const { reaction, message } = getHomePandaMood(totalIncomePaise, totalExpensePaise);

  let moodColor = colors.primary;
  let moodIcon: keyof typeof Ionicons.glyphMap = 'happy-outline';

  if (reaction === 'sleeping') {
    moodColor = colors.accent;
    moodIcon = 'moon-outline';
  } else if (reaction === 'crying') {
    moodColor = colors.expense;
    moodIcon = 'alert-circle-outline';
  } else if (reaction === 'pleading') {
    moodColor = '#F59E0B'; // Amber caution
    moodIcon = 'warning-outline';
  } else {
    moodColor = colors.income;
    moodIcon = 'sparkles-outline';
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
      <View style={styles.pandaWrapper}>
        <Panda reaction={reaction} size={64} animated={true} />
      </View>
      <View style={styles.textWrap}>
        <View style={styles.titleRow}>
          <Text style={[typography.caption, { color: moodColor, fontWeight: '700' }]}>
            VARAVU PANDA
          </Text>
          <Ionicons name={moodIcon} size={14} color={moodColor} style={{ marginLeft: 4 }} />
        </View>
        <Text style={[typography.caption, { color: colors.text, marginTop: 3 }]}>
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
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  pandaWrapper: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
