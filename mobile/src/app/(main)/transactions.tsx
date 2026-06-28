import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { transactionService } from '../../services/transactionService';
import Toast from 'react-native-toast-message';
import { useAppTheme, ThemeColors } from '../../context/ThemeContext';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Bills', 'Salary', 'Investment', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'];

const CATEGORY_ICONS: Record<string, string> = {
  Food: 'coffee', Transport: 'truck', Shopping: 'shopping-bag',
  Entertainment: 'film', Health: 'heart', Bills: 'file-text',
  Salary: 'briefcase', Investment: 'trending-up', Other: 'circle',
};

const formatCurrency = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const today = () => new Date().toISOString().split('T')[0];

const BLANK_FORM = {
  type: 'debit' as 'credit' | 'debit',
  amount: '',
  category: 'Other',
  description: '',
  payment_method: 'Cash',
  date: today(),
};

export default function TransactionsScreen() {
  const { C } = useAppTheme();
  const s = getStyles(C);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ totalCredits: 0, totalDebits: 0, availableBalance: 0 });

  const [filterType, setFilterType] = useState<'' | 'credit' | 'debit'>('');

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async (pg = 1, reset = false) => {
    try {
      const params: any = { page: pg, limit: 20, sort_by: 'date', sort_order: 'desc' };
      if (filterType) params.type = filterType;
      const res = await transactionService.getTransactions(params);
      const txs = res.transactions || [];
      setTransactions(prev => reset ? txs : [...prev, ...txs]);
      setTotalPages(res.total_pages || 1);
      setSummary({
        totalCredits: res.total_credits || 0,
        totalDebits: res.total_debits || 0,
        availableBalance: res.available_balance || 0,
      });
    } catch (e) {
      console.error('Fetch transactions error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterType]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetch(1, true);
  }, [fetch]);

  const onRefresh = () => { setRefreshing(true); setPage(1); fetch(1, true); };

  const loadMore = () => {
    if (page < totalPages && !loading) {
      const next = page + 1;
      setPage(next);
      fetch(next, false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...BLANK_FORM });
    setModal(true);
  };

  const openEdit = (tx: any) => {
    setEditing(tx);
    setForm({
      type: tx.type,
      amount: String(tx.amount),
      category: tx.category,
      description: tx.description || '',
      payment_method: tx.payment_method || 'Cash',
      date: tx.date?.split('T')[0] || today(),
    });
    setModal(true);
  };

  const closeModal = () => { setModal(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.amount || isNaN(Number(form.amount))) {
      Toast.show({ type: 'error', text1: 'Invalid amount', text2: 'Please enter a valid number' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (editing) {
        await transactionService.updateTransaction(editing.id, payload);
        Toast.show({ type: 'success', text1: 'Updated!', text2: 'Transaction updated successfully' });
      } else {
        await transactionService.createTransaction(payload);
        Toast.show({ type: 'success', text1: 'Added!', text2: 'Transaction added successfully' });
      }
      closeModal();
      fetch(1, true);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.detail || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (tx: any) => {
    Alert.alert(
      'Delete Transaction',
      `Delete ${tx.type} of ${formatCurrency(tx.amount)}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await transactionService.deleteTransaction(tx.id);
              Toast.show({ type: 'success', text1: 'Deleted', text2: 'Transaction removed' });
              fetch(1, true);
            } catch {
              Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to delete' });
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isCredit = item.type === 'credit';
    const catIcon = (CATEGORY_ICONS[item.category] || 'circle') as any;
    return (
      <View style={s.txRow}>
        <View style={[s.txIconBadge, { backgroundColor: isCredit ? '#10b98118' : '#ef444418' }]}>
          <Feather name={catIcon} size={16} color={isCredit ? '#10b981' : '#ef4444'} />
        </View>
        <View style={s.txInfo}>
          <Text style={s.txCategory}>{item.category}</Text>
          <Text style={s.txDesc} numberOfLines={1}>{item.description || 'No description'}</Text>
          <View style={s.txMetaRow}>
            <Feather name="clock" size={10} color={C.textMuted} />
            <Text style={s.txMeta}>{formatDate(item.date)}</Text>
            <Text style={s.txMetaDot}>·</Text>
            <Feather name="credit-card" size={10} color={C.textMuted} />
            <Text style={s.txMeta}>{item.payment_method}</Text>
          </View>
        </View>
        <View style={s.txRight}>
          <Text style={[s.txAmount, { color: isCredit ? '#10b981' : '#ef4444' }]}>
            {isCredit ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
          <View style={s.txActions}>
            <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(item)} activeOpacity={0.7}>
              <Feather name="edit-2" size={13} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtnDanger} onPress={() => handleDelete(item)} activeOpacity={0.7}>
              <Feather name="trash-2" size={13} color={C.red} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Transactions</Text>
          <Text style={s.subtitle}>Manage your income & expenses</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openCreate} activeOpacity={0.8}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={s.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.summaryScroll} contentContainerStyle={s.summaryRow}>
        {[
          { label: 'Credits', value: formatCurrency(summary.totalCredits), color: '#10b981', icon: 'trending-up' },
          { label: 'Debits', value: formatCurrency(summary.totalDebits), color: '#ef4444', icon: 'trending-down' },
          { label: 'Balance', value: formatCurrency(summary.availableBalance), color: '#6d4aff', icon: 'dollar-sign' },
        ].map(c => (
          <View key={c.label} style={[s.summaryCard, { borderTopColor: c.color }]}>
            <View style={s.summaryCardTop}>
              <View style={[s.summaryIconBox, { backgroundColor: c.color + '18' }]}>
                <Feather name={c.icon as any} size={14} color={c.color} />
              </View>
              <Text style={s.summaryLabel}>{c.label}</Text>
            </View>
            <Text style={[s.summaryValue, { color: c.color }]}>{c.value}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
        {(['', 'credit', 'debit'] as const).map(f => (
          <TouchableOpacity
            key={f || 'all'}
            style={[s.filterChip, filterType === f && s.filterChipActive]}
            onPress={() => setFilterType(f)}
            activeOpacity={0.7}
          >
            {f !== '' && (
              <Feather
                name={f === 'credit' ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={filterType === f ? '#fff' : C.textMuted}
              />
            )}
            <Text style={[s.filterChipText, filterType === f && s.filterChipTextActive]}>
              {f === '' ? 'All' : f === 'credit' ? 'Credits' : 'Debits'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconBox}>
                <Feather name="credit-card" size={28} color={C.textMuted} />
              </View>
              <Text style={s.emptyTitle}>No transactions found</Text>
              <Text style={s.emptyText}>Tap + New to add your first transaction</Text>
            </View>
          }
          ListFooterComponent={page < totalPages ? <ActivityIndicator color={C.primary} style={{ marginVertical: 16 }} /> : null}
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            {/* Drag handle */}
            <View style={s.dragHandle} />
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>{editing ? 'Edit Transaction' : 'New Transaction'}</Text>
                <Text style={s.modalSubtitle}>{editing ? 'Update the details below' : 'Fill in the details below'}</Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={closeModal}>
                <Feather name="x" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              {/* Type Toggle */}
              <Text style={s.formLabel}>Transaction Type</Text>
              <View style={s.typeRow}>
                {(['credit', 'debit'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.typeBtn, form.type === t && {
                      backgroundColor: t === 'credit' ? '#10b981' : '#ef4444',
                      borderColor: t === 'credit' ? '#10b981' : '#ef4444',
                    }]}
                    onPress={() => setForm({ ...form, type: t })}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={t === 'credit' ? 'arrow-up-circle' : 'arrow-down-circle'}
                      size={16}
                      color={form.type === t ? '#fff' : C.textMuted}
                    />
                    <Text style={[s.typeBtnText, form.type === t && { color: '#fff' }]}>
                      {t === 'credit' ? 'Credit' : 'Debit'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <Text style={s.formLabel}>Amount (₹)</Text>
              <View style={s.inputRow}>
                <View style={s.inputPrefix}>
                  <Text style={s.inputPrefixText}>₹</Text>
                </View>
                <TextInput
                  style={[s.formInput, s.inputWithPrefix]}
                  placeholder="0.00"
                  placeholderTextColor={C.textMuted}
                  value={form.amount}
                  onChangeText={v => setForm({ ...form, amount: v })}
                  keyboardType="numeric"
                />
              </View>

              {/* Category */}
              <Text style={s.formLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {CATEGORIES.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[s.chipSmall, form.category === c && s.chipSmallActive]}
                      onPress={() => setForm({ ...form, category: c })}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={(CATEGORY_ICONS[c] || 'circle') as any}
                        size={12}
                        color={form.category === c ? '#fff' : C.textMuted}
                      />
                      <Text style={[s.chipSmallText, form.category === c && s.chipSmallTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Description */}
              <Text style={s.formLabel}>Description</Text>
              <TextInput
                style={[s.formInput, { minHeight: 72, textAlignVertical: 'top' }]}
                placeholder="Optional notes..."
                placeholderTextColor={C.textMuted}
                value={form.description}
                onChangeText={v => setForm({ ...form, description: v })}
                multiline
                numberOfLines={2}
              />

              {/* Payment Method */}
              <Text style={s.formLabel}>Payment Method</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {PAYMENT_METHODS.map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[s.chipSmall, form.payment_method === m && s.chipSmallActive]}
                      onPress={() => setForm({ ...form, payment_method: m })}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.chipSmallText, form.payment_method === m && s.chipSmallTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Date */}
              <Text style={s.formLabel}>Date</Text>
              <View style={s.inputRow}>
                <View style={s.inputIconLeft}>
                  <Feather name="calendar" size={16} color={C.textMuted} />
                </View>
                <TextInput
                  style={[s.formInput, s.inputWithIcon]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={C.textMuted}
                  value={form.date}
                  onChangeText={v => setForm({ ...form, date: v })}
                />
              </View>

              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name={editing ? 'check-circle' : 'plus-circle'} size={18} color="#fff" />
                      <Text style={s.saveBtnText}>{editing ? 'Update Transaction' : 'Add Transaction'}</Text>
                    </View>
                  )
                }
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '800', color: C.textPrimary },
  subtitle: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  summaryScroll: { maxHeight: 96 },
  summaryRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  summaryCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    borderTopWidth: 3, borderWidth: 1, borderColor: C.border, minWidth: 130,
    gap: 6,
  },
  summaryCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryIconBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 18, fontWeight: '800' },

  filterScroll: { maxHeight: 52 },
  filterRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center', paddingBottom: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterChipText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },

  txRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: C.border,
    backgroundColor: C.bg, gap: 12,
  },
  txIconBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txCategory: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  txDesc: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  txMetaDot: { color: C.textMuted, fontSize: 10 },
  txMeta: { fontSize: 11, color: C.textMuted },
  txRight: { alignItems: 'flex-end', gap: 8 },
  txAmount: { fontSize: 15, fontWeight: '800' },
  txActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnDanger: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.red + '18',
    alignItems: 'center', justifyContent: 'center',
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center' },

  overlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '92%', borderTopWidth: 1, borderColor: 'rgba(109,74,255,0.2)',
  },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 24, paddingVertical: 16,
    borderBottomWidth: 1, borderColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  modalSubtitle: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.border + '60',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBody: { paddingHorizontal: 24, paddingTop: 20 },

  formLabel: { fontSize: 12, fontWeight: '700', color: C.textSecondary, marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  formInput: {
    backgroundColor: C.inputBg, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 14, color: C.textPrimary, fontSize: 15, marginBottom: 20,
  },

  inputRow: { position: 'relative', justifyContent: 'center', marginBottom: 0 },
  inputPrefix: {
    position: 'absolute', left: 16, zIndex: 1,
  },
  inputPrefixText: {
    fontSize: 16, fontWeight: '700', color: C.textSecondary,
  },
  inputIconLeft: {
    position: 'absolute', left: 16, zIndex: 1,
  },
  inputWithPrefix: { paddingLeft: 36 },
  inputWithIcon: { paddingLeft: 46 },

  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  typeBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, borderWidth: 2, borderColor: C.border, backgroundColor: C.inputBg,
    flexDirection: 'row', gap: 8,
  },
  typeBtnText: { fontSize: 15, fontWeight: '700', color: C.textMuted },
  chipSmall: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.inputBg,
  },
  chipSmallActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipSmallText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  chipSmallTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
