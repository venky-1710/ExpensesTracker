import React, { useState, useEffect } from 'react';
import { FiPlus, FiFilter, FiDownload } from 'react-icons/fi';
import { transactionService } from '../services/transactionService';
import TransactionModal from '../components/TransactionModal/TransactionModal';
import './Transactions.css';

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });

    useEffect(() => {
        fetchTransactions();
    }, [pagination.page]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const response = await transactionService.getTransactions({
                page: pagination.page,
                limit: pagination.limit,
                sort_by: 'date',
                sort_order: 'desc'
            });

            setTransactions(response.transactions || []);
            setPagination(prev => ({
                ...prev,
                total: response.total || 0,
                totalPages: response.total_pages || 0
            }));
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTransactionSuccess = () => {
        // Refresh transaction list
        fetchTransactions();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
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
                    <button className="secondary-btn" onClick={() => alert('Export coming soon!')}>
                        <FiDownload size={18} />
                        Export
                    </button>
                    <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
                        <FiPlus size={18} />
                        Add Transaction
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading transactions...</p>
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
                    <h3>No Transactions Yet</h3>
                    <p>Start tracking your finances by adding your first transaction.</p>
                    <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
                        <FiPlus size={18} />
                        Add Your First Transaction
                    </button>
                </div>
            )}

            {/* Transaction Modal */}
            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleTransactionSuccess}
            />
        </div>
    );
};

export default Transactions;

