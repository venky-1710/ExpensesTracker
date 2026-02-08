import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiActivity } from 'react-icons/fi';
import { useDashboard } from '../context/DashboardContext';
import TransactionModal from '../components/TransactionModal/TransactionModal';
import IncomeExpenseChart from '../components/Charts/IncomeExpenseChart';
import CategoryChart from '../components/Charts/CategoryChart';
import DateFilter from '../components/DateFilter/DateFilter';
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
        refreshDashboard
    } = useDashboard();

    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Refresh dashboard when dateFilter changes
    useEffect(() => {
        refreshDashboard();
    }, [dateFilter, refreshDashboard]);

    const handleTransactionSuccess = () => {
        // Refresh dashboard data after adding transaction
        refreshDashboard();
    };

    const handleFilterChange = (newFilter) => {
        setDateFilter(newFilter);
        // Refresh dashboard will be triggered automatically by the useEffect in context
    };

    const handleKPIClick = (kpiType) => {
        navigate(`/dashboard/details/${kpiType}`);
    };

    const handleWidgetClick = (widgetType) => {
        navigate(`/dashboard/details/${widgetType}`);
    };

    // Calculate stats from KPIs (backend returns objects with current/previous/change_percent/trend)
    const stats = {
        totalIncome: kpis?.total_credits?.current || 0,
        totalExpense: kpis?.total_debits?.current || 0,
        balance: kpis?.net_balance?.current || 0,
        transactions: kpis?.total_transactions?.current || 0
    };

    const kpiCards = [
        {
            title: 'Total Income',
            value: `₹${stats.totalIncome.toLocaleString()}`,
            icon: FiTrendingUp,
            color: '#10b981',
            trend: kpis?.total_credits?.change_percent
                ? `${kpis.total_credits.change_percent > 0 ? '+' : ''}${kpis.total_credits.change_percent}%`
                : '+0%',
            isPositive: (kpis?.total_credits?.change_percent || 0) >= 0,
            kpiType: 'income'
        },
        {
            title: 'Total Expenses',
            value: `₹${stats.totalExpense.toLocaleString()}`,
            icon: FiTrendingDown,
            color: '#ef4444',
            trend: kpis?.total_debits?.change_percent
                ? `${kpis.total_debits.change_percent > 0 ? '+' : ''}${kpis.total_debits.change_percent}%`
                : '+0%',
            isPositive: (kpis?.total_debits?.change_percent || 0) <= 0,
            kpiType: 'expense'
        },
        {
            title: 'Balance',
            value: `₹${stats.balance.toLocaleString()}`,
            icon: FiDollarSign,
            color: '#6d4aff',
            trend: kpis?.net_balance?.change_percent
                ? `${kpis.net_balance.change_percent > 0 ? '+' : ''}${kpis.net_balance.change_percent}%`
                : '+0%',
            isPositive: (kpis?.net_balance?.change_percent || 0) >= 0,
            kpiType: 'balance'
        },
        {
            title: 'Transactions',
            value: stats.transactions,
            icon: FiActivity,
            color: '#f59e0b',
            trend: kpis?.total_transactions?.change_percent
                ? `${kpis.total_transactions.change_percent > 0 ? '+' : ''}${kpis.total_transactions.change_percent}%`
                : '+0%',
            isPositive: (kpis?.total_transactions?.change_percent || 0) >= 0,
            kpiType: 'transactions'
        }
    ];

    // Get recent transactions from widgets
    const recentTransactions = widgets?.recent_transactions || [];

    if (loading.kpis && !kpis) {
        return (
            <div className="dashboard">
                <div className="dashboard-header">
                    <h1>Dashboard</h1>
                    <p className="subtitle">Loading...</p>
                </div>
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Fetching your financial data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard">
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
                        className="kpi-card clickable"
                        style={{ '--accent-color': card.color }}
                        onClick={() => handleKPIClick(card.kpiType)}
                    >
                        <div className="kpi-header">
                            <div className="kpi-icon" style={{ background: `${card.color}20` }}>
                                <card.icon size={24} style={{ color: card.color }} />
                            </div>
                            <span className={`kpi-trend ${card.isPositive ? 'positive' : 'negative'}`}>
                                {card.trend}
                            </span>
                        </div>
                        <div className="kpi-content">
                            <h3 className="kpi-title">{card.title}</h3>
                            <p className="kpi-value">{card.value}</p>
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
                    <h3 className="chart-title">Income vs Expenses</h3>
                    {loading.charts ? (
                        <div className="chart-placeholder">
                            <div className="spinner"></div>
                            <p>Loading chart...</p>
                        </div>
                    ) : (
                        <IncomeExpenseChart data={charts?.credit_vs_debit || []} />
                    )}
                </div>

                <div className="chart-card clickable" onClick={() => handleWidgetClick('top_categories')}>
                    <h3 className="chart-title">Category Breakdown</h3>
                    {loading.charts ? (
                        <div className="chart-placeholder">
                            <div className="spinner"></div>
                            <p>Loading chart...</p>
                        </div>
                    ) : (
                        <CategoryChart data={charts?.category_breakdown || []} />
                    )}
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="recent-transactions clickable-section" onClick={() => handleKPIClick('transactions')}>
                <div className="section-header">
                    <h3>Recent Transactions</h3>
                    <button className="view-all-btn" onClick={(e) => { e.stopPropagation(); handleKPIClick('transactions'); }}>View All</button>
                </div>

                {loading.widgets ? (
                    <div className="table-placeholder">
                        <p>Loading transactions...</p>
                    </div>
                ) : recentTransactions.length > 0 ? (
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
                        <small>Add your first transaction to get started</small>
                    </div>
                )}
            </div>

            {/* Transaction Modal */}
            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleTransactionSuccess}
            />
        </div>
    );
};

export default Dashboard;
