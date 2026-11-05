import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme';
import { Chat, getChats, createChat, deleteChat } from '../../src/db/chats';
import { formatDisplayDate } from '../../src/utils/dates';
import { Panda } from '../../src/components/panda/Panda';

export default function ChatsScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();

  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Reload chats on screen focus
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      getChats()
        .then((data) => {
          if (isMounted) {
            setChats(data);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          console.error('Failed to load chats:', err);
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }, [])
  );

  // Create new chat
  const handleNewChat = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const chatId = await createChat('New chat');
      router.push(`/chat/${chatId}` as any);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create chat.');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete chat
  const handleDeleteChat = (chatId: number, title: string) => {
    Alert.alert(
      'Delete Chat',
      `Delete "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChat(chatId);
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setChats((prev) => prev.filter((c) => c.id !== chatId));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete chat.');
            }
          },
        },
      ]
    );
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const dateStr = new Date(item.updated_at).toISOString().split('T')[0];
    const displayDate = formatDisplayDate(dateStr, { showTodayText: true });

    return (
      <Pressable
        onPress={() => router.push(`/chat/${item.id}` as any)}
        style={({ pressed }) => [
          styles.chatRow,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: radius.card,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View style={styles.avatar}>
          <Panda reaction="happy" size={36} animated={false} />
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text
              style={[typography.body, { color: colors.text, fontWeight: '700', flex: 1 }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
              {displayDate}
            </Text>
          </View>

          <Text
            style={[typography.caption, { color: colors.textMuted, marginTop: 3 }]}
            numberOfLines={1}
          >
            {item.last_message || 'Tap to chat with Panda'}
          </Text>
        </View>

        <Pressable
          onPress={() => handleDeleteChat(item.id, item.title)}
          hitSlop={12}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.screenPadding }]}>
        <View>
          <Text style={[typography.title, { color: colors.text }]}>Panda AI Chat</Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
            Your friendly spending assistant
          </Text>
        </View>

        <Pressable
          onPress={handleNewChat}
          disabled={isCreating}
          style={[
            styles.newChatBtn,
            { backgroundColor: colors.primary, borderRadius: radius.chip },
          ]}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
            New Chat
          </Text>
        </Pressable>
      </View>

      {/* Chats List or Empty State */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderChatItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: spacing.screenPadding },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Panda reaction="sleeping" size={80} animated={false} />
              <Text style={[typography.title, { color: colors.text, marginTop: 14 }]}>
                Ask Panda Anything
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: colors.textMuted, textAlign: 'center', marginTop: 6, maxWidth: 280 },
                ]}
              >
                Analyze your monthly spending, compare categories, or generate visual charts.
              </Text>

              <Pressable
                onPress={handleNewChat}
                style={[
                  styles.startBtn,
                  { backgroundColor: colors.primary, borderRadius: radius.button },
                ]}
              >
                <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                  Start New Chat
                </Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 110,
    gap: 10,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pandaText: {
    fontSize: 22,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 8,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  bigPandaCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPandaEmoji: {
    fontSize: 44,
  },
  startBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 20,
  },
});
