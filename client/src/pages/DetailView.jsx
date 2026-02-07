import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiFilter, FiDownload, FiSearch, FiTrendingUp, FiTrendingDown, FiDollarSign, FiActivity, FiList, FiPieChart, FiAlertCircle } from 'react-icons/fi';
import { transactionService } from '../services/transactionService';
import { useDashboard } from '../context/DashboardContext';
import './DetailView.css';

const DetailView = () => {
    const { type } = useParams();
    const navigate = useNavigate();
    const { dateFilter } = useDashboard();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, [type, dateFilter, itemsPerPage, currentPage]); // Re-fetch when dependencies change

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {
                filter_type: dateFilter.type,
                limit: 1000, // Fetch more for the full page view
                ...(dateFilter.startDate && { start_date: dateFilter.startDate }),
                ...(dateFilter.endDate && { end_date: dateFilter.endDate })
            };

            if (type === 'income') {
                params.type = 'credit';
                const response = await transactionService.getTransactions(params);
                setData(response.transactions || []);
            } else if (type === 'expense') {
                params.type = 'debit';
                const response = await transactionService.getTransactions(params);
                setData(response.transactions || []);
            } else if (type === 'balance') {
                const response = await transactionService.getTransactions(params);
                setData(response.transactions || []);
            } else if (type === 'transactions' || type === 'recent_transactions') {
                const response = await transactionService.getTransactions(params);
                setData(response.transactions || []);
            } else if (type === 'top_categories') {
                // For categories, we might need a different endpoint or aggregation
                // Using transactions for now but could be enhanced to show category grouping
                const response = await transactionService.getTransactions(params);
                setData(response.transactions || []);
            }

        } catch (error) {
            console.error('Failed to fetch detail data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getViewConfig = () => {
        const configs = {
            income: {
                title: 'Income Details',
                icon: FiTrendingUp,
                color: '#10b981',
                description: 'Detailed view of all your income sources'
            },
            expense: {
                title: 'Expense Details',
                icon: FiTrendingDown,
                color: '#ef4444',
                description: 'Detailed breakdown of your expenses'
            },
            balance: {
                title: 'Balance History',
                icon: FiDollarSign,
                color: '#6d4aff',
                description: 'Track your balance changes over time'
            },
            transactions: {
                title: 'All Transactions',
                icon: FiActivity,
                color: '#f59e0b',
                description: 'Complete history of all transactions'
            },
            recent_transactions: {
                title: 'Recent Activity',
                icon: FiList,
                color: '#6d4aff',
                description: 'Your most recent financial activity'
            },
            top_categories: {
                title: 'Category Breakdown',
                icon: FiPieChart,
                color: '#c850ff',
                description: 'Spending analysis by category'
            }
        };
        return configs[type] || configs.transactions;
    };

    const config = getViewConfig();

    // Sorting Logic
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Filter & Sort Data
    const processedData = [...data]
        .filter(item =>
        (searchTerm === '' ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => {
            if (sortConfig.key === 'date') {
                return sortConfig.direction === 'asc'
                    ? new Date(a.date) - new Date(b.date)
                    : new Date(b.date) - new Date(a.date);
            }
            if (sortConfig.key === 'amount') {
                return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
            }
            if (sortConfig.key === 'category') {
                return sortConfig.direction === 'asc'
                    ? a.category.localeCompare(b.category)
                    : b.category.localeCompare(a.category);
            }
            return 0;
        });

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = processedData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(processedData.length / itemsPerPage);

    return (
        <div className="detail-view-page">
            {/* Header */}
            <div className="detail-header">
                <button className="back-btn" onClick={() => navigate('/dashboard')}>
                    <FiArrowLeft size={20} />
                    <span>Back to Dashboard</span>
                </button>

                <div className="header-content">
                    <div className="header-icon" style={{ background: `${config.color}20`, color: config.color }}>
                        <config.icon size={32} />
                    </div>
                    <div>
                        <h1>{config.title}</h1>
                        <p>{config.description}</p>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="controls-bar">
                <div className="search-box">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="actions">
                    <button className="action-btn">
                        <FiFilter /> Filter
                    </button>
                    <button className="action-btn">
                        <FiDownload /> Export
                    </button>
                </div>
            </div>

            {/* Data Table Card */}
            <div className="data-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading your data...</p>
                    </div>
                ) : processedData.length > 0 ? (
                    <>
                        <div className="table-wrapper">
                            <table className="enhanced-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('date')} className="sortable">
                                            Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th>Description</th>
                                        <th onClick={() => handleSort('category')} className="sortable">
                                            Category {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th>Type</th>
                                        <th onClick={() => handleSort('amount')} className="sortable text-right">
                                            Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map((item, index) => (
                                        <tr key={item.id || index}>
                                            <td className="date-cell">
                                                <div className="date-day">{new Date(item.date).getDate()}</div>
                                                <div className="date-month">
                                                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="desc-cell">
                                                <div className="fw-bold">{item.description || 'No description'}</div>
                                                <div className="text-muted">{item.payment_method}</div>
                                            </td>
                                            <td>
                                                <span className="category-pill">{item.category}</span>
                                            </td>
                                            <td>
                                                <span className={`type-dot ${item.type}`}></span>
                                                {item.type === 'credit' ? 'Income' : 'Expense'}
                                            </td>
                                            <td className={`amount-cell text-right ${item.type}`}>
                                                {item.type === 'credit' ? '+' : '-'}
                                                ${Math.abs(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td>
                                                <span className="status-badge success">Completed</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="table-footer">
                            <div className="items-per-page">
                                <span>Rows per page:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>

                            <div className="pagination-controls">
                                <span>
                                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, processedData.length)} of {processedData.length}
                                </span>
                                <div className="page-buttons">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    >Previous</button>
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    >Next</button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">📂</div>
                        <h3>No records found</h3>
                        <p>Try adjusting your search or date filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetailView;
