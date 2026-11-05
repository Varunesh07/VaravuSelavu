import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import { useDataStore } from '../../src/store/dataStore';
import {
  AllTimeTotals,
  TopCategoryStat,
  ChartPeriod,
  PieChartSlice,
  BarChartItem,
  LineChartPoint,
  getAllTimeTotals,
  getTopCategories,
  getRecentTransactions,
  getPieChartData,
  getBarChartData,
  getLineChartData,
} from '../../src/db/stats';
import { TransactionWithCategory } from '../../src/db/transactions';
import { BalanceCard } from '../../src/components/BalanceCard';
import { PandaBanner } from '../../src/components/PandaBanner';
import { CategoryTiles } from '../../src/components/CategoryTiles';
import { ChartCard } from '../../src/components/ChartCard';
import { RecentTransactions } from '../../src/components/RecentTransactions';
import { formatDisplayDate, getTodayDateString } from '../../src/utils/dates';

export default function HomeScreen() {
  const { colors, typography, spacing } = useTheme();
  const dataVersion = useDataStore((s) => s.dataVersion);

  const [period, setPeriod] = useState<ChartPeriod>('month');
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [totals, setTotals] = useState<AllTimeTotals>({
    totalIncomePaise: 0,
    totalExpensePaise: 0,
    netPaise: 0,
  });
  const [topCategories, setTopCategories] = useState<TopCategoryStat[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithCategory[]>([]);
  const [pieData, setPieData] = useState<PieChartSlice[]>([]);
  const [barData, setBarData] = useState<BarChartItem[]>([]);
  const [lineData, setLineData] = useState<LineChartPoint[]>([]);

  // Load home data
  const loadHomeData = async () => {
    try {
      const [
        allTotals,
        topCats,
        recentTxs,
        pie,
        bar,
        line,
      ] = await Promise.all([
        getAllTimeTotals(),
        getTopCategories(4),
        getRecentTransactions(5),
        getPieChartData(period),
        getBarChartData(period, colors.primary),
        getLineChartData(period),
      ]);

      setTotals(allTotals);
      setTopCategories(topCats);
      setRecentTransactions(recentTxs);
      setPieData(pie);
      setBarData(bar);
      setLineData(line);
    } catch (err) {
      console.error('Failed to load home data:', err);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, [dataVersion, period]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const todayStr = getTodayDateString();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.screenPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header with App Title & Date */}
        <View style={styles.header}>
          <View>
            <Text style={[typography.title, { color: colors.text }]}>Varavuselavu</Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              {formatDisplayDate(todayStr, { showTodayText: true })}
            </Text>
          </View>
        </View>

        {/* 1. BalanceCard (Purple wave gradient with usage bar logic) */}
        <BalanceCard
          totalIncomePaise={totals.totalIncomePaise}
          totalExpensePaise={totals.totalExpensePaise}
          netPaise={totals.netPaise}
        />

        {/* 2. Panda Mascot Greeting Banner */}
        <PandaBanner
          netPaise={totals.netPaise}
          totalIncomePaise={totals.totalIncomePaise}
        />

        {/* 3. Top 4 Category Quick Tiles */}
        <CategoryTiles categories={topCategories} />

        {/* 4. Switchable ChartCard (Pie / Bar / Line with Week / Month / Year) */}
        <ChartCard
          period={period}
          onPeriodChange={setPeriod}
          pieData={pieData}
          barData={barData}
          lineData={lineData}
        />

        {/* 5. Recent 5 Transactions */}
        <RecentTransactions transactions={recentTransactions} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingBottom: 110, // Avoid overlap with floating bottom pill bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
});
