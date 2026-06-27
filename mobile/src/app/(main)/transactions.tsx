import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { transactionService } from '../../services/transactionService';
import Toast from 'react-native-toast-message';
import { useAppTheme, ThemeColors } from '../../context/ThemeContext';

// Theme is loaded dynamically from ThemeContext

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Bills', 'Salary', 'Investment', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'];

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

  // Filter state
  const [filterType, setFilterType] = useState<'' | 'credit' | 'debit'>('');

  // Modal state
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

  const renderItem = ({ item }: { item: any }) => (
    <View style={s.txRow}>
      <View style={[s.txTypeBadge, { backgroundColor: item.type === 'credit' ? '#10b98118' : '#ef444418' }]}>
        <Text style={[s.txTypeText, { color: item.type === 'credit' ? '#10b981' : '#ef4444' }]}>
          {item.type === 'credit' ? '↑' : '↓'}
        </Text>
      </View>
      <View style={s.txInfo}>
        <Text style={s.txCategory}>{item.category}</Text>
        <Text style={s.txDesc} numberOfLines={1}>{item.description || 'No description'}</Text>
        <Text style={s.txMeta}>{formatDate(item.date)} · {item.payment_method}</Text>
      </View>
      <View style={s.txRight}>
        <Text style={[s.txAmount, { color: item.type === 'credit' ? '#10b981' : '#ef4444' }]}>
          {item.type === 'credit' ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
        <View style={s.txActions}>
          <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}>
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(item)}>
            <Text style={s.delBtnText}>Del</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Transactions</Text>
          <Text style={s.subtitle}>Manage your income & expenses</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Text style={s.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.summaryScroll} contentContainerStyle={s.summaryRow}>
        {[
          { label: 'Credits', value: formatCurrency(summary.totalCredits), color: '#10b981' },
          { label: 'Debits', value: formatCurrency(summary.totalDebits), color: '#ef4444' },
          { label: 'Balance', value: formatCurrency(summary.availableBalance), color: '#6d4aff' },
        ].map(c => (
          <View key={c.label} style={[s.summaryCard, { borderTopColor: c.color }]}>
            <Text style={s.summaryLabel}>{c.label}</Text>
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
          >
            <Text style={[s.filterChipText, filterType === f && s.filterChipTextActive]}>
              {f === '' ? 'All' : f === 'credit' ? 'Credits' : 'Debits'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#6d4aff" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6d4aff" />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>💳</Text>
              <Text style={s.emptyTitle}>No transactions found</Text>
              <Text style={s.emptyText}>Tap + New to add your first transaction</Text>
            </View>
          }
          ListFooterComponent={page < totalPages ? <ActivityIndicator color="#6d4aff" style={{ marginVertical: 16 }} /> : null}
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editing ? 'Edit Transaction' : 'New Transaction'}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody}>
              {/* Type Toggle */}
              <Text style={s.formLabel}>Type</Text>
              <View style={s.typeRow}>
                {(['credit', 'debit'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.typeBtn, form.type === t && {
                      backgroundColor: t === 'credit' ? '#10b981' : '#ef4444',
                      borderColor: t === 'credit' ? '#10b981' : '#ef4444',
                    }]}
                    onPress={() => setForm({ ...form, type: t })}
                  >
                    <Text style={[s.typeBtnText, form.type === t && { color: '#fff' }]}>
                      {t === 'credit' ? '↑ Credit' : '↓ Debit'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <Text style={s.formLabel}>Amount (₹)</Text>
              <TextInput
                style={s.formInput}
                placeholder="0.00"
                placeholderTextColor="#475569"
                value={form.amount}
                onChangeText={v => setForm({ ...form, amount: v })}
                keyboardType="numeric"
              />

              {/* Category */}
              <Text style={s.formLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {CATEGORIES.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[s.chipSmall, form.category === c && s.chipSmallActive]}
                      onPress={() => setForm({ ...form, category: c })}
                    >
                      <Text style={[s.chipSmallText, form.category === c && s.chipSmallTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Description */}
              <Text style={s.formLabel}>Description</Text>
              <TextInput
                style={s.formInput}
                placeholder="Optional notes"
                placeholderTextColor="#475569"
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
                    >
                      <Text style={[s.chipSmallText, form.payment_method === m && s.chipSmallTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Date */}
              <Text style={s.formLabel}>Date</Text>
              <TextInput
                style={s.formInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#475569"
                value={form.date}
                onChangeText={v => setForm({ ...form, date: v })}
              />

              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.saveBtnText}>{editing ? 'Update Transaction' : 'Add Transaction'}</Text>
                }
              </TouchableOpacity>
              <View style={{ height: 32 }} />
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
    backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  summaryScroll: { maxHeight: 90 },
  summaryRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  summaryCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    borderTopWidth: 3, borderWidth: 1, borderColor: C.border, minWidth: 120,
  },
  summaryLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },

  filterScroll: { maxHeight: 50 },
  filterRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center', paddingBottom: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterChipText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },

  txRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: C.bg, gap: 12,
  },
  txTypeBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txTypeText: { fontSize: 20, fontWeight: '800' },
  txInfo: { flex: 1 },
  txCategory: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  txDesc: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  txMeta: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 6 },
  txAmount: { fontSize: 15, fontWeight: '800' },
  txActions: { flexDirection: 'row', gap: 6 },
  editBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border,
  },
  editBtnText: { color: C.textSecondary, fontSize: 11, fontWeight: '600' },
  delBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, borderWidth: 1, borderColor: C.red,
  },
  delBtnText: { color: C.red, fontSize: 11, fontWeight: '600' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center' },

  overlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%', borderTopWidth: 1, borderColor: 'rgba(109,74,255,0.2)',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 20,
    borderBottomWidth: 1, borderColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  modalClose: { fontSize: 18, color: C.textMuted },
  modalBody: { paddingHorizontal: 24, paddingTop: 16 },

  formLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 8, letterSpacing: 0.3 },
  formInput: {
    backgroundColor: C.inputBg, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 14, color: C.textPrimary, fontSize: 15, marginBottom: 16,
  },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderRadius: 12, borderWidth: 2, borderColor: C.border, backgroundColor: C.inputBg,
  },
  typeBtnText: { fontSize: 15, fontWeight: '700', color: C.textMuted },
  chipSmall: {
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
