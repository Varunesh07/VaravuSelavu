import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import {
  Category,
  getCategories,
  createCategory,
  updateCategory,
  hideCategory,
  unhideCategory,
  deleteCategory,
  getCategoryTransactionCount,
} from '../db/categories';
import { useDataStore } from '../store/dataStore';

interface CategoryManagerModalProps {
  visible: boolean;
  onClose: () => void;
}

const COLOR_PALETTE = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#64748B', // Slate
];

const ICON_PALETTE = [
  'fast-food-outline',
  'bus-outline',
  'phone-portrait-outline',
  'cart-outline',
  'film-outline',
  'home-outline',
  'school-outline',
  'fitness-outline',
  'medkit-outline',
  'cash-outline',
  'briefcase-outline',
  'wallet-outline',
  'gift-outline',
  'airplane-outline',
  'bulb-outline',
  'car-outline',
];

export function CategoryManagerModal({ visible, onClose }: CategoryManagerModalProps) {
  const { colors, typography, radius, spacing } = useTheme();
  const bumpDataVersion = useDataStore((s) => s.bumpDataVersion);

  const [activeType, setActiveType] = useState<'out' | 'in'>('out');
  const [categories, setCategories] = useState<Category[]>([]);
  const [txCounts, setTxCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);

  // Edit category modal state
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  // Add category modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PALETTE[7]);
  const [newIcon, setNewIcon] = useState(ICON_PALETTE[0]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const all = await getCategories({ includeHidden: true });
      setCategories(all);

      const counts: Record<number, number> = {};
      await Promise.all(
        all.map(async (c) => {
          counts[c.id] = await getCategoryTransactionCount(c.id);
        })
      );
      setTxCounts(counts);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadAll();
    }
  }, [visible]);

  const filteredCategories = categories.filter((c) => c.type === activeType);

  // Open edit modal for category
  const handleOpenEdit = (cat: Category) => {
    setEditingCat(cat);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  // Save changes to category
  const handleSaveEdit = async () => {
    if (!editingCat) return;
    const cleanName = editName.trim();
    if (!cleanName) {
      Alert.alert('Empty Name', 'Category name cannot be empty.');
      return;
    }

    try {
      await updateCategory(editingCat.id, {
        name: cleanName,
        color: editColor,
      });
      setEditingCat(null);
      bumpDataVersion();
      loadAll();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update category.');
    }
  };

  // Toggle hide / unhide
  const handleToggleHide = async (cat: Category) => {
    try {
      if (cat.hidden === 1) {
        await unhideCategory(cat.id);
      } else {
        await hideCategory(cat.id);
      }
      bumpDataVersion();
      loadAll();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status.');
    }
  };

  // Delete category if unused
  const handleDeleteCategory = async (cat: Category) => {
    const count = txCounts[cat.id] || 0;
    if (count > 0) {
      Alert.alert(
        'Cannot Delete',
        `This category is used in ${count} transaction(s). You can hide it instead so it doesn't appear for new transactions.`
      );
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${cat.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteCategory(cat.id);
            if (res.success) {
              setEditingCat(null);
              bumpDataVersion();
              loadAll();
            } else {
              Alert.alert('Error', res.error || 'Failed to delete category.');
            }
          },
        },
      ]
    );
  };

  // Add new category
  const handleCreateNewCategory = async () => {
    const cleanName = newName.trim();
    if (!cleanName) {
      Alert.alert('Empty Name', 'Please enter a category name.');
      return;
    }

    try {
      await createCategory({
        name: cleanName,
        type: activeType,
        color: newColor,
        icon: newIcon,
        sort_order: categories.length + 1,
      });
      setShowAddModal(false);
      setNewName('');
      bumpDataVersion();
      loadAll();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Category already exists or invalid.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.mainCard, { backgroundColor: colors.card, borderRadius: radius.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[typography.title, { color: colors.text }]}>Categories</Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Rename, recolor, hide or create categories
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Type Switcher Tabs (Expenses / Income) */}
          <View style={[styles.typeTabs, { backgroundColor: colors.cardAlt }]}>
            <Pressable
              onPress={() => setActiveType('out')}
              style={[
                styles.typeTab,
                activeType === 'out' && { backgroundColor: colors.expense },
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: activeType === 'out' ? '#FFFFFF' : colors.textMuted,
                    fontWeight: activeType === 'out' ? '700' : '500',
                  },
                ]}
              >
                Expenses
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveType('in')}
              style={[
                styles.typeTab,
                activeType === 'in' && { backgroundColor: colors.income },
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: activeType === 'in' ? '#FFFFFF' : colors.textMuted,
                    fontWeight: activeType === 'in' ? '700' : '500',
                  },
                ]}
              >
                Income
              </Text>
            </Pressable>
          </View>

          {/* Category List */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
              {filteredCategories.map((cat) => {
                const count = txCounts[cat.id] || 0;
                const isHidden = cat.hidden === 1;

                return (
                  <View
                    key={cat.id}
                    style={[
                      styles.categoryRow,
                      { borderColor: colors.border },
                      isHidden && { opacity: 0.55 },
                    ]}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: cat.color }]}>
                      <Ionicons name={cat.icon as any} size={18} color="#FFFFFF" />
                    </View>

                    <View style={styles.catInfo}>
                      <View style={styles.nameRow}>
                        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                          {cat.name}
                        </Text>
                        {isHidden && (
                          <View style={[styles.hiddenBadge, { backgroundColor: colors.cardAlt }]}>
                            <Text style={[typography.caption, { color: colors.textMuted, fontSize: 9 }]}>
                              Archived
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
                        {count === 0 ? 'No transactions' : `${count} transaction${count > 1 ? 's' : ''}`}
                      </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.rowActions}>
                      <Pressable
                        onPress={() => handleToggleHide(cat)}
                        hitSlop={8}
                        style={styles.actionIconBtn}
                      >
                        <Ionicons
                          name={isHidden ? 'eye-outline' : 'eye-off-outline'}
                          size={18}
                          color={colors.textMuted}
                        />
                      </Pressable>

                      <Pressable
                        onPress={() => handleOpenEdit(cat)}
                        hitSlop={8}
                        style={styles.actionIconBtn}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.primary} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Add Category Button */}
          <Pressable
            onPress={() => setShowAddModal(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: radius.button }]}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '700' }]}>
              Add {activeType === 'out' ? 'Expense' : 'Income'} Category
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ----------------- Edit Category Modal ----------------- */}
      {editingCat && (
        <Modal visible transparent animationType="fade">
          <View style={styles.subModalOverlay}>
            <View style={[styles.subModalCard, { backgroundColor: colors.card, borderRadius: radius.card }]}>
              <Text style={[typography.title, { color: colors.text, marginBottom: 12 }]}>
                Edit Category
              </Text>

              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>
                NAME
              </Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                maxLength={30}
                placeholder="Category Name"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.textInput,
                  typography.body,
                  { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text },
                ]}
              />

              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 14, marginBottom: 8 }]}>
                COLOR
              </Text>
              <View style={styles.paletteRow}>
                {COLOR_PALETTE.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setEditColor(c)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      editColor === c && styles.selectedColorDot,
                    ]}
                  />
                ))}
              </View>

              <View style={styles.subModalBtnRow}>
                {txCounts[editingCat.id] === 0 ? (
                  <Pressable
                    onPress={() => handleDeleteCategory(editingCat)}
                    style={[styles.deleteSubBtn, { borderColor: colors.expense }]}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.expense} />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => {
                      handleToggleHide(editingCat);
                      setEditingCat(null);
                    }}
                    style={[styles.hideSubBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      {editingCat.hidden === 1 ? 'Unhide' : 'Hide'}
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => setEditingCat(null)}
                  style={[styles.cancelSubBtn, { borderColor: colors.border }]}
                >
                  <Text style={[typography.caption, { color: colors.text }]}>Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={handleSaveEdit}
                  style={[styles.saveSubBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ----------------- Add Category Modal ----------------- */}
      {showAddModal && (
        <Modal visible transparent animationType="fade">
          <View style={styles.subModalOverlay}>
            <View style={[styles.subModalCard, { backgroundColor: colors.card, borderRadius: radius.card }]}>
              <Text style={[typography.title, { color: colors.text, marginBottom: 12 }]}>
                New {activeType === 'out' ? 'Expense' : 'Income'} Category
              </Text>

              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>
                NAME
              </Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                maxLength={30}
                placeholder="e.g. Groceries, Fuel, Freelance..."
                placeholderTextColor={colors.textMuted}
                autoFocus
                style={[
                  styles.textInput,
                  typography.body,
                  { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text },
                ]}
              />

              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 12, marginBottom: 8 }]}>
                PICK COLOR
              </Text>
              <View style={styles.paletteRow}>
                {COLOR_PALETTE.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setNewColor(c)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      newColor === c && styles.selectedColorDot,
                    ]}
                  />
                ))}
              </View>

              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 12, marginBottom: 8 }]}>
                PICK ICON
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }}>
                <View style={styles.iconSelectRow}>
                  {ICON_PALETTE.map((ic) => (
                    <Pressable
                      key={ic}
                      onPress={() => setNewIcon(ic)}
                      style={[
                        styles.iconOption,
                        { borderColor: colors.border },
                        newIcon === ic && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
                      ]}
                    >
                      <Ionicons
                        name={ic as any}
                        size={18}
                        color={newIcon === ic ? colors.primary : colors.textMuted}
                      />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <View style={[styles.subModalBtnRow, { marginTop: 20 }]}>
                <Pressable
                  onPress={() => setShowAddModal(false)}
                  style={[styles.cancelSubBtn, { borderColor: colors.border }]}
                >
                  <Text style={[typography.caption, { color: colors.text }]}>Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={handleCreateNewCategory}
                  style={[styles.saveSubBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>Create</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  mainCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeTabs: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    marginBottom: 14,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  listScroll: {
    maxHeight: 380,
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  catInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hiddenBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    padding: 6,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 16,
  },
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  subModalCard: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
  },
  textInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  selectedColorDot: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  iconSelectRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  iconOption: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subModalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  deleteSubBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 'auto',
  },
  hideSubBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 'auto',
  },
  cancelSubBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  saveSubBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
