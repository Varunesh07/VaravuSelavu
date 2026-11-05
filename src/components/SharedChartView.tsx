import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../theme';
import { formatIndianCurrencyAbbreviated } from '../utils/money';

export interface SharedChartSlice {
  label: string;
  value: number; // in Rupees
  color?: string;
  percent?: number;
}

export interface SharedChartBarItem {
  label: string;
  value: number; // in Rupees
  frontColor?: string;
  color?: string;
}

export interface SharedChartLinePoint {
  label: string;
  value: number; // in Rupees
}

export interface SharedChartViewProps {
  type: 'pie' | 'bar' | 'line';
  pieData?: SharedChartSlice[];
  barData?: SharedChartBarItem[];
  lineData?: SharedChartLinePoint[];
  width?: number;
  height?: number;
  xAxisLabel?: 'Category' | 'Date' | 'Month';
  compact?: boolean;
}

export function SharedChartView({
  type,
  pieData = [],
  barData = [],
  lineData = [],
  width: customWidth,
  height: customHeight,
  xAxisLabel,
  compact = false,
}: SharedChartViewProps) {
  const { colors, typography, radius } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  // Selected slice state for pie/donut interactivity
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Available plot width accounting for card padding
  const containerWidth =
    customWidth ||
    (compact
      ? Math.max(220, Math.min(windowWidth * 0.82, 330) - 36)
      : Math.max(260, windowWidth - 80));

  const chartHeight = customHeight || (compact ? 130 : 160);
  const yAxisLabelWidth = 42;
  const plotAreaWidth = Math.max(160, containerWidth - yAxisLabelWidth - 8);

  // Requirement: in AI chat and Home, if a line chart would have fewer than 3 points, draw a bar chart instead.
  const isLineUnderThree = type === 'line' && lineData.length < 3;
  const effectiveType = isLineUnderThree ? 'bar' : type;

  const effectiveBarData: SharedChartBarItem[] =
    isLineUnderThree && (!barData || barData.length === 0)
      ? lineData.map((d) => ({
          label: d.label,
          value: d.value,
          frontColor: colors.primary,
        }))
      : barData;

  const effectiveLineData = isLineUnderThree ? [] : lineData;

  // Resolved X-axis title for bar and line
  const resolvedXAxisLabel =
    xAxisLabel ||
    (effectiveType === 'bar'
      ? effectiveBarData.some((b) => b.label.match(/^\d{4}-\d{2}$/))
        ? 'Month'
        : effectiveBarData.some((b) => b.label.match(/\d{2}-\d{2}/))
        ? 'Date'
        : 'Category'
      : effectiveLineData.some((l) => l.label.match(/^\d{4}-\d{2}$/))
      ? 'Month'
      : 'Date');

  // Currently selected slice details
  const selectedSlice =
    selectedIndex !== null && pieData[selectedIndex] ? pieData[selectedIndex] : null;

  const totalPieValue = pieData.reduce((acc, s) => acc + (s.value || 0), 0);
  const selectedPercent = selectedSlice
    ? selectedSlice.percent !== undefined
      ? selectedSlice.percent
      : totalPieValue > 0
      ? Math.round((selectedSlice.value / totalPieValue) * 100)
      : 0
    : 0;

  return (
    <Pressable onPress={() => setSelectedIndex(null)} style={styles.outerContainer}>
      {/* -------------------- PIE / DONUT CHART -------------------- */}
      {type === 'pie' && (
        <View style={styles.pieSection}>
          {/* Fixed-height Tooltip Slot to avoid layout jumping */}
          <View style={styles.tooltipSlot}>
            {selectedSlice ? (
              <View
                style={[
                  styles.tooltipPill,
                  {
                    backgroundColor: colors.cardAlt,
                    borderColor: colors.border,
                    borderRadius: radius.chip,
                  },
                ]}
              >
                <View
                  style={[
                    styles.tooltipDot,
                    { backgroundColor: selectedSlice.color || colors.primary },
                  ]}
                />
                <Text
                  style={[
                    typography.caption,
                    { color: colors.text, fontWeight: '700', fontSize: compact ? 10 : 11 },
                  ]}
                  numberOfLines={1}
                >
                  {selectedSlice.label} / {selectedPercent}% · ₹
                  {Math.round(selectedSlice.value).toLocaleString('en-IN')}
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  typography.caption,
                  { color: colors.textMuted, fontSize: 10, opacity: 0.7 },
                ]}
              >
                Tap any segment to inspect
              </Text>
            )}
          </View>

          {/* Donut and Legend row */}
          <View style={styles.pieRow}>
            <View style={styles.donutWrapper}>
              <PieChart
                data={pieData.map((slice, index) => {
                  const isFocused = selectedIndex === index;
                  const slicePct =
                    slice.percent !== undefined
                      ? slice.percent
                      : totalPieValue > 0
                      ? Math.round((slice.value / totalPieValue) * 100)
                      : 0;

                  return {
                    value: slice.value,
                    color: slice.color || colors.primary,
                    text: `${slicePct}%`,
                    focused: isFocused,
                    extraRadius: isFocused ? (compact ? 6 : 8) : 0,
                    onPress: () => {
                      setSelectedIndex((prev) => (prev === index ? null : index));
                    },
                  };
                })}
                donut
                isAnimated={false}
                radius={compact ? 50 : 64}
                innerRadius={compact ? 32 : 42}
                innerCircleColor={colors.card}
                focusOnPress={false} // Handled via state for reliable toggle
                centerLabelComponent={() => (
                  <Pressable
                    onPress={() => setSelectedIndex(null)}
                    style={styles.donutCenter}
                  >
                    {selectedSlice ? (
                      <>
                        <Text
                          style={[
                            typography.caption,
                            {
                              color: colors.text,
                              fontWeight: '700',
                              fontSize: compact ? 9 : 10,
                              textAlign: 'center',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {selectedSlice.label}
                        </Text>
                        <Text
                          style={[
                            typography.caption,
                            {
                              color: colors.primary,
                              fontWeight: '700',
                              fontSize: compact ? 10 : 11,
                              textAlign: 'center',
                              marginTop: 1,
                            },
                          ]}
                        >
                          {selectedPercent}%
                        </Text>
                        <Text
                          style={[
                            typography.caption,
                            {
                              color: colors.textMuted,
                              fontSize: compact ? 8 : 9,
                              textAlign: 'center',
                            },
                          ]}
                        >
                          ₹{Math.round(selectedSlice.value).toLocaleString('en-IN')}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text
                          style={[
                            typography.caption,
                            {
                              color: colors.textMuted,
                              fontSize: compact ? 9 : 10,
                              textAlign: 'center',
                            },
                          ]}
                        >
                          Expenses
                        </Text>
                        <Text
                          style={[
                            typography.caption,
                            {
                              color: colors.textMuted,
                              fontSize: compact ? 7 : 8,
                              textAlign: 'center',
                              opacity: 0.6,
                            },
                          ]}
                        >
                          tap slice
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}
              />
            </View>

            {/* Legend */}
            <View style={styles.legendContainer}>
              {pieData.map((slice, index) => {
                const isSelected = selectedIndex === index;
                const slicePct =
                  slice.percent !== undefined
                    ? slice.percent
                    : totalPieValue > 0
                    ? Math.round((slice.value / totalPieValue) * 100)
                    : 0;

                return (
                  <Pressable
                    key={`${slice.label}-${index}`}
                    onPress={() => setSelectedIndex((prev) => (prev === index ? null : index))}
                    style={[
                      styles.legendItem,
                      isSelected && {
                        backgroundColor: `${colors.primary}18`,
                        borderRadius: radius.chip,
                        paddingHorizontal: 4,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: slice.color || colors.primary },
                      ]}
                    />
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: isSelected ? colors.primary : colors.text,
                          fontWeight: isSelected ? '700' : '400',
                          flex: 1,
                          fontSize: compact ? 10 : 11,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {slice.label}
                    </Text>
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: colors.textMuted,
                          fontWeight: '700',
                          fontSize: compact ? 10 : 11,
                          marginLeft: 4,
                        },
                      ]}
                    >
                      {slicePct}%
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* -------------------- BAR CHART -------------------- */}
      {effectiveType === 'bar' && (
        <View style={styles.cartesianSection}>
          {/* Y-Axis Label Header */}
          <View style={styles.yAxisTitleRow}>
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
              ]}
            >
              Amount (₹)
            </Text>
          </View>

          {/* Bar Chart Component */}
          {(() => {
            const count = effectiveBarData.length;
            const barWidth = Math.max(
              10,
              Math.min(compact ? 16 : 20, Math.floor((plotAreaWidth / Math.max(1, count + 1)) * 0.55))
            );
            const spacing = Math.max(
              4,
              Math.min(16, Math.floor((plotAreaWidth - barWidth * count) / Math.max(1, count + 1)))
            );
            const totalBarsAndGaps = barWidth * count + spacing * Math.max(0, count - 1);
            const initialSpacing = Math.max(6, Math.floor((plotAreaWidth - totalBarsAndGaps) / 2));
            const maxVal = Math.max(...effectiveBarData.map((d) => d.value || 0), 0);

            return (
              <BarChart
                data={effectiveBarData.map((d) => ({
                  value: d.value,
                  label: d.label.length > 5 ? `${d.label.slice(0, 4)}.` : d.label,
                  frontColor: d.frontColor || d.color || colors.primary,
                }))}
                isAnimated={false}
                barWidth={barWidth}
                spacing={spacing}
                initialSpacing={initialSpacing}
                roundedTop
                roundedBottom
                hideRules={false}
                rulesColor={colors.border}
                rulesType="dashed"
                yAxisTextStyle={{ color: colors.textMuted, fontSize: compact ? 8 : 9 }}
                xAxisLabelTextStyle={{
                  color: colors.textMuted,
                  fontSize: compact ? 8 : 9,
                  width: barWidth + spacing + 6,
                  textAlign: 'center',
                }}
                yAxisColor="transparent"
                xAxisColor={colors.border}
                yAxisLabelWidth={yAxisLabelWidth}
                formatYLabel={(val) => formatIndianCurrencyAbbreviated(Number(val))}
                maxValue={maxVal > 0 ? undefined : 100}
                width={plotAreaWidth}
                height={chartHeight}
                noOfSections={3}
              />
            );
          })()}

          {/* X-Axis Label Footer */}
          <View style={styles.xAxisTitleRow}>
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
              ]}
            >
              {resolvedXAxisLabel}
            </Text>
          </View>
        </View>
      )}

      {/* -------------------- LINE CHART -------------------- */}
      {effectiveType === 'line' && (
        <View style={styles.cartesianSection}>
          {/* Y-Axis Label Header */}
          <View style={styles.yAxisTitleRow}>
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
              ]}
            >
              Amount (₹)
            </Text>
          </View>

          {/* Line Chart Component */}
          {(() => {
            const count = effectiveLineData.length;
            const lineSpacing =
              count > 1
                ? Math.max(12, Math.floor((plotAreaWidth - 24) / (count - 1)))
                : 40;
            const initialSpacing = Math.max(
              8,
              Math.floor((plotAreaWidth - lineSpacing * Math.max(0, count - 1)) / 2)
            );
            const labelStep = count > 14 ? Math.ceil(count / 6) : count > 8 ? 2 : 1;
            const maxVal = Math.max(...effectiveLineData.map((d) => d.value || 0), 0);

            return (
              <LineChart
                data={effectiveLineData.map((d, index) => {
                  const shouldShowLabel = index % labelStep === 0 || index === count - 1;
                  const labelText =
                    d.label.length > 5 ? `${d.label.slice(0, 4)}.` : d.label;
                  return {
                    value: d.value,
                    label: shouldShowLabel ? labelText : '',
                  };
                })}
                isAnimated={false}
                spacing={lineSpacing}
                initialSpacing={initialSpacing}
                color={colors.primary}
                thickness={2.5}
                startFillColor={`${colors.primary}30`}
                endFillColor={`${colors.primary}00`}
                areaChart
                curved
                hideRules={false}
                rulesColor={colors.border}
                rulesType="dashed"
                yAxisTextStyle={{ color: colors.textMuted, fontSize: compact ? 8 : 9 }}
                xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: compact ? 8 : 9 }}
                yAxisColor="transparent"
                xAxisColor={colors.border}
                yAxisLabelWidth={yAxisLabelWidth}
                formatYLabel={(val) => formatIndianCurrencyAbbreviated(Number(val))}
                maxValue={maxVal > 0 ? undefined : 100}
                width={plotAreaWidth}
                height={chartHeight}
                noOfSections={3}
                dataPointsColor={colors.primary}
                dataPointsRadius={3}
              />
            );
          })()}

          {/* X-Axis Label Footer */}
          <View style={styles.xAxisTitleRow}>
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
              ]}
            >
              {resolvedXAxisLabel}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pieSection: {
    width: '100%',
    alignItems: 'center',
  },
  tooltipSlot: {
    height: 28,
    minHeight: 28,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tooltipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tooltipDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  pieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  donutWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  legendContainer: {
    flex: 1,
    marginLeft: 14,
    gap: 4,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  cartesianSection: {
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
  },
  yAxisTitleRow: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 2,
    paddingLeft: 4,
  },
  xAxisTitleRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
