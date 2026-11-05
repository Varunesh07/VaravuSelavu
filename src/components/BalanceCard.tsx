import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { formatINR } from '../utils/money';

interface BalanceCardProps {
  totalIncomePaise: number;
  totalExpensePaise: number;
  netPaise: number;
}

export function BalanceCard({
  totalIncomePaise,
  totalExpensePaise,
  netPaise,
}: BalanceCardProps) {
  const { typography, radius } = useTheme();

  // Usage Bar Calculation
  const hasIncome = totalIncomePaise > 0;
  const isOverspent = hasIncome && totalExpensePaise > totalIncomePaise;
  const usageRatio = hasIncome ? totalExpensePaise / totalIncomePaise : 0;
  const usagePercent = Math.round(usageRatio * 100);

  // Bar Color Thresholds: <70% purple, 70-90% amber, >90% red
  let barColor = '#DDD6FE'; // light purple highlight
  if (isOverspent || usagePercent > 90) {
    barColor = '#EF4444';
  } else if (usagePercent >= 70) {
    barColor = '#F59E0B';
  }

  const fillWidth = isOverspent ? 100 : Math.min(100, Math.max(0, usagePercent));

  return (
    <LinearGradient
      colors={['#4C1D95', '#7C3AED']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderRadius: radius.card }]}
    >
      {/* Top Label */}
      <View style={styles.topRow}>
        <Text style={[typography.caption, styles.label]}>NET BALANCE</Text>
        <Ionicons name="wallet-outline" size={20} color="rgba(255, 255, 255, 0.7)" />
      </View>

      {/* Big Balance Number */}
      <Text style={[typography.bigNumber, styles.balanceAmount]}>
        {netPaise < 0 ? '− ' : ''}
        {formatINR(Math.abs(netPaise))}
      </Text>

      {/* Income & Expense Pills */}
      <View style={styles.pillsRow}>
        <View style={styles.pill}>
          <View style={[styles.pillDot, { backgroundColor: '#22C55E' }]} />
          <View>
            <Text style={[typography.caption, styles.pillLabel]}>Income</Text>
            <Text style={[typography.body, styles.pillValue]}>
              {formatINR(totalIncomePaise)}
            </Text>
          </View>
        </View>

        <View style={styles.pill}>
          <View style={[styles.pillDot, { backgroundColor: '#F87171' }]} />
          <View>
            <Text style={[typography.caption, styles.pillLabel]}>Spent</Text>
            <Text style={[typography.body, styles.pillValue]}>
              {formatINR(totalExpensePaise)}
            </Text>
          </View>
        </View>
      </View>

      {/* Usage Bar Section */}
      <View style={styles.usageContainer}>
        {!hasIncome ? (
          <Text style={[typography.caption, styles.usageHint]}>
            Add money in to see usage
          </Text>
        ) : (
          <>
            <View style={styles.usageTrack}>
              <View
                style={[
                  styles.usageFill,
                  { width: `${fillWidth}%`, backgroundColor: barColor },
                ]}
              />
            </View>
            <View style={styles.usageLabelsRow}>
              {isOverspent ? (
                <Text style={[typography.caption, styles.overspentText]}>
                  Over by {formatINR(totalExpensePaise - totalIncomePaise)}
                </Text>
              ) : (
                <Text style={[typography.caption, styles.usageText]}>
                  {usagePercent}% of income spent
                </Text>
              )}
            </View>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 1,
    fontWeight: '600',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    lineHeight: 44,
    marginVertical: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 12,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  pillLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
  },
  pillValue: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
  },
  usageContainer: {
    marginTop: 16,
  },
  usageHint: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  usageTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    borderRadius: 3,
  },
  usageLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  usageText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  overspentText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
  },
});
