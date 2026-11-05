import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { ChartSnapshot } from '../services/toolExecutor';
import { formatDisplayDate } from '../utils/dates';
import { SharedChartView } from './SharedChartView';

interface ChatChartViewProps {
  snapshotJson: string;
}

export function ChatChartView({ snapshotJson }: ChatChartViewProps) {
  const { colors, typography, radius } = useTheme();

  let snapshot: ChartSnapshot | null = null;
  try {
    snapshot = JSON.parse(snapshotJson);
  } catch {
    return null;
  }

  if (!snapshot || !snapshot.data || snapshot.data.length === 0) {
    return null;
  }

  const formattedAsOf = formatDisplayDate(snapshot.created_date || snapshot.to, {
    showTodayText: true,
  });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.card,
          width: '100%',
          overflow: 'hidden',
        },
      ]}
    >
      {/* Header with Title & "as of {date}" Badge */}
      <View style={styles.header}>
        <Text
          style={[
            typography.body,
            { color: colors.text, fontWeight: '700', flex: 1, marginRight: 8 },
          ]}
          numberOfLines={1}
        >
          {snapshot.title}
        </Text>
        <View style={[styles.badge, { backgroundColor: colors.cardAlt }]}>
          <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10 }]}>
            as of {formattedAsOf}
          </Text>
        </View>
      </View>

      {/* Chart Content Area via SharedChartView */}
      <View style={styles.chartArea}>
        <SharedChartView
          type={snapshot.type}
          pieData={snapshot.type === 'pie' ? snapshot.data : undefined}
          barData={
            snapshot.type === 'bar'
              ? snapshot.data.map((d) => ({
                  label: d.label,
                  value: d.value,
                  frontColor: d.color,
                  color: d.color,
                }))
              : undefined
          }
          lineData={snapshot.type === 'line' ? snapshot.data : undefined}
          compact={true}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chartArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
