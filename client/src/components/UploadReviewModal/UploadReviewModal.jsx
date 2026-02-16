import React, { useState, useMemo } from 'react';
import { FiX, FiTrash2, FiEdit3, FiCheck, FiXCircle, FiUploadCloud } from 'react-icons/fi';
import './UploadReviewModal.css';

const CATEGORIES = {
    debit: ['Food', 'Transportation', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Other'],
    credit: ['Salary', 'Freelance', 'Investment', 'Gift', 'Refund', 'Other']
};

const UploadReviewModal = ({ isOpen, transactions: initialTransactions, onConfirm, onClose, loading }) => {
    const [transactions, setTransactions] = useState(initialTransactions || []);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editData, setEditData] = useState({});

    // Sync when new data arrives
    React.useEffect(() => {
        setTransactions(initialTransactions || []);
        setEditingIndex(null);
    }, [initialTransactions]);

    const summary = useMemo(() => {
        const totalCredits = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0);
        const totalDebits = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
        return { count: transactions.length, totalCredits, totalDebits };
    }, [transactions]);

    const handleDelete = (index) => {
        setTransactions(prev => prev.filter((_, i) => i !== index));
        if (editingIndex === index) setEditingIndex(null);
    };

    const handleEditStart = (index) => {
        setEditingIndex(index);
        setEditData({ ...transactions[index] });
    };

    const handleEditSave = () => {
        if (editingIndex === null) return;
        setTransactions(prev => prev.map((t, i) => i === editingIndex ? { ...editData, amount: parseFloat(editData.amount) || 0 } : t));
        setEditingIndex(null);
        setEditData({});
    };

    const handleEditCancel = () => {
        setEditingIndex(null);
        setEditData({});
    };

    const handleConfirm = () => {
        if (transactions.length > 0) {
            onConfirm(transactions);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="review-overlay" onClick={onClose}>
            <div className="review-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="review-header">
                    <div>
                        <h2>Review Extracted Transactions</h2>
                        <p className="review-subtitle">Edit or remove transactions before importing.</p>
                    </div>
                    <button className="review-close-btn" onClick={onClose} disabled={loading}>
                        <FiX size={22} />
                    </button>
                </div>

                {/* Summary Bar */}
                <div className="review-summary">
                    <div className="summary-item">
                        <span className="summary-label">Transactions</span>
                        <span className="summary-value">{summary.count}</span>
                    </div>
                    <div className="summary-item credit">
                        <span className="summary-label">Total Credits</span>
                        <span className="summary-value">+₹{summary.totalCredits.toLocaleString()}</span>
                    </div>
                    <div className="summary-item debit">
                        <span className="summary-label">Total Debits</span>
                        <span className="summary-value">-₹{summary.totalDebits.toLocaleString()}</span>
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="review-table-wrapper">
                    {transactions.length === 0 ? (
                        <div className="review-empty">
                            <p>All transactions have been removed.</p>
                        </div>
                    ) : (
                        <table className="review-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th>Category</th>
                                    <th>Type</th>
                                    <th>Amount (₹)</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t, index) => (
                                    editingIndex === index ? (
                                        <tr key={index} className="editing-row">
                                            <td>{index + 1}</td>
                                            <td>
                                                <input
                                                    type="date"
                                                    className="review-input"
                                                    value={editData.date || ''}
                                                    onChange={(e) => setEditData(d => ({ ...d, date: e.target.value }))}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="review-input"
                                                    value={editData.description || ''}
                                                    onChange={(e) => setEditData(d => ({ ...d, description: e.target.value }))}
                                                />
                                            </td>
                                            <td>
                                                <select
                                                    className="review-input"
                                                    value={editData.category || ''}
                                                    onChange={(e) => setEditData(d => ({ ...d, category: e.target.value }))}
                                                >
                                                    {CATEGORIES[editData.type || 'debit'].map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <select
                                                    className="review-input"
                                                    value={editData.type || 'debit'}
                                                    onChange={(e) => setEditData(d => ({ ...d, type: e.target.value }))}
                                                >
                                                    <option value="debit">Expense</option>
                                                    <option value="credit">Income</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="review-input amount-input"
                                                    value={editData.amount || ''}
                                                    step="0.01"
                                                    min="0"
                                                    onChange={(e) => setEditData(d => ({ ...d, amount: e.target.value }))}
                                                />
                                            </td>
                                            <td>
                                                <div className="row-actions">
                                                    <button className="action-btn save" onClick={handleEditSave} title="Save"><FiCheck size={16} /></button>
                                                    <button className="action-btn cancel" onClick={handleEditCancel} title="Cancel"><FiXCircle size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>{t.date}</td>
                                            <td className="desc-cell">{t.description || '—'}</td>
                                            <td><span className="category-badge">{t.category}</span></td>
                                            <td><span className={`type-badge ${t.type}`}>{t.type === 'credit' ? 'Income' : 'Expense'}</span></td>
                                            <td className={`amount-cell ${t.type}`}>
                                                {t.type === 'credit' ? '+' : '-'}₹{Math.abs(t.amount).toLocaleString()}
                                            </td>
                                            <td>
                                                <div className="row-actions">
                                                    <button className="action-btn edit" onClick={() => handleEditStart(index)} title="Edit"><FiEdit3 size={15} /></button>
                                                    <button className="action-btn delete" onClick={() => handleDelete(index)} title="Delete"><FiTrash2 size={15} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="review-footer">
                    <button className="review-cancel-btn" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <button
                        className="review-confirm-btn"
                        onClick={handleConfirm}
                        disabled={loading || transactions.length === 0}
                    >
                        <FiUploadCloud size={18} />
                        {loading ? 'Importing...' : `Confirm & Import ${transactions.length} Transaction${transactions.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadReviewModal;
