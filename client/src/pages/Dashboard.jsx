import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiActivity, FiMoreVertical, FiInfo, FiRefreshCw, FiMaximize2, FiMinimize2, FiUpload } from 'react-icons/fi';
import { useDashboard } from '../context/DashboardContext';
import TransactionModal from '../components/TransactionModal/TransactionModal';
import UploadReviewModal from '../components/UploadReviewModal/UploadReviewModal';
import IncomeExpenseChart from '../components/Charts/IncomeExpenseChart';
import CategoryChart from '../components/Charts/CategoryChart';
import SpendingChart from '../components/Charts/SpendingChart';
import DateFilter from '../components/DateFilter/DateFilter';
import SubLoader from '../components/SubLoader/SubLoader';
import { toast } from 'react-toastify';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
    const {
        kpis,
        charts,
        widgets,
        loading,
        dateFilter,
        setDateFilter,
        fetchKPIs,
        fetchWidgets,
        refreshDashboard,
        refreshSingleKPI,
        refreshSingleChart,
        refreshSingleWidget
    } = useDashboard();

    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState(null);
    const [showMinMax, setShowMinMax] = useState(null);
    const [showInfo, setShowInfo] = useState(null);
    const [maximizedCard, setMaximizedCard] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [reviewData, setReviewData] = useState([]);
    const [isConfirming, setIsConfirming] = useState(false);
    const fileInputRef = useRef(null);

    // Refresh dashboard when dateFilter changes
    useEffect(() => {
        refreshDashboard();
    }, [dateFilter, refreshDashboard]);

    // Close menus on click outside
    useEffect(() => {
        const handleClickOutside = () => {
            setActiveMenu(null);
            setShowInfo(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Disable body scroll when maximized or analyzing or reviewing
    useEffect(() => {
        if (maximizedCard || isAnalyzing || isReviewOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [maximizedCard, isAnalyzing, isReviewOpen]);


    const handleTransactionSuccess = () => {
        refreshDashboard();
    };

    const handleFilterChange = (newFilter) => {
        setDateFilter(newFilter);
    };

    const handleKPIClick = (kpiType) => {
        navigate(`/dashboard/details/${kpiType}`);
    };

    const handleWidgetClick = (widgetType) => {
        navigate(`/dashboard/details/${widgetType}`);
    };

    const handleMenuClick = (e, id) => {
        e.stopPropagation();
        setActiveMenu(activeMenu === id ? null : id);
    };

    const handleInfoClick = (e, id) => {
        e.stopPropagation();
        setShowInfo(showInfo === id ? null : id);
    };

    const handleMaximizeClick = (e, id) => {
        console.log('Maximize clicked for:', id);
        e.stopPropagation();
        setMaximizedCard(id);
        setActiveMenu(null);
    };

    const handleMinimizeClick = () => {
        setMaximizedCard(null);
    };

    const handleRefreshKPI = (e, kpiType) => {
        e.stopPropagation();
        setActiveMenu(null);
        refreshSingleKPI(kpiType);
    };

    const handleRefreshChart = (e, chartType) => {
        e.stopPropagation();
        setActiveMenu(null);
        refreshSingleChart(chartType);
    };

    const handleRefreshWidget = (e, widgetType) => {
        e.stopPropagation();
        setActiveMenu(null);
        refreshSingleWidget(widgetType);
    };

    const handleShowMinMax = (e, kpiType) => {
        e.stopPropagation();
        setShowMinMax(showMinMax === kpiType ? null : kpiType);
        setActiveMenu(null);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset file input
        event.target.value = '';

        const formData = new FormData();
        formData.append('file', file);

        setIsAnalyzing(true);
        const toastId = toast.loading("Analyzing statement with AI... This may take a moment.");

        try {
            const token = localStorage.getItem('token');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await axios.post(`${apiUrl}/api/upload/analyze`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });

            toast.update(toastId, {
                render: `Found ${response.data.count} transactions. Please review before importing.`,
                type: "info",
                isLoading: false,
                autoClose: 3000
            });

            // Open review modal with extracted data
            setReviewData(response.data.transactions || []);
            setIsReviewOpen(true);

        } catch (error) {
            console.error('Upload Error:', error);
            const errorMsg = error.response?.data?.detail || "Failed to analyze file.";
            toast.update(toastId, {
                render: `Error: ${errorMsg}`,
                type: "error",
                isLoading: false,
                autoClose: 5000
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleConfirmImport = async (reviewedTransactions) => {
        setIsConfirming(true);
        const toastId = toast.loading("Importing transactions...");

        try {
            const token = localStorage.getItem('token');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await axios.post(`${apiUrl}/api/upload/confirm`, {
                transactions: reviewedTransactions
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            toast.update(toastId, {
                render: `Successfully imported ${response.data.count} transactions!`,
                type: "success",
                isLoading: false,
                autoClose: 5000
            });

            setIsReviewOpen(false);
            setReviewData([]);
            refreshDashboard();

        } catch (error) {
            console.error('Confirm Error:', error);
            const errorMsg = error.response?.data?.detail || "Failed to import transactions.";
            toast.update(toastId, {
                render: `Error: ${errorMsg}`,
                type: "error",
                isLoading: false,
                autoClose: 5000
            });
        } finally {
            setIsConfirming(false);
        }
    };

    // Compact number formatter: 1234567 -> 1.23M, 12345 -> 12.35k
    const formatCompact = (num) => {
        if (num === null || num === undefined) return '0';
        const abs = Math.abs(num);
        if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
        if (abs >= 1_000) return `${(num / 1_000).toFixed(2)}k`;
        return num.toLocaleString();
    };

    // Compute day count label from current filter
    const getFilterDays = () => {
        const type = dateFilter.type;
        if (type === 'week') return '7 Day';
        if (type === 'month') return '30 Day';
        if (type === 'quarter') return '90 Day';
        if (type === 'year') return '365 Day';
        if (type === 'all') return 'All time';
        if (type === 'custom' && dateFilter.startDate && dateFilter.endDate) {
            const diff = Math.round(
                (new Date(dateFilter.endDate) - new Date(dateFilter.startDate)) / (1000 * 60 * 60 * 24)
            );
            return `${diff} Day`;
        }
        return 'This period';
    };
    const filterDays = getFilterDays();

    const kpiCards = [
        {
            title: 'Total Credits',
            value: formatCompact(kpis?.total_credits?.current || 0),
            icon: FiTrendingUp,
            color: '#10b981',
            bgColor: '#d1fae5',
            kpiType: 'income',
            stats: kpis?.total_credits,
        },
        {
            title: 'Total Expenses',
            value: formatCompact(kpis?.total_debits?.current || 0),
            icon: FiTrendingDown,
            color: '#ef4444',
            bgColor: '#fee2e2',
            kpiType: 'expense',
            stats: kpis?.total_debits,
        },
        {
            title: 'Net Balance',
            value: formatCompact(kpis?.net_balance?.current || 0),
            icon: FiDollarSign,
            color: '#6d4aff',
            bgColor: '#ede9fe',
            kpiType: 'balance',
            stats: kpis?.net_balance,
        },
        {
            title: 'Transactions',
            value: kpis?.total_transactions?.current || 0,
            icon: FiActivity,
            color: '#f59e0b',
            bgColor: '#fef3c7',
            kpiType: 'transactions',
            stats: kpis?.total_transactions,
        }
    ];

    const recentTransactions = widgets?.recent_transactions || [];

    const chartConfigs = {
        credit_vs_debit: {
            id: 'credit_vs_debit',
            title: 'Income vs Expenses',
            description: 'Comparison of total credits and debits over time.',
        },
        category_breakdown: {
            id: 'category_breakdown',
            title: 'Category Breakdown',
            description: 'Distribution of expenses across different categories.',
        },
        recent_transactions: {
            id: 'recent_transactions',
            title: 'Recent Transactions',
            description: 'List of your most recent transactions.',
        }
    };

    if (loading.kpis && !kpis) {
        return (
            <div className="dashboard">
                <div className="dashboard-header">
                    <h1>Dashboard</h1>
                    <p className="subtitle">Loading...</p>
                </div>
                <div className="loading-container">
                    <SubLoader />
                </div>
            </div>
        );
    }

    const renderCardActions = (id, onRefresh, onViewDetails) => (
        <div className="kpi-actions">
            <div className="action-icon maximize-icon" onClick={(e) => handleMaximizeClick(e, id)} title="Maximize">
                <FiMaximize2 size={16} />
            </div>
            <div className="action-icon info-icon" onClick={(e) => handleInfoClick(e, id)} title="Info">
                <FiInfo size={16} />
                {showInfo === id && (
                    <div className="info-tooltip">
                        {chartConfigs[id]?.description || 'Description not available.'}
                    </div>
                )}
            </div>
            <div className="action-icon menu-icon" onClick={(e) => handleMenuClick(e, id)}>
                <FiMoreVertical size={16} />
                {activeMenu === id && (
                    <div className="card-menu">
                        <div className="menu-item" onClick={onRefresh}>
                            <FiRefreshCw size={14} /> Refresh
                        </div>
                        {onViewDetails && (
                            <div className="menu-item" onClick={(e) => { e.stopPropagation(); setActiveMenu(null); onViewDetails(); }}>
                                <FiMaximize2 size={14} /> View Details
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const renderMaximizedContent = () => {
        if (!maximizedCard) return null;
        // ... (existing content logic is fine, minimizing diff size)

        let content = null;
        let title = '';

        if (maximizedCard === 'credit_vs_debit') {
            title = 'Income vs Expenses';
            content = <IncomeExpenseChart data={charts?.credit_vs_debit || []} />;
        } else if (maximizedCard === 'category_breakdown') {
            title = 'Category Breakdown';
            content = <CategoryChart data={charts?.category_breakdown || []} />;
        } else if (maximizedCard === 'recent_transactions') {
            title = 'Recent Transactions';
            content = recentTransactions.length > 0 ? (
                <div className="transactions-list">
                    {recentTransactions.map((transaction, index) => (
                        <div key={index} className="transaction-item">
                            <div className="transaction-info">
                                <span className="transaction-category">{transaction.category}</span>
                                <span className="transaction-desc">{transaction.description || 'No description'}</span>
                                <span className="transaction-date">{new Date(transaction.date).toLocaleDateString()}</span>
                            </div>
                            <div className={`transaction-amount ${transaction.type}`}>
                                {transaction.type === 'credit' ? '+' : '-'}₹{Math.abs(transaction.amount).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="table-placeholder">
                    <p>No transactions yet</p>
                </div>
            );
        }

        return (
            <div className="maximized-overlay" onClick={handleMinimizeClick}>
                <div className="maximized-card" onClick={(e) => e.stopPropagation()}>
                    <div className="maximized-header">
                        <h2>{title}</h2>
                        <button className="close-btn" onClick={handleMinimizeClick} title="Minimize">
                            <FiMinimize2 size={24} />
                        </button>
                    </div>
                    <div className="maximized-content">
                        {content}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="dashboard">
            {/* Analyzing Overlay */}
            {isAnalyzing && (
                <div className="maximized-overlay" style={{ zIndex: 10000 }}>
                    <div className="loading-container" style={{ background: 'white', padding: '40px', borderRadius: '16px' }}>
                        <SubLoader />
                        <p style={{ fontWeight: 'bold', marginTop: '20px' }}>Analyzing Statement with AI...</p>
                        <small>Extracting transactions from your file.</small>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1>Dashboard</h1>
                    <p className="subtitle">
                        Welcome back! Available Balance:
                        <span style={{ color: '#10b981', fontWeight: 'bold', marginLeft: '8px' }}>
                            ₹{(kpis?.available_balance || 0).toLocaleString()}
                        </span>
                    </p>
                </div>
                <div className="header-actions">
                    <DateFilter currentFilter={dateFilter} onFilterChange={handleFilterChange} />

                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".pdf,.csv,.xlsx,.xls"
                        onChange={handleFileChange}
                    />
                    <button className="add-transaction-btn" style={{ background: 'white', color: '#6d4aff', border: '1px solid #6d4aff', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleUploadClick}>
                        <FiUpload size={16} /> Upload Statement
                    </button>

                    <button className="add-transaction-btn" onClick={() => setIsModalOpen(true)}>
                        + New Transaction
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                {kpiCards.map((card, index) => (
                    <div
                        key={index}
                        className="kpi-card"
                        onClick={() => handleKPIClick(card.kpiType)}
                    >
                        {/* Icon */}
                        <div className="kpi-icon-box" style={{ background: card.bgColor, color: card.color }}>
                            {loading.loadingKPIs?.[card.kpiType]
                                ? <div className="spinner-mini" style={{ borderTopColor: card.color }} />
                                : <card.icon size={26} />
                            }
                        </div>

                        {/* Content */}
                        <div className="kpi-content-block">
                            <div className="kpi-top-row">
                                <p className="kpi-subtitle">{card.title}</p>
                                <div className="kpi-actions" onClick={(e) => e.stopPropagation()}>
                                    <div className="action-icon menu-icon" onClick={(e) => handleMenuClick(e, card.kpiType)}>
                                        <FiMoreVertical size={15} />
                                        {activeMenu === card.kpiType && (
                                            <div className="card-menu">
                                                <div className="menu-item" onClick={(e) => handleRefreshKPI(e, card.kpiType)}>
                                                    <FiRefreshCw size={13} /> Refresh
                                                </div>
                                                <div className="menu-item" onClick={(e) => { e.stopPropagation(); handleKPIClick(card.kpiType); }}>
                                                    <FiMaximize2 size={13} /> View Details
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <p className="kpi-main-value">{card.value}</p>

                            <p className="kpi-change-row">
                                <span className={`kpi-change-badge ${
                                    (card.stats?.change_percent || 0) >= 0 ? 'positive' : 'negative'
                                }`}>
                                    {(card.stats?.change_percent || 0) >= 0 ? '+' : ''}{card.stats?.change_percent ?? 0}%
                                </span>
                                <span className="kpi-day-label">({filterDays})</span>
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Additional KPI Info */}
            {kpis && (
                <div className="additional-info">
                    <div className="info-card clickable" onClick={() => handleWidgetClick('top_categories')}>
                        <span className="info-label">Highest Expense Category</span>
                        <span className="info-value">{kpis.highest_expense_category?.current || 'N/A'}</span>
                    </div>
                    <div className="info-card">
                        <span className="info-label">Average Monthly Expense</span>
                        <span className="info-value">₹{(kpis.average_monthly_expense?.current || 0).toLocaleString()}</span>
                    </div>
                </div>
            )}

            {/* Charts Section */}
            <div className="charts-section">
                <div className="chart-card">
                    <div className="kpi-header-row" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="chart-title" style={{ margin: 0 }}>Income vs Expenses</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {loading.loadingCharts?.credit_vs_debit && <div className="spinner-mini"></div>}
                            {renderCardActions('credit_vs_debit', (e) => handleRefreshChart(e, 'credit_vs_debit'))}
                        </div>
                    </div>

                    {loading.charts && !loading.loadingCharts?.credit_vs_debit ? (
                        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SubLoader /></div>
                    ) : (
                        <IncomeExpenseChart data={charts?.credit_vs_debit || []} />
                    )}
                </div>

                <div className="chart-card">
                    <div className="kpi-header-row" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="chart-title" style={{ margin: 0 }}>Category Breakdown</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {loading.loadingCharts?.category_breakdown && <div className="spinner-mini"></div>}
                            {renderCardActions(
                                'category_breakdown',
                                (e) => handleRefreshChart(e, 'category_breakdown'),
                                () => handleWidgetClick('top_categories')
                            )}
                        </div>
                    </div>

                    {loading.charts && !loading.loadingCharts?.category_breakdown ? (
                        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SubLoader /></div>
                    ) : (
                        <CategoryChart data={charts?.category_breakdown || []} />
                    )}
                </div>
            </div>

            {/* Spending Trend Widget */}
            <div style={{ marginBottom: '30px' }}>
                <SpendingChart />
            </div>

            {/* Recent Transactions */}
            <div className="recent-transactions">
                <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0 }}>Recent Transactions</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {loading.loadingWidgets?.recent_transactions && <div className="spinner-mini"></div>}
                        {renderCardActions('recent_transactions', (e) => handleRefreshWidget(e, 'recent_transactions'))}
                        <button className="view-all-btn" onClick={(e) => { e.stopPropagation(); handleKPIClick('transactions'); }}>View All</button>
                    </div>
                </div>

                {loading.widgets && !loading.loadingWidgets?.recent_transactions ? (
                    <SubLoader />
                ) : recentTransactions.length > 0 ? (
                    <div className="transactions-list">
                        {recentTransactions.slice(0, 5).map((transaction, index) => (
                            <div key={index} className="transaction-item">
                                <span className="transaction-date">{new Date(transaction.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                <span className="transaction-category">{transaction.category}</span>
                                <span className="transaction-desc">{transaction.description || '-'}</span>
                                <div className={`transaction-amount ${transaction.type}`}>
                                    {transaction.type === 'credit' ? '+' : '-'}₹{Math.abs(transaction.amount).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="table-placeholder">
                        <p>No transactions yet</p>
                        <small>Add your first transaction to get started</small>
                    </div>
                )}
            </div>

            {/* Maximized Overlay */}
            {renderMaximizedContent()}

            {/* Transaction Modal */}
            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleTransactionSuccess}
            />

            {/* Upload Review Modal */}
            <UploadReviewModal
                isOpen={isReviewOpen}
                transactions={reviewData}
                onConfirm={handleConfirmImport}
                onClose={() => { setIsReviewOpen(false); setReviewData([]); }}
                loading={isConfirming}
            />
        </div>
    );
};

export default Dashboard;
