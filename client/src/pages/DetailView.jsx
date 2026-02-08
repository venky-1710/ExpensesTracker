import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiFilter, FiDownload, FiSearch, FiTrendingUp, FiTrendingDown, FiDollarSign, FiActivity, FiList, FiPieChart, FiChevronDown } from 'react-icons/fi';
import { transactionService } from '../services/transactionService';
import { useDashboard } from '../context/DashboardContext';
import SubLoader from '../components/SubLoader/SubLoader';
import TransactionFilters from '../components/TransactionFilters/TransactionFilters';
import './DetailView.css';

const DetailView = () => {
    const { type } = useParams();
    const navigate = useNavigate();
    const { dateFilter, kpis, fetchKPIs } = useDashboard();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const [filters, setFilters] = useState({
        category: '',
        payment_method: '',
        type: ''
    });

    useEffect(() => {
        if (!kpis) {
            fetchKPIs();
        }
    }, [kpis, fetchKPIs]);

    useEffect(() => {
        fetchData();
    }, [type, dateFilter, itemsPerPage, currentPage, filters]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {
                filter_type: dateFilter.type,
                limit: 1000,
                ...(dateFilter.startDate && { start_date: dateFilter.startDate }),
                ...(dateFilter.endDate && { end_date: dateFilter.endDate }),
                ...filters
            };

            // Clean empty filters
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null) {
                    delete params[key];
                }
            });

            // Override type based on route if not explicitly set in filters (or merge logic)
            // If user selects a type in filter, it should probably override or intersect.
            // For now, let's say if route is 'income', we force type='credit' unless user filters specifically? 
            // Actually, usually detail view for 'Income' implies ONLY income.
            if (type === 'income') {
                params.type = 'credit';
            } else if (type === 'expense') {
                params.type = 'debit';
            }

            // If user explicitly selected a type in filters, that might conflict. 
            // Let's assume the component will visually hide the type selector if we are in strict mode, 
            // OR we just send what we have. 
            // If I am in "Income" view, I shouldn't be able to filter for "Expense".

            const response = await transactionService.getTransactions(params);
            setData(response.transactions || []);

        } catch (error) {
            console.error('Failed to fetch detail data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format) => {
        try {
            const params = {
                format,
                filter_type: dateFilter.type,
                ...(dateFilter.startDate && { start_date: dateFilter.startDate }),
                ...(dateFilter.endDate && { end_date: dateFilter.endDate }),
                ...filters
            };

            if (type === 'income') params.type = 'credit';
            if (type === 'expense') params.type = 'debit';

            // Clean params
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null) {
                    delete params[key];
                }
            });

            const blob = await transactionService.exportTransactions(params);

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_details_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            setShowExportMenu(false);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export data');
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

    // Filter & Sort Data (Client-side search)
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

    // Calculate Total for current view
    const totalAmount = processedData.reduce((sum, item) => sum + item.amount, 0);

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

            {/* Summary Stats */}
            <div className="summary-stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Total {config.title.replace(' Details', '')}</div>
                    <div className="stat-value" style={{ color: config.color }}>
                        ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Available Wallet Balance</div>
                    <div className="stat-value text-primary">
                        ₹{kpis?.available_balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
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
                    <button
                        className={`action-btn ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <FiFilter /> Filters
                    </button>

                    <div className="export-wrapper">
                        <button
                            className="action-btn"
                            onClick={() => setShowExportMenu(!showExportMenu)}
                        >
                            <FiDownload /> Export
                        </button>
                        {showExportMenu && (
                            <div className="export-menu">
                                <button onClick={() => handleExport('csv')}>Export as CSV</button>
                                <button onClick={() => handleExport('xlsx')}>Export as Excel</button>
                                <button onClick={() => handleExport('pdf')}>Export as PDF</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
                <div className="filters-container">
                    <TransactionFilters
                        filters={filters}
                        onFilterChange={setFilters}
                    />
                </div>
            )}

            {/* Data Table Card */}
            <div className="data-card">
                {loading ? (
                    <div className="loading-state">
                        <SubLoader />
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
                                                ₹{Math.abs(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
