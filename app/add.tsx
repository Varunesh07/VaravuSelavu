import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme';

export default function AddModalScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { paddingHorizontal: spacing.screenPadding }]}>
        <View style={styles.header}>
          <Text style={[typography.title, { color: colors.text }]}>Add Transaction</Text>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={[typography.body, { color: colors.primary }]}>Close</Text>
          </Pressable>
        </View>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
          Modal for Money Out / Money In
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
});
