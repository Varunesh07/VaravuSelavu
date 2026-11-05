import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { FlashList } from '@shopify/flash-list';

import { useTheme } from '../../src/theme';
import { useDataStore } from '../../src/store/dataStore';
import {
  TransactionWithCategory,
  getTransactionsByMonth,
  getTransactionsByDay,
  getDaysWithTransactionsInMonth,
  getDailyTotalsForDay,
} from '../../src/db/transactions';
import { getCategories, Category } from '../../src/db/categories';
import { formatINR } from '../../src/utils/money';
import {
  getTodayDateString,
  getCurrentYearMonth,
  formatDisplayDate,
  formatMonthYear,
  shiftMonth,
} from '../../src/utils/dates';

type HistoryViewMode = 'calendar' | 'list';

type ListItem =
  | { type: 'header'; date: string; dayTotalPaise: number }
  | { type: 'item'; transaction: TransactionWithCategory };

export default function HistoryScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();
  const dataVersion = useDataStore((s) => s.dataVersion);

  const todayStr = useMemo(() => getTodayDateString(), []);

  // Screen State
  const [viewMode, setViewMode] = useState<HistoryViewMode>('calendar');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentYearMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Filter & Search State (List mode)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Data State
  const [monthTransactions, setMonthTransactions] = useState<TransactionWithCategory[]>([]);
  const [dayTransactions, setDayTransactions] = useState<TransactionWithCategory[]>([]);
  const [monthDots, setMonthDots] = useState<Record<string, { hasExpense: boolean; hasIncome: boolean }>>({});
  const [dayTotals, setDayTotals] = useState<{ expensePaise: number; incomePaise: number }>({
    expensePaise: 0,
    incomePaise: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load Categories once or when dataVersion changes
  useEffect(() => {
    getCategories({ includeHidden: true })
      .then(setCategories)
      .catch((err) => console.error('Failed to load categories:', err));
  }, [dataVersion]);

  // Load Month Data (dots and full month transactions)
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      getDaysWithTransactionsInMonth(selectedMonth),
      getTransactionsByMonth(selectedMonth, selectedCategoryId || undefined, searchQuery),
    ])
      .then(([dots, txs]) => {
        if (!isMounted) return;
        setMonthDots(dots);
        setMonthTransactions(txs);
      })
      .catch((err) => console.error('Failed to load month data:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedMonth, selectedCategoryId, searchQuery, dataVersion]);

  // Load Day Data for Calendar Mode
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getTransactionsByDay(selectedDate),
      getDailyTotalsForDay(selectedDate),
    ])
      .then(([txs, totals]) => {
        if (!isMounted) return;
        setDayTransactions(txs);
        setDayTotals(totals);
      })
      .catch((err) => console.error('Failed to load day data:', err));

    return () => {
      isMounted = false;
    };
  }, [selectedDate, dataVersion]);

  // Handle Month Navigation
  const handlePrevMonth = () => {
    const prev = shiftMonth(selectedMonth, -1);
    setSelectedMonth(prev);
    setSelectedDate(`${prev}-01`);
  };

  const handleNextMonth = () => {
    const next = shiftMonth(selectedMonth, 1);
    setSelectedMonth(next);
    setSelectedDate(`${next}-01`);
  };

  // Calendar Marked Dates Configuration
  const calendarMarkedDates = useMemo(() => {
    const marked: Record<string, any> = {};

    // Add dots for days with transactions
    for (const [date, info] of Object.entries(monthDots)) {
      const dots: { key: string; color: string }[] = [];
      if (info.hasExpense) dots.push({ key: 'exp', color: colors.expense });
      if (info.hasIncome) dots.push({ key: 'inc', color: colors.income });

      marked[date] = {
        dots,
        marked: true,
      };
    }

    // Highlight selected day
    marked[selectedDate] = {
      ...(marked[selectedDate] || {}),
      selected: true,
      selectedColor: colors.primary,
      selectedTextColor: '#FFFFFF',
    };

    return marked;
  }, [monthDots, selectedDate, colors]);

  // Build Grouped List Items for FlashList in List Mode
  const listItems = useMemo<ListItem[]>(() => {
    if (monthTransactions.length === 0) return [];

    const items: ListItem[] = [];
    const groupedByDay: Record<string, TransactionWithCategory[]> = {};

    for (const tx of monthTransactions) {
      if (!groupedByDay[tx.date]) {
        groupedByDay[tx.date] = [];
      }
      groupedByDay[tx.date].push(tx);
    }

    const sortedDates = Object.keys(groupedByDay).sort((a, b) => b.localeCompare(a));

    for (const d of sortedDates) {
      const txs = groupedByDay[d];
      const dayExpensePaise = txs
        .filter((t) => t.type === 'out')
        .reduce((sum, t) => sum + t.amount, 0);

      items.push({
        type: 'header',
        date: d,
        dayTotalPaise: dayExpensePaise,
      });

      for (const tx of txs) {
        items.push({
          type: 'item',
          transaction: tx,
        });
      }
    }

    return items;
  }, [monthTransactions]);

  // Navigate to Edit Transaction
  const handleEditTransaction = useCallback((id: number) => {
    router.push({
      pathname: '/add',
      params: { id: id.toString() },
    });
  }, [router]);

  // Render a Single Transaction Row
  const renderTransactionRow = (tx: TransactionWithCategory) => {
    const isIncome = tx.type === 'in';
    return (
      <Pressable
        key={tx.id}
        onPress={() => handleEditTransaction(tx.id)}
        style={({ pressed }) => [
          styles.txRow,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
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
          <Ionicons name={tx.category_icon as any} size={20} color={tx.category_color} />
        </View>

        <View style={styles.txInfo}>
          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
            {tx.category_name}
          </Text>
          {tx.note ? (
            <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
              {tx.note}
            </Text>
          ) : null}
        </View>

        <View style={styles.txAmountContainer}>
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
  };

  // FlashList Item Renderer for List Mode
  const renderListItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.dateHeader}>
          <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700' }]}>
            {formatDisplayDate(item.date, { showTodayText: true }).toUpperCase()}
          </Text>
          {item.dayTotalPaise > 0 && (
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Spent {formatINR(item.dayTotalPaise)}
            </Text>
          )}
        </View>
      );
    }
    return renderTransactionRow(item.transaction);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header & Segmented Mode Switch */}
      <View style={[styles.topBar, { paddingHorizontal: spacing.screenPadding }]}>
        <Text style={[typography.title, { color: colors.text }]}>History</Text>

        <View style={[styles.segmentContainer, { backgroundColor: colors.cardAlt }]}>
          <Pressable
            onPress={() => setViewMode('calendar')}
            style={[
              styles.segmentButton,
              viewMode === 'calendar' && { backgroundColor: colors.card },
            ]}
          >
            <Ionicons
              name="calendar"
              size={16}
              color={viewMode === 'calendar' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                typography.caption,
                styles.segmentText,
                { color: viewMode === 'calendar' ? colors.text : colors.textMuted },
              ]}
            >
              Calendar
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setViewMode('list')}
            style={[
              styles.segmentButton,
              viewMode === 'list' && { backgroundColor: colors.card },
            ]}
          >
            <Ionicons
              name="list"
              size={16}
              color={viewMode === 'list' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                typography.caption,
                styles.segmentText,
                { color: viewMode === 'list' ? colors.text : colors.textMuted },
              ]}
            >
              List
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Month Navigator Header */}
      <View style={[styles.monthNav, { paddingHorizontal: spacing.screenPadding }]}>
        <Pressable
          onPress={handlePrevMonth}
          hitSlop={12}
          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>

        <Text style={[typography.title, { color: colors.text, fontSize: 17 }]}>
          {formatMonthYear(selectedMonth)}
        </Text>

        <Pressable
          onPress={handleNextMonth}
          hitSlop={12}
          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {/* CALENDAR VIEW MODE */}
      {viewMode === 'calendar' ? (
        <View style={styles.calendarContainer}>
          <View style={[styles.calendarWrapper, { backgroundColor: colors.card, marginHorizontal: spacing.screenPadding }]}>
            <Calendar
              key={selectedMonth}
              current={`${selectedMonth}-01`}
              markingType="multi-dot"
              markedDates={calendarMarkedDates}
              onDayPress={(day: any) => setSelectedDate(day.dateString)}
              onMonthChange={(month: any) => setSelectedMonth(month.dateString.slice(0, 7))}
              hideArrows={true}
              theme={{
                backgroundColor: colors.card,
                calendarBackground: colors.card,
                textSectionTitleColor: colors.textMuted,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#ffffff',
                todayTextColor: colors.primary,
                dayTextColor: colors.text,
                textDisabledColor: `${colors.textMuted}55`,
                monthTextColor: colors.text,
                textDayFontFamily: 'Inter_500Medium',
                textDayHeaderFontFamily: 'Inter_500Medium',
              }}
            />
          </View>

          {/* Selected Day Summary Strip */}
          <View
            style={[
              styles.summaryStrip,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginHorizontal: spacing.screenPadding,
              },
            ]}
          >
            <View style={styles.summaryItem}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {formatDisplayDate(selectedDate, { showTodayText: true })}
              </Text>
              <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
                {dayTransactions.length} transaction{dayTransactions.length === 1 ? '' : 's'}
              </Text>
            </View>

            <View style={styles.summaryValues}>
              <Text style={[typography.caption, { color: colors.expense, fontWeight: '600' }]}>
                Spent: {formatINR(dayTotals.expensePaise)}
              </Text>
              {dayTotals.incomePaise > 0 && (
                <Text style={[typography.caption, { color: colors.income, fontWeight: '600' }]}>
                  Received: {formatINR(dayTotals.incomePaise)}
                </Text>
              )}
            </View>
          </View>

          {/* Selected Day Transactions List */}
          <FlashList
            data={dayTransactions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => renderTransactionRow(item)}
            contentContainerStyle={{
              paddingHorizontal: spacing.screenPadding,
              paddingBottom: 100,
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={44} color={colors.textMuted} style={{ opacity: 0.4 }} />
                <Text style={[typography.body, { color: colors.textMuted, marginTop: 8 }]}>
                  No transactions on this day
                </Text>
              </View>
            }
          />
        </View>
      ) : (
        /* LIST VIEW MODE */
        <View style={styles.listContainer}>
          {/* Search Box */}
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: spacing.screenPadding }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search notes or category..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, typography.body, { color: colors.text }]}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Category Filter Chips */}
          <View style={styles.chipsRow}>
            <Pressable
              onPress={() => setSelectedCategoryId(null)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedCategoryId === null ? colors.primary : colors.card,
                  borderColor: selectedCategoryId === null ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: selectedCategoryId === null ? '#FFFFFF' : colors.text,
                    fontWeight: selectedCategoryId === null ? '700' : '500',
                  },
                ]}
              >
                All
              </Text>
            </Pressable>

            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? cat.color : colors.card,
                      borderColor: isSelected ? cat.color : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={14}
                    color={isSelected ? '#FFFFFF' : cat.color}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isSelected ? '#FFFFFF' : colors.text,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Grouped Month Transactions List */}
          {isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <FlashList
              data={listItems}
              renderItem={renderListItem}
              getItemType={(item) => item.type}
              keyExtractor={(item) =>
                item.type === 'header' ? `header-${item.date}` : `item-${item.transaction.id}`
              }
              contentContainerStyle={{
                paddingHorizontal: spacing.screenPadding,
                paddingBottom: 110,
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="receipt-outline" size={44} color={colors.textMuted} style={{ opacity: 0.4 }} />
                  <Text style={[typography.body, { color: colors.textMuted, marginTop: 8 }]}>
                    No transactions found for this month
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  segmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  segmentText: {
    marginLeft: 6,
    fontWeight: '600',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  calendarContainer: {
    flex: 1,
  },
  calendarWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'column',
  },
  summaryValues: {
    alignItems: 'flex-end',
  },
  listContainer: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txAmountContainer: {
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});
