import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAppTheme, ThemeColors } from '../../context/ThemeContext';

const CATEGORIES: Record<'credit' | 'debit', string[]> = {
  debit: ['Food', 'Transportation', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Other'],
  credit: ['Salary', 'Freelance', 'Investment', 'Gift', 'Refund', 'Other'],
};

interface ReviewTransaction {
  date: string;
  description?: string;
  category: string;
  type: 'credit' | 'debit';
  amount: number;
  [key: string]: any;
}

interface Props {
  isOpen: boolean;
  transactions: ReviewTransaction[];
  onConfirm: (transactions: ReviewTransaction[]) => void;
  onClose: () => void;
  loading: boolean;
}

const UploadReviewModal = ({ isOpen, transactions: initialTransactions, onConfirm, onClose, loading }: Props) => {
  const { C } = useAppTheme();
  const [transactions, setTransactions] = useState<ReviewTransaction[]>(initialTransactions || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<ReviewTransaction>>({});

  useEffect(() => {
    setTransactions(initialTransactions || []);
    setEditingIndex(null);
  }, [initialTransactions]);

  const summary = useMemo(() => {
    const totalCredits = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalDebits = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
    return { count: transactions.length, totalCredits, totalDebits };
  }, [transactions]);

  const handleDelete = (index: number) => {
    setTransactions(prev => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleEditStart = (index: number) => {
    setEditingIndex(index);
    setEditData({ ...transactions[index] });
  };

  const handleEditSave = () => {
    if (editingIndex === null) return;
    setTransactions(prev => prev.map((t, i) => i === editingIndex
      ? { ...editData as ReviewTransaction, amount: parseFloat(String(editData.amount)) || 0 }
      : t));
    setEditingIndex(null);
    setEditData({});
  };

  const handleEditCancel = () => { setEditingIndex(null); setEditData({}); };

  const handleConfirm = () => { if (transactions.length > 0) onConfirm(transactions); };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Review Transactions</Text>
              <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>Edit or remove before importing.</Text>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={onClose} disabled={loading}>
              <Feather name="x" size={22} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }}>
            <View style={styles.summaryContainer}>
              <View style={[styles.summaryCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>Transactions</Text>
                <Text style={[styles.summaryValue, { color: C.textPrimary }]}>{summary.count}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>Credits</Text>
                <Text style={[styles.summaryValue, { color: C.green }]}>+₹{summary.totalCredits.toLocaleString()}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>Debits</Text>
                <Text style={[styles.summaryValue, { color: C.red }]}>-₹{summary.totalDebits.toLocaleString()}</Text>
              </View>
            </View>

            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ color: C.textMuted }}>All transactions have been removed.</Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {transactions.map((t, index) => (
                  <View key={index} style={[styles.listItem, { backgroundColor: C.card, borderColor: C.border }]}>
                    {editingIndex === index ? (
                      <View style={styles.editForm}>
                        <TextInput style={[styles.input, { color: C.textPrimary, borderColor: C.border }]} value={editData.date} onChangeText={(val) => setEditData({ ...editData, date: val })} placeholder="Date" placeholderTextColor={C.textMuted} />
                        <TextInput style={[styles.input, { color: C.textPrimary, borderColor: C.border }]} value={editData.description} onChangeText={(val) => setEditData({ ...editData, description: val })} placeholder="Description" placeholderTextColor={C.textMuted} />
                        <View style={styles.editRow}>
                          <TextInput style={[styles.input, { flex: 1, color: C.textPrimary, borderColor: C.border }]} value={editData.amount?.toString()} onChangeText={(val) => setEditData({ ...editData, amount: val as any })} keyboardType="numeric" placeholder="Amount" placeholderTextColor={C.textMuted} />
                          <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: editData.type === 'credit' ? C.green + '22' : C.red + '22', borderColor: editData.type === 'credit' ? C.green : C.red }]} onPress={() => setEditData({ ...editData, type: editData.type === 'credit' ? 'debit' : 'credit' })}>
                             <Text style={{ color: editData.type === 'credit' ? C.green : C.red, fontWeight: '600' }}>{editData.type === 'credit' ? 'Income' : 'Expense'}</Text>
                          </TouchableOpacity>
                        </View>
                        <TextInput style={[styles.input, { color: C.textPrimary, borderColor: C.border }]} value={editData.category} onChangeText={(val) => setEditData({ ...editData, category: val })} placeholder="Category" placeholderTextColor={C.textMuted} />
                        
                        <View style={styles.editActions}>
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.primary }]} onPress={handleEditSave}>
                            <Feather name="check" size={16} color="#fff" />
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.textMuted }]} onPress={handleEditCancel}>
                            <Feather name="x" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.viewRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.date, { color: C.textMuted }]}>{t.date}</Text>
                          <Text style={[styles.desc, { color: C.textPrimary }]} numberOfLines={1}>{t.description || '—'}</Text>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                            <View style={[styles.badge, { backgroundColor: C.primary + '22' }]}><Text style={{ color: C.primary, fontSize: 11 }}>{t.category}</Text></View>
                            <View style={[styles.badge, { backgroundColor: t.type === 'credit' ? C.green + '22' : C.red + '22' }]}><Text style={{ color: t.type === 'credit' ? C.green : C.red, fontSize: 11 }}>{t.type === 'credit' ? 'Income' : 'Expense'}</Text></View>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                          <Text style={[styles.amount, { color: t.type === 'credit' ? C.green : C.red }]}>{t.type === 'credit' ? '+' : '-'}₹{Math.abs(t.amount).toLocaleString()}</Text>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => handleEditStart(index)}><Feather name="edit-3" size={18} color={C.textSecondary} /></TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(index)}><Feather name="trash-2" size={18} color={C.red} /></TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: C.card, borderTopColor: C.border }]}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn, { borderColor: C.border }]} onPress={onClose} disabled={loading}>
              <Text style={{ color: C.textPrimary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.confirmBtn, { backgroundColor: C.primary, opacity: (loading || transactions.length === 0) ? 0.6 : 1 }]} onPress={handleConfirm} disabled={loading || transactions.length === 0}>
              {loading ? <ActivityIndicator color="#fff" /> : <><Feather name="upload-cloud" size={18} color="#fff" /><Text style={{ color: '#fff', fontWeight: '600' }}>Import {transactions.length}</Text></>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  iconBtn: { padding: 8 },
  summaryContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  summaryCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  emptyState: { padding: 32, alignItems: 'center' },
  listContainer: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  listItem: { padding: 16, borderRadius: 12, borderWidth: 1 },
  viewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  date: { fontSize: 12, marginBottom: 2 },
  desc: { fontSize: 15, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  amount: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  editForm: { gap: 10 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  editRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8, borderWidth: 1 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  actionBtn: { padding: 8, borderRadius: 8 },
  footer: { padding: 16, borderTopWidth: 1, flexDirection: 'row', gap: 12 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  cancelBtn: { borderWidth: 1 },
  confirmBtn: {},
});

export default UploadReviewModal;
