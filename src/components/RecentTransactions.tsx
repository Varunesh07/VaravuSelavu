import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { TransactionWithCategory } from '../db/transactions';
import { formatINR } from '../utils/money';
import { formatDisplayDate } from '../utils/dates';

interface RecentTransactionsProps {
  transactions: TransactionWithCategory[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const { colors, typography, radius } = useTheme();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[typography.title, { color: colors.text, fontSize: 17 }]}>
          Recent Activity
        </Text>
        <Pressable onPress={() => router.push('/history')} hitSlop={10}>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
            View all
          </Text>
        </Pressable>
      </View>

      {transactions.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius.card,
            },
          ]}
        >
          <Ionicons name="receipt-outline" size={32} color={colors.textMuted} style={{ opacity: 0.4 }} />
          <Text style={[typography.body, { color: colors.textMuted, marginTop: 8 }]}>
            No transactions yet
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2, textAlign: 'center' }]}>
            Tap the orange (+) button below to log your first income or expense!
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {transactions.map((tx) => {
            const isIncome = tx.type === 'in';
            return (
              <Pressable
                key={tx.id}
                onPress={() =>
                  router.push({
                    pathname: '/add',
                    params: { id: tx.id.toString() },
                  })
                }
                style={({ pressed }) => [
                  styles.txRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radius.card,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: `${tx.category_color}20` },
                  ]}
                >
                  <Ionicons name={tx.category_icon as any} size={18} color={tx.category_color} />
                </View>

                <View style={styles.txInfo}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                    {tx.category_name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
                    {tx.note || formatDisplayDate(tx.date, { showTodayText: true })}
                  </Text>
                </View>

                <View style={styles.amountWrap}>
                  <Text
                    style={[
                      typography.body,
                      {
                        color: isIncome ? colors.income : colors.expense,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {isIncome ? '+ ' : '− '}
                    {formatINR(tx.amount)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  list: {
    gap: 8,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  amountWrap: {
    marginLeft: 12,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
