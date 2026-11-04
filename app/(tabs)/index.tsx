import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';

export default function HomeScreen() {
  const { colors, typography, spacing } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { paddingHorizontal: spacing.screenPadding }]}>
        <Text style={[typography.title, { color: colors.text, marginTop: spacing.md }]}>
          Varavuselavu
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
          Welcome! Personal expense tracker
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              padding: spacing.base,
              marginTop: spacing.xl,
            },
          ]}
        >
          <Text style={[typography.body, { color: colors.text }]}>
            Phase 0 setup complete. Themed blank Home screen is active.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
  },
});

