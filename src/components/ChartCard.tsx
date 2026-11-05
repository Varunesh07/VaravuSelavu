import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { ChartPeriod, PieChartSlice, BarChartItem, LineChartPoint } from '../db/stats';
import { SharedChartView } from './SharedChartView';

type ChartType = 'pie' | 'bar' | 'line';

interface ChartCardProps {
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
  pieData: PieChartSlice[];
  barData: BarChartItem[];
  lineData: LineChartPoint[];
}

export function ChartCard({
  period,
  onPeriodChange,
  pieData,
  barData,
  lineData,
}: ChartCardProps) {
  const { colors, typography, radius } = useTheme();
  const [chartType, setChartType] = useState<ChartType>('pie');

  const hasPieData = pieData.length > 0 && pieData.some((p) => p.value > 0);
  const hasBarData = barData.length > 0 && barData.some((b) => b.value > 0);
  const hasLineData = lineData.length > 0 && lineData.some((l) => l.value > 0);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.card,
        },
      ]}
    >
      {/* Header with Type Selector & Period Chips */}
      <View style={styles.header}>
        {/* Type Selector (Pie / Bar / Line) */}
        <View style={[styles.typeSwitcher, { backgroundColor: colors.cardAlt }]}>
          <Pressable
            onPress={() => setChartType('pie')}
            style={[
              styles.typeTab,
              chartType === 'pie' && { backgroundColor: colors.card },
            ]}
          >
            <Ionicons
              name="pie-chart"
              size={16}
              color={chartType === 'pie' ? colors.primary : colors.textMuted}
            />
          </Pressable>

          <Pressable
            onPress={() => setChartType('bar')}
            style={[
              styles.typeTab,
              chartType === 'bar' && { backgroundColor: colors.card },
            ]}
          >
            <Ionicons
              name="bar-chart"
              size={16}
              color={chartType === 'bar' ? colors.primary : colors.textMuted}
            />
          </Pressable>

          <Pressable
            onPress={() => setChartType('line')}
            style={[
              styles.typeTab,
              chartType === 'line' && { backgroundColor: colors.card },
            ]}
          >
            <Ionicons
              name="trending-up"
              size={16}
              color={chartType === 'line' ? colors.primary : colors.textMuted}
            />
          </Pressable>
        </View>

        {/* Period Chips (Week / Month / Year) */}
        <View style={styles.periodRow}>
          {(['week', 'month', 'year'] as ChartPeriod[]).map((p) => {
            const isSelected = period === p;
            return (
              <Pressable
                key={p}
                onPress={() => onPeriodChange(p)}
                style={[
                  styles.periodChip,
                  isSelected
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.cardAlt, borderColor: 'transparent' },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: isSelected ? '#FFFFFF' : colors.textMuted,
                      fontWeight: isSelected ? '700' : '500',
                      textTransform: 'capitalize',
                      fontSize: 11,
                    },
                  ]}
                >
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Chart Content Area */}
      <View style={styles.chartArea}>
        {chartType === 'pie' &&
          (hasPieData ? (
            <SharedChartView type="pie" pieData={pieData} />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons
                name="pie-chart-outline"
                size={32}
                color={colors.textMuted}
                style={{ opacity: 0.4 }}
              />
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 6 }]}>
                No expenses in this {period}
              </Text>
            </View>
          ))}

        {chartType === 'bar' &&
          (hasBarData ? (
            <SharedChartView
              type="bar"
              barData={barData}
              xAxisLabel={period === 'year' ? 'Month' : 'Date'}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons
                name="bar-chart-outline"
                size={32}
                color={colors.textMuted}
                style={{ opacity: 0.4 }}
              />
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 6 }]}>
                No expenses in this {period}
              </Text>
            </View>
          ))}

        {chartType === 'line' &&
          (hasLineData ? (
            <SharedChartView
              type="line"
              lineData={lineData}
              xAxisLabel={period === 'year' ? 'Month' : 'Date'}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons
                name="trending-up-outline"
                size={32}
                color={colors.textMuted}
                style={{ opacity: 0.4 }}
              />
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 6 }]}>
                No expenses in this {period}
              </Text>
            </View>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeSwitcher: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
  },
  typeTab: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 6,
  },
  periodChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chartArea: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
});
