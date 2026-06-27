import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiFilter, FiDownload, FiSearch, FiTrendingUp, FiTrendingDown, FiDollarSign, FiActivity, FiList, FiPieChart, FiChevronDown } from 'react-icons/fi';
import { transactionService } from '../services/transactionService';
import { useDashboard } from '../context/DashboardContext';
import SubLoader from '../components/SubLoader/SubLoader';
import TransactionFilters from '../components/TransactionFilters/TransactionFilters';
import '../pages/Transactions.css';

const DetailView = () => {
    const { type } = useParams();
    const navigate = useNavigate();
    const { dateFilter, kpis, fetchKPIs } = useDashboard();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        totalCredits: 0,
        totalDebits: 0,
        availableBalance: 0
    });

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

            if (type === 'income') {
                params.type = 'credit';
            } else if (type === 'expense') {
                params.type = 'debit';
            }

            const response = await transactionService.getTransactions(params);
            setData(response.transactions || []);

            // Set stats from response
            setStats({
                totalCredits: response.total_credits || 0,
                totalDebits: response.total_debits || 0,
                availableBalance: response.available_balance || 0
            });

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
        <div className="transactions-page">
            {/* Header */}
            <div className="page-header">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button className="secondary-btn" onClick={() => navigate('/dashboard')} style={{ padding: '8px 12px' }}>
                            <FiArrowLeft size={18} />
                        </button>
                        <div className="header-icon" style={{ background: `${config.color}20`, color: config.color, padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <config.icon size={24} />
                        </div>
                        <h1 style={{ margin: 0 }}>{config.title}</h1>
                    </div>
                    <p className="subtitle" style={{ marginLeft: '62px' }}>{config.description}</p>
                </div>

                <div className="header-actions">
                    <div className="search-box" style={{ position: 'relative' }}>
                        <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                padding: '12px 16px 12px 36px', 
                                borderRadius: '10px', 
                                border: '1px solid var(--border-color, #e5e7eb)', 
                                background: 'var(--card-bg, #ffffff)',
                                color: 'var(--text-primary, #1f2937)',
                                outline: 'none', 
                                width: '200px',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                    <div className="export-wrapper" style={{ position: 'relative' }}>
                        <button
                            className="secondary-btn"
                            onClick={() => setShowExportMenu(!showExportMenu)}
                        >
                            <FiDownload size={18} /> Export
                        </button>
                        {showExportMenu && (
                            <div className="export-menu" style={{ position: 'absolute', top: '100%', right: '0', background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '10px', zIndex: 100, overflow: 'hidden', minWidth: '160px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginTop: '8px' }}>
                                <button style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer', fontSize: '14px' }} onClick={() => handleExport('csv')}>Export as CSV</button>
                                <button style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer', fontSize: '14px' }} onClick={() => handleExport('xlsx')}>Export as Excel</button>
                                <button style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer', fontSize: '14px' }} onClick={() => handleExport('pdf')}>Export as PDF</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="transaction-summary-cards">
                <div className="summary-card credit">
                    <span className="summary-label">Total Credits</span>
                    <span className="summary-value">+₹{stats.totalCredits?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
                </div>
                <div className="summary-card debit">
                    <span className="summary-label">Total Debits</span>
                    <span className="summary-value">-₹{stats.totalDebits?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
                </div>
                <div className="summary-card balance">
                    <span className="summary-label">Current Balance</span>
                    <span className="summary-value">₹{stats.availableBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
                </div>
            </div>

            {/* Filters Section */}
            <div className="filters-section">
                <TransactionFilters
                    filters={filters}
                    onFilterChange={setFilters}
                />
            </div>

            {/* Data Table */}
            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading transactions...</p>
                </div>
            ) : processedData.length > 0 ? (
                <>
                    <div className="transactions-table">
                        <div className="table-header">
                            <div className="th-date sortable" onClick={() => handleSort('date')}>
                                Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </div>
                            <div className="th-category sortable" onClick={() => handleSort('category')}>
                                Category {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </div>
                            <div className="th-description">Description</div>
                            <div className="th-payment">Payment Method</div>
                            <div className="th-amount sortable" onClick={() => handleSort('amount')} style={{ textAlign: 'right' }}>
                                Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </div>
                            <div className="th-actions" style={{ textAlign: 'center' }}>Status</div>
                        </div>
                        <div className="table-body">
                            {currentItems.map((item, index) => (
                                <div key={item.id || index} className="transaction-row">
                                    <div className="td-date">
                                        {new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                    <div className="td-category">
                                        <span className={`category-badge ${item.type}`}>
                                            {item.category}
                                        </span>
                                    </div>
                                    <div className="td-description">
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.description || 'No description'}</div>
                                    </div>
                                    <div className="td-payment">{item.payment_method}</div>
                                    <div className={`td-amount ${item.type}`}>
                                        {item.type === 'credit' ? '+' : '-'}₹{Math.abs(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="td-actions">
                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>Completed</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </button>
                            <span className="pagination-info">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage >= totalPages}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="content-placeholder">
                    <div className="placeholder-icon">📂</div>
                    <h3>No records found</h3>
                    <p>Try adjusting your search or filters to find what you're looking for.</p>
                </div>
            )}
        </div>
    );
};

export default DetailView;
