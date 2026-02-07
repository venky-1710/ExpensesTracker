import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { transactionService } from '../../services/transactionService';
import './TransactionModal.css';

const TransactionModal = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        amount: '',
        type: 'debit',
        category: '',
        payment_method: '',
        description: '',
        date: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // Common categories for quick selection
    const categories = {
        debit: ['Food', 'Transportation', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Other'],
        credit: ['Salary', 'Freelance', 'Investment', 'Gift', 'Refund', 'Other']
    };

    const paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'UPI', 'Wallet', 'Other'];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            newErrors.amount = 'Amount must be greater than 0';
        }

        if (!formData.category || formData.category.trim().length === 0) {
            newErrors.category = 'Category is required';
        } else if (formData.category.length > 50) {
            newErrors.category = 'Category must be 50 characters or less';
        }

        if (!formData.payment_method || formData.payment_method.trim().length === 0) {
            newErrors.payment_method = 'Payment method is required';
        } else if (formData.payment_method.length > 50) {
            newErrors.payment_method = 'Payment method must be 50 characters or less';
        }

        if (!formData.date) {
            newErrors.date = 'Date is required';
        }

        if (formData.description && formData.description.length > 500) {
            newErrors.description = 'Description must be 500 characters or less';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // Format data for API
            const transactionData = {
                amount: parseFloat(formData.amount),
                type: formData.type,
                category: formData.category.trim(),
                payment_method: formData.payment_method.trim(),
                description: formData.description.trim() || null,
                date: new Date(formData.date).toISOString()
            };

            await transactionService.createTransaction(transactionData);

            // Reset form
            setFormData({
                amount: '',
                type: 'debit',
                category: '',
                payment_method: '',
                description: '',
                date: new Date().toISOString().split('T')[0]
            });

            // Call success callback
            if (onSuccess) {
                onSuccess();
            }

            // Close modal
            onClose();
        } catch (error) {
            console.error('Failed to create transaction:', error);
            setSubmitError(error.response?.data?.message || 'Failed to create transaction. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setFormData({
                amount: '',
                type: 'debit',
                category: '',
                payment_method: '',
                description: '',
                date: new Date().toISOString().split('T')[0]
            });
            setErrors({});
            setSubmitError('');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add Transaction</h2>
                    <button className="close-btn" onClick={handleClose} disabled={loading}>
                        <FiX size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="transaction-form">
                    {submitError && (
                        <div className="error-banner">
                            {submitError}
                        </div>
                    )}

                    {/* Type Selection */}
                    <div className="form-group">
                        <label htmlFor="type">Transaction Type *</label>
                        <div className="type-selector">
                            <button
                                type="button"
                                className={`type-btn ${formData.type === 'debit' ? 'active debit' : ''}`}
                                onClick={() => setFormData(prev => ({ ...prev, type: 'debit', category: '' }))}
                                disabled={loading}
                            >
                                Expense
                            </button>
                            <button
                                type="button"
                                className={`type-btn ${formData.type === 'credit' ? 'active credit' : ''}`}
                                onClick={() => setFormData(prev => ({ ...prev, type: 'credit', category: '' }))}
                                disabled={loading}
                            >
                                Income
                            </button>
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="form-group">
                        <label htmlFor="amount">Amount *</label>
                        <input
                            type="number"
                            id="amount"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            placeholder="0.00"
                            step="0.01"
                            min="0.01"
                            disabled={loading}
                            className={errors.amount ? 'error' : ''}
                        />
                        {errors.amount && <span className="error-text">{errors.amount}</span>}
                    </div>

                    {/* Category */}
                    <div className="form-group">
                        <label htmlFor="category">Category *</label>
                        <select
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            disabled={loading}
                            className={errors.category ? 'error' : ''}
                        >
                            <option value="">Select a category</option>
                            {categories[formData.type].map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        {errors.category && <span className="error-text">{errors.category}</span>}
                    </div>

                    {/* Payment Method */}
                    <div className="form-group">
                        <label htmlFor="payment_method">Payment Method *</label>
                        <select
                            id="payment_method"
                            name="payment_method"
                            value={formData.payment_method}
                            onChange={handleChange}
                            disabled={loading}
                            className={errors.payment_method ? 'error' : ''}
                        >
                            <option value="">Select payment method</option>
                            {paymentMethods.map(method => (
                                <option key={method} value={method}>{method}</option>
                            ))}
                        </select>
                        {errors.payment_method && <span className="error-text">{errors.payment_method}</span>}
                    </div>

                    {/* Date */}
                    <div className="form-group">
                        <label htmlFor="date">Date *</label>
                        <input
                            type="date"
                            id="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            max={new Date().toISOString().split('T')[0]}
                            disabled={loading}
                            className={errors.date ? 'error' : ''}
                        />
                        {errors.date && <span className="error-text">{errors.date}</span>}
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label htmlFor="description">Description (Optional)</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Add notes or details about this transaction..."
                            rows="3"
                            maxLength="500"
                            disabled={loading}
                            className={errors.description ? 'error' : ''}
                        />
                        <div className="char-count">
                            {formData.description.length}/500
                        </div>
                        {errors.description && <span className="error-text">{errors.description}</span>}
                    </div>

                    {/* Form Actions */}
                    <div className="form-actions">
                        <button
                            type="button"
                            className="cancel-btn"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={loading}
                        >
                            {loading ? 'Adding...' : 'Add Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransactionModal;
