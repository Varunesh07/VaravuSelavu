import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../theme';
import { ChartSnapshot } from '../services/toolExecutor';
import { formatDisplayDate } from '../utils/dates';

interface ChatChartViewProps {
  snapshotJson: string;
}

export function ChatChartView({ snapshotJson }: ChatChartViewProps) {
  const { colors, typography, radius } = useTheme();
  const { width } = useWindowDimensions();

  let snapshot: ChartSnapshot | null = null;
  try {
    snapshot = JSON.parse(snapshotJson);
  } catch {
    return null;
  }

  if (!snapshot || !snapshot.data || snapshot.data.length === 0) {
    return null;
  }

  const itemCount = snapshot.data.length;
  // Available width inside card (accounting for screen, bubble padding, card padding, and avatar)
  const cardInnerWidth = Math.max(220, Math.min(width * 0.82, 330) - 36);
  const plotAreaWidth = cardInnerWidth - 36;
  const barWidth = Math.max(12, Math.min(18, Math.floor((plotAreaWidth / (itemCount + 1)) * 0.55)));
  const spacing = Math.max(6, Math.min(14, Math.floor((plotAreaWidth - barWidth * itemCount) / (itemCount + 1))));

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
          style={[typography.body, { color: colors.text, fontWeight: '700', flex: 1, marginRight: 8 }]}
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

      {/* Chart Render based on Snapshot Type */}
      <View style={styles.chartArea}>
        {snapshot.type === 'pie' && (
          <View style={styles.pieRow}>
            <PieChart
              data={snapshot.data.map((d) => ({
                value: d.value,
                color: d.color || colors.primary,
                text: `${d.percent}%`,
              }))}
              donut
              radius={48}
              innerRadius={30}
              innerCircleColor={colors.card}
            />

            <View style={styles.legend}>
              {snapshot.data.map((d, i) => (
                <View key={i} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: d.color || colors.primary }]} />
                  <Text style={[typography.caption, { color: colors.text, flex: 1, fontSize: 11 }]} numberOfLines={1}>
                    {d.label}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700', fontSize: 11 }]}>
                    {d.percent}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {snapshot.type === 'bar' && (
          <BarChart
            data={snapshot.data.map((d) => ({
              value: d.value,
              label: d.label.length > 5 ? `${d.label.slice(0, 4)}.` : d.label,
              frontColor: d.color || colors.primary,
            }))}
            barWidth={barWidth}
            spacing={spacing}
            initialSpacing={8}
            roundedTop
            roundedBottom
            hideRules={false}
            rulesColor={colors.border}
            rulesType="dashed"
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 8 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
            yAxisColor="transparent"
            xAxisColor={colors.border}
            yAxisLabelWidth={30}
            width={plotAreaWidth}
            height={130}
            noOfSections={3}
          />
        )}

        {snapshot.type === 'line' && (
          <LineChart
            data={snapshot.data.map((d) => ({
              value: d.value,
              label: d.label.length > 5 ? `${d.label.slice(0, 4)}.` : d.label,
            }))}
            color={colors.primary}
            thickness={2.5}
            startFillColor={`${colors.primary}30`}
            endFillColor={`${colors.primary}00`}
            areaChart
            curved
            hideRules={false}
            rulesColor={colors.border}
            rulesType="dashed"
            initialSpacing={8}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 8 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
            yAxisColor="transparent"
            xAxisColor={colors.border}
            yAxisLabelWidth={30}
            width={plotAreaWidth}
            height={130}
            noOfSections={3}
            dataPointsColor={colors.primary}
            dataPointsRadius={3}
          />
        )}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  legend: {
    flex: 1,
    marginLeft: 14,
    gap: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
});

