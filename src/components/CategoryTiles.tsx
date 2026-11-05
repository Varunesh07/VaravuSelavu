import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { TopCategoryStat } from '../db/stats';
import { formatINR } from '../utils/money';

interface CategoryTilesProps {
  categories: TopCategoryStat[];
}

export function CategoryTiles({ categories }: CategoryTilesProps) {
  const { colors, typography, radius } = useTheme();
  const router = useRouter();

  if (categories.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[typography.title, { color: colors.text, fontSize: 17 }]}>
          Top Spending
        </Text>
        <Pressable onPress={() => router.push('/history')} hitSlop={10}>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
            View all
          </Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => router.push('/history')}
            style={({ pressed }) => [
              styles.tile,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radius.card,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View style={styles.tileHeader}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${cat.color}20` },
                ]}
              >
                <Ionicons name={cat.icon as any} size={18} color={cat.color} />
              </View>
              {cat.percent > 0 && (
                <View style={[styles.percentBadge, { backgroundColor: `${colors.primary}15` }]}>
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', fontSize: 11 }]}>
                    {cat.percent}%
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={[typography.body, { color: colors.text, fontWeight: '600', marginTop: 8 }]}
              numberOfLines={1}
            >
              {cat.name}
            </Text>

            <Text style={[typography.caption, { color: colors.expense, fontWeight: '700', marginTop: 2 }]}>
              {formatINR(cat.totalPaise)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '48.5%',
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
});
