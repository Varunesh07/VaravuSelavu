import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '../../src/theme';
import { getDatabase } from '../../src/db';
import {
  ChatMessage,
  getChatById,
  getMessages,
  insertMessage,
  updateChatTitle,
  deleteChat,
} from '../../src/db/chats';
import { sendChatMessage } from '../../src/services/ai';
import { ChatChartView } from '../../src/components/ChatChartView';

const SUGGESTIONS = [
  'How much did I spend this month?',
  'Where did most of my money go?',
  'Compare this month vs last month',
  'Show my food spending trend',
];

export default function ChatScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const chatId = parseInt(params.id, 10);

  const [chatTitle, setChatTitle] = useState('New chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [failedMessageIndex, setFailedMessageIndex] = useState<number | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // Monitor network status
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return () => unsub();
  }, []);

  // Load chat and messages
  useEffect(() => {
    if (isNaN(chatId)) return;

    getChatById(chatId).then((chat) => {
      if (chat) setChatTitle(chat.title);
    });

    getMessages(chatId).then(async (msgs) => {
      // Filter out and clean up any previously saved failed assistant messages (Rule 125)
      const validMsgs = msgs.filter(
        (m) =>
          !(
            m.role === 'assistant' &&
            (m.content.includes("I'm a bit slow right now") ||
              m.content.includes('trouble processing') ||
              m.content.includes('connection issue'))
          )
      );

      if (validMsgs.length < msgs.length) {
        try {
          const db = await getDatabase();
          await db.runAsync(
            "DELETE FROM messages WHERE chat_id = ? AND role = 'assistant' AND (content LIKE '%slow right now%' OR content LIKE '%trouble processing%' OR content LIKE '%connection issue%')",
            [chatId]
          );
        } catch {
          // ignore cleanup error
        }
      }

      setMessages(validMsgs);

      // Rule 107: If last message is user (unanswered), show Retry on it
      if (validMsgs.length > 0 && validMsgs[validMsgs.length - 1].role === 'user') {
        setFailedMessageIndex(validMsgs.length - 1);
      }
    });
  }, [chatId]);

  // Send message handler
  const handleSend = async (textToSend?: string, existingUserMsgId?: number) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading || isNaN(chatId)) return;

    setInputText('');
    setFailedMessageIndex(null);

    let currentMessages = messages;

    // Only insert new user message if not retrying an existing message
    if (!existingUserMsgId) {
      const userMsgId = await insertMessage(chatId, 'user', text);
      const userMsg: ChatMessage = {
        id: userMsgId,
        chat_id: chatId,
        role: 'user',
        content: text,
        chart_json: null,
        created_at: Date.now(),
      };

      currentMessages = [...messages, userMsg];
      setMessages(currentMessages);

      // Update title if it was "New chat"
      if (chatTitle === 'New chat' || messages.length === 0) {
        const newTitle = text.slice(0, 40);
        setChatTitle(newTitle);
        await updateChatTitle(chatId, newTitle);
      }
    }

    setIsLoading(true);

    try {
      // 2. Call AI engine with tool loop
      const aiReply = await sendChatMessage(text, currentMessages);

      if (aiReply.canRetry) {
        // Rule 125: Do not save failed attempts as assistant messages. Keep the user's message so Retry resends it.
        setFailedMessageIndex(currentMessages.length - 1);
        return;
      }

      // 3. Save assistant message when successful
      const chartJsonStr = aiReply.chartSnapshot
        ? JSON.stringify(aiReply.chartSnapshot)
        : null;

      const assistantMsgId = await insertMessage(
        chatId,
        'assistant',
        aiReply.text,
        chartJsonStr
      );

      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        chat_id: chatId,
        role: 'assistant',
        content: aiReply.text,
        chart_json: chartJsonStr,
        created_at: Date.now(),
      };

      setMessages([...currentMessages, assistantMsg]);
    } catch (err: any) {
      // Rule 125: On failure, keep user's message with Retry button, do not save error assistant message
      setFailedMessageIndex(currentMessages.length - 1);
    } finally {
      setIsLoading(false);
    }
  };

  // Retry sending failed user message without duplicating it in DB
  const handleRetry = (msg: ChatMessage) => {
    handleSend(msg.content, msg.id);
  };

  // Delete chat
  const handleDeleteChat = () => {
    Alert.alert('Delete Chat', 'Are you sure you want to delete this chat?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteChat(chatId);
          router.back();
        },
      },
    ]);
  };

  const renderMessageItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.role === 'user';
    const isFailed = isUser && failedMessageIndex === index;

    return (
      <View style={[styles.messageWrapper, isUser ? styles.userWrapper : styles.assistantWrapper]}>
        {!isUser && (
          <View style={[styles.avatarCircle, { backgroundColor: `${colors.primary}18` }]}>
            <Text style={styles.pandaAvatar}>🐼</Text>
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, { backgroundColor: colors.primary }]
              : [
                  styles.assistantBubble,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ],
          ]}
        >
          <Text
            style={[
              typography.body,
              { color: isUser ? '#FFFFFF' : colors.text },
            ]}
          >
            {item.content}
          </Text>

          {/* Render inline chart if snapshot exists */}
          {item.chart_json && <ChatChartView snapshotJson={item.chart_json} />}

          {/* Persistent Retry button on failed user message */}
          {isFailed && (
            <Pressable
              onPress={() => handleRetry(item)}
              style={[styles.retryBtn, { backgroundColor: `${colors.card}30` }]}
            >
              <Ionicons name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
                Retry
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.screenPadding, borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <Text style={[typography.title, { color: colors.text, fontSize: 17 }]} numberOfLines={1}>
              {chatTitle}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
              Panda Money Helper
            </Text>
          </View>

          <Pressable onPress={handleDeleteChat} hitSlop={12}>
            <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Offline Banner */}
        {isOffline && (
          <View style={[styles.offlineBanner, { backgroundColor: colors.warning }]}>
            <Ionicons name="cloud-offline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
              You are offline. Connect to internet to chat with Panda.
            </Text>
          </View>
        )}

        {/* Message Feed */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessageItem}
          contentContainerStyle={[styles.messagesContent, { paddingHorizontal: spacing.screenPadding }]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            messages.length <= 1 ? (
              <View style={styles.suggestionsContainer}>
                <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8 }]}>
                  SUGGESTED QUESTIONS
                </Text>
                <View style={styles.chipsWrap}>
                  {SUGGESTIONS.map((s, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => handleSend(s)}
                      style={[
                        styles.suggestionChip,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[typography.caption, { color: colors.text }]}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : undefined
          }
          ListFooterComponent={
            isLoading ? (
              <View style={styles.thinkingWrapper}>
                <View style={[styles.avatarCircle, { backgroundColor: `${colors.primary}18` }]}>
                  <Text style={styles.pandaAvatar}>🐼</Text>
                </View>
                <View style={[styles.thinkingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[typography.caption, { color: colors.textMuted, fontStyle: 'italic' }]}>
                    Panda is analyzing your spending...
                  </Text>
                </View>
              </View>
            ) : undefined
          }
        />

        {/* Bottom Input Field */}
        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask Panda about your money..."
            placeholderTextColor={colors.textMuted}
            style={[styles.textInput, typography.body, { color: colors.text }]}
            multiline
            maxLength={300}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
          />

          <Pressable
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() && !isLoading ? colors.primary : colors.cardAlt,
              },
            ]}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={inputText.trim() && !isLoading ? '#FFFFFF' : colors.textMuted}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 14,
    gap: 12,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  assistantWrapper: {
    justifyContent: 'flex-start',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  pandaAvatar: {
    fontSize: 18,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  suggestionsContainer: {
    marginBottom: 16,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thinkingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
