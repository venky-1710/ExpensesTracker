import React, { useState, useEffect } from 'react';
import { FiPlus, FiDownload, FiChevronDown, FiTrash2, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { transactionService } from '../services/transactionService';
import { useDashboard } from '../context/DashboardContext';
import TransactionModal from '../components/TransactionModal/TransactionModal';
import ActionButtons from '../components/ActionButtons/ActionButtons';
import SubLoader from '../components/SubLoader/SubLoader';
import DateFilter from '../components/DateFilter/DateFilter';
import TransactionFilters from '../components/TransactionFilters/TransactionFilters';
import type { Transaction, DateFilterState, TransactionFiltersState } from '../types';

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  totalCredits: number;
  totalDebits: number;
  availableBalance: number;
}

interface DeleteModalState {
  open: boolean;
  transaction: Transaction | null;
  loading: boolean;
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({ open: false, transaction: null, loading: false });

  const { dateFilter, setDateFilter } = useDashboard();
  const [filters, setFilters] = useState<TransactionFiltersState>({ type: '', category: '', payment_method: '' });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1, limit: 20, total: 0, totalPages: 0, totalCredits: 0, totalDebits: 0, availableBalance: 0
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => { fetchTransactions(); }, [pagination.page, dateFilter, filters, sortOrder]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: pagination.page, limit: pagination.limit,
        sort_by: 'date', sort_order: sortOrder,
        filter_type: dateFilter.type,
        start_date: dateFilter.startDate, end_date: dateFilter.endDate,
        ...filters
      };
      Object.keys(params).forEach(key => { if (params[key] === '' || params[key] === null) delete params[key]; });
      const response = await transactionService.getTransactions(params);
      setTransactions(response.transactions || []);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0, totalPages: response.total_pages || 0,
        totalCredits: response.total_credits || 0, totalDebits: response.total_debits || 0,
        availableBalance: response.available_balance || 0
      }));
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally { setLoading(false); }
  };

  const handleExport = async (format: string) => {
    try {
      const params: Record<string, any> = {
        format, filter_type: dateFilter.type,
        start_date: dateFilter.startDate, end_date: dateFilter.endDate, ...filters
      };
      Object.keys(params).forEach(key => { if (params[key] === '' || params[key] === null) delete params[key]; });
      const blob = await transactionService.exportTransactions(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export transactions');
    }
  };

  const handleTransactionSuccess = () => { fetchTransactions(); setEditingTransaction(null); };
  const handleEdit = (transaction: Transaction) => { setEditingTransaction(transaction); setIsModalOpen(true); };
  const handleDeleteClick = (transaction: Transaction) => setDeleteModal({ open: true, transaction, loading: false });

  const handleDeleteConfirm = async () => {
    if (!deleteModal.transaction) return;
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      await transactionService.deleteTransaction(deleteModal.transaction!.id);
      setDeleteModal({ open: false, transaction: null, loading: false });
      fetchTransactions();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction. Please try again.');
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteCancel = () => { if (!deleteModal.loading) setDeleteModal({ open: false, transaction: null, loading: false }); };
  const handleModalClose = () => { setIsModalOpen(false); setEditingTransaction(null); };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="max-w-[1400px] mx-auto pb-10">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="m-0 text-2xl font-bold text-gray-900 dark:text-gray-100">Transactions</h1>
          <p className="m-0 mt-1 text-sm text-gray-500">Manage your income and expenses</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <DateFilter currentFilter={dateFilter} onFilterChange={setDateFilter} />
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm cursor-pointer" onClick={() => setShowExportMenu(!showExportMenu)}>
              <FiDownload size={18} /> Export <FiChevronDown />
            </button>
            {showExportMenu && (
              <div className="absolute top-full right-0 mt-2 min-w-[160px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden py-1">
                <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 bg-transparent border-none cursor-pointer transition-colors" onClick={() => handleExport('csv')}>Export as CSV</button>
                <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 bg-transparent border-none cursor-pointer transition-colors" onClick={() => handleExport('xlsx')}>Export as Excel</button>
                <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 bg-transparent border-none cursor-pointer transition-colors" onClick={() => handleExport('pdf')}>Export as PDF</button>
              </div>
            )}
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer border-none" onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}>
            <FiPlus size={16} /> New Transaction
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 flex flex-col gap-2">
          <div className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Total Credits</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">+₹{pagination.totalCredits?.toLocaleString('en-IN') || '0'}</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-2xl border border-red-100 dark:border-red-800/30 flex flex-col gap-2">
          <div className="text-sm font-medium text-red-700 dark:text-red-400">Total Debits</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-500">-₹{pagination.totalDebits?.toLocaleString('en-IN') || '0'}</div>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 flex flex-col gap-2">
          <div className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Available Balance</div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-500">₹{pagination.availableBalance?.toLocaleString('en-IN') || '0'}</div>
        </div>
      </div>

      <div className="mb-6">
        <TransactionFilters filters={filters} onFilterChange={setFilters} />
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <SubLoader />
        </div>
      ) : transactions.length > 0 ? (
        <>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden mb-6 overflow-x-auto">
            <div className="grid grid-cols-[120px_1fr_2fr_1.5fr_120px_100px] gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[800px]">
              <div className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 select-none flex items-center gap-1" onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}>
                Date {sortOrder === 'desc' ? <FiArrowDown size={14} /> : <FiArrowUp size={14} />}
              </div>
              <div>Category</div>
              <div>Description</div>
              <div>Payment Method</div>
              <div className="text-right">Amount</div>
              <div className="text-center">Actions</div>
            </div>
            <div className="flex flex-col min-w-[800px]">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="grid grid-cols-[120px_1fr_2fr_1.5fr_120px_100px] gap-4 p-4 items-center border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="text-sm text-gray-500">{formatDate(transaction.date)}</div>
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${transaction.type === 'credit' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {transaction.category}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{transaction.description || 'No description'}</div>
                  <div className="text-sm text-gray-500 truncate">{transaction.payment_method}</div>
                  <div className={`text-right text-sm font-bold ${transaction.type === 'credit' ? 'text-emerald-500' : 'text-gray-900 dark:text-gray-100'}`}>
                    {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                  </div>
                  <div className="flex justify-center">
                    <ActionButtons onEdit={() => handleEdit(transaction)} onDelete={() => handleDeleteClick(transaction)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1}>Previous</button>
              <span className="text-sm text-gray-500 font-medium">Page {pagination.page} of {pagination.totalPages}</span>
              <button className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page === pagination.totalPages}>Next</button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-20 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="text-5xl mb-4">💰</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 m-0">No Transactions Found</h3>
          <p className="text-gray-500 m-0 mb-6 text-sm">Try adjusting your filters or add a new transaction.</p>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer border-none" onClick={() => setIsModalOpen(true)}>
            <FiPlus size={18} /> Add New Transaction
          </button>
        </div>
      )}

      <TransactionModal isOpen={isModalOpen} onClose={handleModalClose} onSuccess={handleTransactionSuccess} transaction={editingTransaction} />

      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm animate-fade-in" onClick={handleDeleteCancel}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-[400px] rounded-2xl shadow-xl p-7 flex flex-col items-center text-center animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center mb-4"><FiTrash2 size={24} /></div>
            <h3 className="m-0 mb-2 text-xl font-bold text-gray-900 dark:text-white">Delete Transaction</h3>
            <p className="m-0 text-sm text-gray-500 dark:text-gray-400 mb-2">Are you sure you want to delete this <strong>{deleteModal.transaction?.type}</strong> transaction of <strong>{formatCurrency(deleteModal.transaction?.amount || 0)}</strong>?</p>
            <p className="m-0 text-sm text-red-500 font-medium mb-6">This action cannot be undone.</p>
            <div className="flex gap-3 w-full">
              <button className="flex-1 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-pointer" onClick={handleDeleteCancel} disabled={deleteModal.loading}>Cancel</button>
              <button className="flex-1 py-2.5 bg-red-500 text-white border-none rounded-lg text-sm font-semibold hover:bg-red-600 shadow-sm transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed" onClick={handleDeleteConfirm} disabled={deleteModal.loading}>
                {deleteModal.loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
