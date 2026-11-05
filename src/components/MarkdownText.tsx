import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../theme';

interface MarkdownTextProps {
  content: string;
  style?: TextStyle;
  color?: string;
}

export function MarkdownText({ content, style, color }: MarkdownTextProps) {
  const { colors, typography } = useTheme();
  const textColor = color || colors.text;

  // Split into lines to handle list items and paragraphs
  const lines = content.split('\n');

  return (
    <View style={styles.container}>
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();

        // Empty line -> spacing
        if (!trimmed) {
          return <View key={lineIndex} style={styles.emptyLine} />;
        }

        // Bullet list item (- item, * item, • item)
        const bulletMatch = line.match(/^\s*[-*•]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <View key={lineIndex} style={styles.bulletRow}>
              <Text style={[typography.body, { color: textColor, marginRight: 6 }]}>•</Text>
              <Text style={[typography.body, { color: textColor, flex: 1 }, style]}>
                {renderInlineFormatting(bulletMatch[1], textColor)}
              </Text>
            </View>
          );
        }

        // Numbered list item (1. item, 2. item)
        const numberMatch = line.match(/^\s*(\d+\.)\s+(.*)$/);
        if (numberMatch) {
          return (
            <View key={lineIndex} style={styles.numberRow}>
              <Text style={[typography.body, { color: textColor, marginRight: 6, fontWeight: '700' }]}>
                {numberMatch[1]}
              </Text>
              <Text style={[typography.body, { color: textColor, flex: 1 }, style]}>
                {renderInlineFormatting(numberMatch[2], textColor)}
              </Text>
            </View>
          );
        }

        // Standard line
        return (
          <Text key={lineIndex} style={[typography.body, { color: textColor }, style]}>
            {renderInlineFormatting(line, textColor)}
          </Text>
        );
      })}
    </View>
  );
}

/**
 * Parses bold (**text**) and italic (*text*) inside a string and returns React Text nodes.
 */
function renderInlineFormatting(text: string, defaultColor: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      const boldText = token.slice(2, -2);
      return (
        <Text key={idx} style={{ fontWeight: '700', color: defaultColor }}>
          {boldText}
        </Text>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      const italicText = token.slice(1, -1);
      return (
        <Text key={idx} style={{ fontStyle: 'italic', color: defaultColor }}>
          {italicText}
        </Text>
      );
    }
    return token;
  });
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  emptyLine: {
    height: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
  },
});
