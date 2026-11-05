import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { useTheme } from '../src/theme';
import { useDataStore } from '../src/store/dataStore';
import { getCategories, Category } from '../src/db/categories';
import {
  insertTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionById,
} from '../src/db/transactions';
import { toPaise, paiseToRupees } from '../src/utils/money';
import {
  getTodayDateString,
  formatDisplayDate,
  isDateInFuture,
} from '../src/utils/dates';

export default function AddTransactionScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? parseInt(params.id, 10) : undefined;
  const isEditing = editId !== undefined && !isNaN(editId);

  const bumpDataVersion = useDataStore((s) => s.bumpDataVersion);

  // Form State
  const [type, setType] = useState<'in' | 'out'>('out');
  const [amountStr, setAmountStr] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [dateStr, setDateStr] = useState(getTodayDateString());
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  // Keyboard and Scroll management
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const isNoteFocusedRef = useRef(false);

  // Submitting state with double-tap guard
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Keyboard listener to keep focused note field visible
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      if (isNoteFocusedRef.current) {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Load categories and transaction data (if editing)
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const cats = await getCategories({ includeHidden: false });
        if (!isMounted) return;
        setCategories(cats);

        if (isEditing && editId) {
          const tx = await getTransactionById(editId);
          if (tx && isMounted) {
            setType(tx.type);
            setAmountStr(paiseToRupees(tx.amount).toString());
            setSelectedCategoryId(tx.category_id);
            setNote(tx.note || '');
            setDateStr(tx.date);

            const [y, m, d] = tx.date.split('-').map(Number);
            setPickerDate(new Date(y, m - 1, d));

            // If transaction's category is hidden, preserve it for selection
            if (tx.category_hidden === 1) {
              setEditingCategory({
                id: tx.category_id,
                name: tx.category_name,
                type: tx.type,
                icon: tx.category_icon,
                color: tx.category_color,
                sort_order: 999,
                hidden: 1,
              });
            }
          }
        } else {
          // New transaction: default to first 'out' category
          const firstOut = cats.find((c) => c.type === 'out');
          if (firstOut) {
            setSelectedCategoryId(firstOut.id);
          }
        }
      } catch (err) {
        console.error('Failed to load transaction data:', err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [editId, isEditing]);

  // Filter categories by selected type ('in' or 'out')
  const visibleCategories = useMemo(() => {
    const filtered = categories.filter((c) => c.type === type);
    // Include hidden category if editing an old transaction that uses it
    if (editingCategory && editingCategory.type === type) {
      const exists = filtered.some((c) => c.id === editingCategory.id);
      if (!exists) {
        return [editingCategory, ...filtered];
      }
    }
    return filtered;
  }, [categories, type, editingCategory]);

  // When type changes, ensure valid category selection
  const handleTypeChange = (newType: 'in' | 'out') => {
    setType(newType);
    const matching = categories.filter((c) => c.type === newType);
    if (matching.length > 0) {
      setSelectedCategoryId(matching[0].id);
    } else {
      setSelectedCategoryId(null);
    }
  };

  // Date picker handler
  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}`;

      if (isDateInFuture(formatted)) {
        Alert.alert('Invalid Date', 'Transactions cannot be set further than 1 day in the future.');
        return;
      }
      setPickerDate(selectedDate);
      setDateStr(formatted);
    }
  };

  // Quick date presets
  const setQuickDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;

    setPickerDate(d);
    setDateStr(formatted);
  };

  // Form validation
  const amountNumber = parseFloat(amountStr);
  const isValidAmount = !isNaN(amountNumber) && amountNumber > 0;
  const canSave = isValidAmount && selectedCategoryId !== null && !isSubmitting;

  // Save handler with synchronous double-tap block and error recovery
  const handleSave = async () => {
    if (!canSave || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const amountPaise = toPaise(amountNumber);

      if (isEditing && editId) {
        await updateTransaction(editId, {
          type,
          amount: amountPaise,
          category_id: selectedCategoryId!,
          note,
          date: dateStr,
        });
      } else {
        await insertTransaction({
          type,
          amount: amountPaise,
          category_id: selectedCategoryId!,
          note,
          date: dateStr,
        });
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      bumpDataVersion();
      router.back();
    } catch (err: any) {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      Alert.alert('Error', err.message || 'Failed to save transaction.');
    }
  };

  // Delete handler
  const handleDelete = () => {
    if (!isEditing || !editId) return;

    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to permanently delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(editId);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              bumpDataVersion();
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete transaction.');
            }
          },
        },
      ]
    );
  };

  const isToday = dateStr === getTodayDateString();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={isKeyboardVisible ? ['top'] : ['top', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.screenPadding, borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>

          <Text style={[typography.title, { color: colors.text }]}>
            {isEditing ? 'Edit Transaction' : 'Add Transaction'}
          </Text>

          {isEditing ? (
            <Pressable
              onPress={handleDelete}
              hitSlop={12}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="trash-outline" size={22} color={colors.expense} />
            </Pressable>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: spacing.screenPadding,
              paddingBottom: isKeyboardVisible ? 36 : 16,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          {/* Segmented Type Toggle */}
          <View style={[styles.typeToggleContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable
              onPress={() => handleTypeChange('out')}
              style={[
                styles.typeButton,
                type === 'out' && { backgroundColor: colors.expense },
              ]}
            >
              <Ionicons
                name="arrow-up-circle-outline"
                size={18}
                color={type === 'out' ? '#FFFFFF' : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: type === 'out' ? '#FFFFFF' : colors.textMuted,
                    fontWeight: type === 'out' ? '700' : '500',
                    fontSize: 14,
                  },
                ]}
              >
                Money out
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleTypeChange('in')}
              style={[
                styles.typeButton,
                type === 'in' && { backgroundColor: colors.income },
              ]}
            >
              <Ionicons
                name="arrow-down-circle-outline"
                size={18}
                color={type === 'in' ? '#FFFFFF' : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: type === 'in' ? '#FFFFFF' : colors.textMuted,
                    fontWeight: type === 'in' ? '700' : '500',
                    fontSize: 14,
                  },
                ]}
              >
                Money in
              </Text>
            </Pressable>
          </View>

          {/* Big Amount Input */}
          <View style={[styles.amountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8 }]}>
              {type === 'out' ? 'AMOUNT SPENT' : 'AMOUNT RECEIVED'}
            </Text>
            <View style={styles.amountRow}>
              <Text style={[typography.bigNumber, { color: type === 'out' ? colors.expense : colors.income }]}>
                ₹
              </Text>
              <TextInput
                value={amountStr}
                onChangeText={(val) => {
                  // Only allow digits and at most one decimal point with 2 decimals
                  if (/^\d*\.?\d{0,2}$/.test(val)) {
                    setAmountStr(val);
                  }
                }}
                onFocus={() => {
                  isNoteFocusedRef.current = false;
                  scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                }}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                autoFocus={!isEditing}
                style={[
                  typography.bigNumber,
                  styles.amountInput,
                  { color: type === 'out' ? colors.expense : colors.income },
                ]}
              />
            </View>
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
              CATEGORY
            </Text>
            <View style={styles.chipsContainer}>
              {visibleCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? cat.color : colors.card,
                        borderColor: isSelected ? cat.color : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={16}
                      color={isSelected ? '#FFFFFF' : cat.color}
                      style={{ marginRight: 6 }}
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
                      {cat.hidden === 1 ? ' (archived)' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Date Selector */}
          <View style={styles.section}>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
              DATE
            </Text>
            <View style={styles.dateRow}>
              <Pressable
                onPress={() => setQuickDate(0)}
                style={[
                  styles.quickDateButton,
                  {
                    backgroundColor: isToday ? colors.primary : colors.card,
                    borderColor: isToday ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: isToday ? '#FFFFFF' : colors.text, fontWeight: isToday ? '700' : '500' },
                  ]}
                >
                  Today
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setQuickDate(1)}
                style={[
                  styles.quickDateButton,
                  {
                    backgroundColor:
                      dateStr ===
                      new Date(Date.now() - 86400000).toISOString().split('T')[0]
                        ? colors.primary
                        : colors.card,
                    borderColor:
                      dateStr ===
                      new Date(Date.now() - 86400000).toISOString().split('T')[0]
                        ? colors.primary
                        : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color:
                        dateStr ===
                        new Date(Date.now() - 86400000).toISOString().split('T')[0]
                          ? '#FFFFFF'
                          : colors.text,
                      fontWeight:
                        dateStr ===
                        new Date(Date.now() - 86400000).toISOString().split('T')[0]
                          ? '700'
                          : '500',
                    },
                  ]}
                >
                  Yesterday
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[
                  styles.customDateButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>
                  {formatDisplayDate(dateStr, { showTodayText: true })}
                </Text>
              </Pressable>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="default"
                maximumDate={new Date(Date.now() + 86400000)}
                onChange={onDateChange}
              />
            )}
          </View>

          {/* Note Input */}
          <View style={styles.section}>
            <View style={styles.noteHeader}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                NOTE (OPTIONAL)
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {note.length}/200
              </Text>
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              maxLength={200}
              placeholder="e.g. Chai, metro recharge, snacks..."
              placeholderTextColor={colors.textMuted}
              onFocus={() => {
                isNoteFocusedRef.current = true;
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
              onBlur={() => {
                isNoteFocusedRef.current = false;
              }}
              onContentSizeChange={() => {
                if (isNoteFocusedRef.current) {
                  scrollViewRef.current?.scrollToEnd({ animated: false });
                }
              }}
              scrollEnabled={false}
              style={[
                styles.noteInput,
                typography.body,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              multiline
              numberOfLines={2}
            />
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={[styles.footer, { paddingHorizontal: spacing.screenPadding, borderTopColor: colors.border }]}>
          <Pressable
            onPress={handleSave}
            disabled={!canSave || isSubmitting}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: canSave && !isSubmitting ? colors.primary : colors.cardAlt,
                borderRadius: radius.button,
                opacity: pressed && canSave && !isSubmitting ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[
                typography.title,
                {
                  color: canSave && !isSubmitting ? '#FFFFFF' : colors.textMuted,
                  fontSize: 16,
                  fontWeight: '600',
                },
              ]}
            >
              {isEditing ? 'Update Transaction' : 'Save Transaction'}
            </Text>
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  typeToggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  amountCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
    alignItems: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInput: {
    marginLeft: 6,
    minWidth: 120,
    textAlign: 'center',
    paddingVertical: 0,
  },
  section: {
    marginBottom: 20,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  quickDateButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  customDateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteInput: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  footer: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
