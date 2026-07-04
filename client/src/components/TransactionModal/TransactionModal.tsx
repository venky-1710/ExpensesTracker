import React, { useState, useEffect } from 'react';
import { FiX, FiCheck } from 'react-icons/fi';
import { transactionService } from '../../services/transactionService';
import './TransactionModal.css';
import type { Transaction } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  transaction?: Transaction | null;
}

interface FormData {
  amount: string;
  type: 'credit' | 'debit';
  category: string;
  payment_method: string;
  description: string;
  date: string;
}

const CATEGORIES: Record<'credit' | 'debit', string[]> = {
  debit:  ['Food', 'Transportation', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'License', 'Other'],
  credit: ['Salary', 'Freelance', 'Investment', 'Gift', 'Refund', 'Other'],
};

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'UPI', 'Wallet', 'Other'];

const TransactionModal = ({ isOpen, onClose, onSuccess, transaction = null }: Props) => {
  const { user } = useAuth();
  const isEditMode = !!transaction;

  const getInitialFormData = (): FormData => ({
    amount:         transaction ? String(transaction.amount) : '',
    type:           (transaction?.type as 'credit' | 'debit') ?? 'debit',
    category:       transaction?.category ?? '',
    payment_method: transaction?.payment_method ?? '',
    description:    transaction?.description ?? '',
    date:           transaction
                      ? new Date(transaction.date).toISOString().split('T')[0]
                      : new Date().toISOString().split('T')[0],
  });

  const [formData, setFormData] = useState<FormData>(getInitialFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setErrors({});
      setSubmitError('');
    }
  }, [isOpen, transaction]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (!formData.category?.trim()) newErrors.category = 'Category is required';
    else if (formData.category.length > 50) newErrors.category = 'Category must be 50 characters or less';
    if (!formData.payment_method?.trim()) newErrors.payment_method = 'Payment method is required';
    else if (formData.payment_method.length > 50) newErrors.payment_method = 'Payment method must be 50 characters or less';
    if (!formData.date) newErrors.date = 'Date is required';
    if (formData.description && formData.description.length > 500) newErrors.description = 'Description must be 500 characters or less';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      const transactionData = {
        amount: parseFloat(formData.amount),
        type: formData.type,
        category: formData.category.trim(),
        payment_method: formData.payment_method.trim(),
        description: formData.description.trim() || null,
        date: new Date(formData.date).toISOString(),
      };
      if (isEditMode && transaction) {
        await transactionService.updateTransaction(transaction.id, transactionData);
      } else {
        await transactionService.createTransaction(transactionData);
      }
      onSuccess?.();
      onClose();
    } catch (error: any) {
      setSubmitError(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} transaction. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) { setErrors({}); setSubmitError(''); onClose(); }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditMode ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <button className="close-btn" onClick={handleClose} disabled={loading}><FiX size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="transaction-form">
          {submitError && <div className="error-banner">{submitError}</div>}

          <div className="form-group">
            <label>Transaction Type *</label>
            <div className="type-selector">
              <button type="button" className={`type-btn ${formData.type === 'debit' ? 'active debit' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, type: 'debit', category: '' }))} disabled={loading}>Expense</button>
              <button type="button" className={`type-btn ${formData.type === 'credit' ? 'active credit' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, type: 'credit', category: '' }))} disabled={loading}>Income</button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount *</label>
            <input type="number" id="amount" name="amount" value={formData.amount} onChange={handleChange} placeholder="0.00" step="0.01" min="0.01" disabled={loading} className={errors.amount ? 'error' : ''} />
            {errors.amount && <span className="error-text">{errors.amount}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <input 
              type="text" 
              id="category" 
              name="category" 
              list="category-options" 
              value={formData.category} 
              onChange={handleChange} 
              disabled={loading} 
              placeholder="Select or type a category" 
              className={errors.category ? 'error' : ''} 
              autoComplete="off"
            />
            <datalist id="category-options">
              {Array.from(new Set([...CATEGORIES[formData.type], ...(user?.custom_categories || [])])).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </datalist>
            {errors.category && <span className="error-text">{errors.category}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="payment_method">Payment Method *</label>
            <input 
              type="text" 
              id="payment_method" 
              name="payment_method" 
              list="payment-method-options" 
              value={formData.payment_method} 
              onChange={handleChange} 
              disabled={loading} 
              placeholder="Select or type a method" 
              className={errors.payment_method ? 'error' : ''} 
              autoComplete="off"
            />
            <datalist id="payment-method-options">
              {Array.from(new Set([...PAYMENT_METHODS, ...(user?.custom_payment_methods || [])])).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </datalist>
            {errors.payment_method && <span className="error-text">{errors.payment_method}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="date">Date *</label>
            <input type="date" id="date" name="date" value={formData.date} onChange={handleChange} disabled={loading} className={errors.date ? 'error' : ''} />
            {errors.date && <span className="error-text">{errors.date}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder="Add notes or details..." rows={3} maxLength={500} disabled={loading} className={errors.description ? 'error' : ''} />
            <div className="char-count">{formData.description.length}/500</div>
            {errors.description && <span className="error-text">{errors.description}</span>}
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={handleClose} disabled={loading}><FiX size={18} />Cancel</button>
            <button type="submit" className="submit-btn" disabled={loading}>
              <FiCheck size={18} />
              {loading ? (isEditMode ? 'Saving...' : 'Adding...') : (isEditMode ? 'Save Changes' : 'Add Transaction')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
