import React, { useState } from 'react';
import { FiFilter, FiUser, FiTag, FiCreditCard } from 'react-icons/fi';
import './TransactionFilters.css';

const TransactionFilters = ({ filters, onFilterChange }) => {
    const handleChange = (key, value) => {
        onFilterChange({ ...filters, [key]: value || null });
    };

    return (
        <div className="transaction-filters">
            <div className="filter-group">
                <div className="filter-icon"><FiUser /></div>
                <select
                    value={filters.type || ''}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Types</option>
                    <option value="credit">Income (Credit)</option>
                    <option value="debit">Expense (Debit)</option>
                </select>
            </div>

            <div className="filter-group">
                <div className="filter-icon"><FiTag /></div>
                <select
                    value={filters.category || ''}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Categories</option>
                    <option value="Food">Food</option>
                    <option value="Transport">Transport</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Health">Health</option>
                    <option value="Education">Education</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Other">Other</option>
                    <option value="Salary">Salary</option>
                    <option value="Investment">Investment</option>
                    <option value="Freelance">Freelance</option>
                </select>
            </div>

            <div className="filter-group">
                <div className="filter-icon"><FiCreditCard /></div>
                <select
                    value={filters.payment_method || ''}
                    onChange={(e) => handleChange('payment_method', e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Payment Methods</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                </select>
            </div>
        </div>
    );
};

export default TransactionFilters;
