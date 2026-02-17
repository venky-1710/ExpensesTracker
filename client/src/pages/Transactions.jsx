import React, { useState, useEffect } from 'react';
import { FiPlus, FiDownload, FiChevronDown, FiTrash2 } from 'react-icons/fi';
import { transactionService } from '../services/transactionService';
import TransactionModal from '../components/TransactionModal/TransactionModal';
import ActionButtons from '../components/ActionButtons/ActionButtons';
import SubLoader from '../components/SubLoader/SubLoader';
import DateFilter from '../components/DateFilter/DateFilter';
import TransactionFilters from '../components/TransactionFilters/TransactionFilters';
import './Transactions.css';

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Delete confirmation state
    const [deleteModal, setDeleteModal] = useState({ open: false, transaction: null, loading: false });

    // Filters State
    const [dateFilter, setDateFilter] = useState({
        type: 'all',
        startDate: null,
        endDate: null
    });

    const [filters, setFilters] = useState({
        type: '',
        category: '',
        payment_method: ''
    });

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        totalCredits: 0,
        totalDebits: 0,
        availableBalance: 0
    });

    useEffect(() => {
        fetchTransactions();
    }, [pagination.page, dateFilter, filters]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                sort_by: 'date',
                sort_order: 'desc',
                filter_type: dateFilter.type,
                start_date: dateFilter.startDate,
                end_date: dateFilter.endDate,
                ...filters
            };

            // Clean empty filters
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null) {
                    delete params[key];
                }
            });

            const response = await transactionService.getTransactions(params);

            setTransactions(response.transactions || []);
            setPagination(prev => ({
                ...prev,
                total: response.total || 0,
                totalPages: response.total_pages || 0,
                totalCredits: response.total_credits || 0,
                totalDebits: response.total_debits || 0,
                availableBalance: response.available_balance || 0
            }));
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format) => {
        try {
            const params = {
                format,
                filter_type: dateFilter.type,
                start_date: dateFilter.startDate,
                end_date: dateFilter.endDate,
                ...filters
            };

            // Clean params
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null) {
                    delete params[key];
                }
            });

            const blob = await transactionService.exportTransactions(params);

            // Create download link
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

    const handleTransactionSuccess = () => {
        fetchTransactions();
        setEditingTransaction(null);
    };

    const handleEdit = (transaction) => {
        setEditingTransaction(transaction);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (transaction) => {
        setDeleteModal({ open: true, transaction, loading: false });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteModal.transaction) return;

        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
            await transactionService.deleteTransaction(deleteModal.transaction.id);
            setDeleteModal({ open: false, transaction: null, loading: false });
            fetchTransactions();
        } catch (error) {
            console.error('Failed to delete transaction:', error);
            alert('Failed to delete transaction. Please try again.');
            setDeleteModal(prev => ({ ...prev, loading: false }));
        }
    };

    const handleDeleteCancel = () => {
        if (!deleteModal.loading) {
            setDeleteModal({ open: false, transaction: null, loading: false });
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingTransaction(null);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="transactions-page">
            <div className="page-header">
                <div>
                    <h1>Transactions</h1>
                    <p className="subtitle">Manage your income and expenses</p>
                </div>
                <div className="header-actions">
                    <div className="export-wrapper">
                        <button
                            className="secondary-btn"
                            onClick={() => setShowExportMenu(!showExportMenu)}
                        >
                            <FiDownload size={18} />
                            Export
                            <FiChevronDown />
                        </button>
                        {showExportMenu && (
                            <div className="export-menu">
                                <button onClick={() => handleExport('csv')}>Export as CSV</button>
                                <button onClick={() => handleExport('xlsx')}>Export as Excel</button>
                                <button onClick={() => handleExport('pdf')}>Export as PDF</button>
                            </div>
                        )}
                    </div>

                    <button className="primary-btn" onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}>
                        <FiPlus size={18} />
                        Add Transaction
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="transaction-summary-cards">
                <div className="summary-card credit">
                    <div className="summary-label">Total Credits</div>
                    <div className="summary-value">+₹{pagination.totalCredits?.toLocaleString() || '0'}</div>
                </div>
                <div className="summary-card debit">
                    <div className="summary-label">Total Debits</div>
                    <div className="summary-value">-₹{pagination.totalDebits?.toLocaleString() || '0'}</div>
                </div>
                <div className="summary-card balance">
                    <div className="summary-label">Available Balance</div>
                    <div className="summary-value">₹{pagination.availableBalance?.toLocaleString() || '0'}</div>
                </div>
            </div>

            {/* Filters Section */}
            <div className="filters-section">
                <DateFilter currentFilter={dateFilter} onFilterChange={setDateFilter} />
                <TransactionFilters filters={filters} onFilterChange={setFilters} />
            </div>

            {loading ? (
                <div className="loading-container">
                    <SubLoader />
                </div>
            ) : transactions.length > 0 ? (
                <>
                    <div className="transactions-table">
                        <div className="table-header">
                            <div className="th-date">Date</div>
                            <div className="th-category">Category</div>
                            <div className="th-description">Description</div>
                            <div className="th-payment">Payment Method</div>
                            <div className="th-amount">Amount</div>
                            <div className="th-actions">Actions</div>
                        </div>
                        <div className="table-body">
                            {transactions.map((transaction) => (
                                <div key={transaction.id} className="transaction-row">
                                    <div className="td-date">{formatDate(transaction.date)}</div>
                                    <div className="td-category">
                                        <span className={`category-badge ${transaction.type}`}>
                                            {transaction.category}
                                        </span>
                                    </div>
                                    <div className="td-description">
                                        {transaction.description || 'No description'}
                                    </div>
                                    <div className="td-payment">{transaction.payment_method}</div>
                                    <div className={`td-amount ${transaction.type}`}>
                                        {transaction.type === 'credit' ? '+' : '-'}
                                        {formatCurrency(Math.abs(transaction.amount))}
                                    </div>
                                    <div className="td-actions">
                                        <ActionButtons
                                            onEdit={() => handleEdit(transaction)}
                                            onDelete={() => handleDeleteClick(transaction)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {pagination.totalPages > 1 && (
                        <div className="pagination">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                disabled={pagination.page === 1}
                                className="pagination-btn"
                            >
                                Previous
                            </button>
                            <span className="pagination-info">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                disabled={pagination.page === pagination.totalPages}
                                className="pagination-btn"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="content-placeholder">
                    <div className="placeholder-icon">💰</div>
                    <h3>No Transactions Found</h3>
                    <p>Try adjusting your filters or add a new transaction.</p>
                    <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
                        <FiPlus size={18} />
                        Add New Transaction
                    </button>
                </div>
            )}

            {/* Transaction Modal (Create/Edit) */}
            <TransactionModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSuccess={handleTransactionSuccess}
                transaction={editingTransaction}
            />

            {/* Delete Confirmation Modal */}
            {deleteModal.open && (
                <div className="modal-overlay" onClick={handleDeleteCancel}>
                    <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-icon">
                            <FiTrash2 size={28} />
                        </div>
                        <h3>Delete Transaction</h3>
                        <p>
                            Are you sure you want to delete this <strong>{deleteModal.transaction?.type}</strong> transaction
                            of <strong>{formatCurrency(deleteModal.transaction?.amount)}</strong>?
                        </p>
                        <p className="delete-warning">This action cannot be undone.</p>
                        <div className="delete-modal-actions">
                            <button
                                className="cancel-btn"
                                onClick={handleDeleteCancel}
                                disabled={deleteModal.loading}
                            >
                                Cancel
                            </button>
                            <button
                                className="confirm-delete-btn"
                                onClick={handleDeleteConfirm}
                                disabled={deleteModal.loading}
                            >
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
