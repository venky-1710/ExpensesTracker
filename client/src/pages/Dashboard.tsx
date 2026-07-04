import React, { useEffect, useState, useRef } from 'react';
import { differenceInDays } from 'date-fns';
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
import Loader from '../components/Loader/Loader';
import NotificationCenter from '../components/NotificationCenter/NotificationCenter';
import { toast } from 'react-toastify';
import axios from 'axios';
import type { DateFilterState } from '../types';

interface KPICardConfig {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  bgColor: string;
  kpiType: string;
  stats: any;
}

const Dashboard = () => {
  const {
    kpis, charts, widgets, loading, dateFilter, setDateFilter,
    refreshDashboard, refreshSingleKPI, refreshSingleChart, refreshSingleWidget
  } = useDashboard();

  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState<string | null>(null);
  const [maximizedCard, setMaximizedCard] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [reviewData, setReviewData] = useState<any[]>([]);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { refreshDashboard(); }, [dateFilter, refreshDashboard]);

  useEffect(() => {
    const handleClickOutside = () => { setActiveMenu(null); setShowInfo(null); };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (maximizedCard || isAnalyzing || isReviewOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [maximizedCard, isAnalyzing, isReviewOpen]);

  const handleTransactionSuccess = () => refreshDashboard();
  const handleFilterChange = (newFilter: DateFilterState) => setDateFilter(newFilter);

  const handleKPIClick = (kpiType: string) => navigate(`/dashboard/details/${kpiType}`);
  const handleWidgetClick = (widgetType: string) => navigate(`/dashboard/details/${widgetType}`);

  const handleMenuClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === id ? null : id);
  };

  const handleInfoClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setShowInfo(showInfo === id ? null : id);
  };

  const handleMaximizeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMaximizedCard(id);
    setActiveMenu(null);
  };

  const handleMinimizeClick = () => setMaximizedCard(null);

  const handleRefreshKPI = (e: React.MouseEvent, kpiType: string) => {
    e.stopPropagation();
    setActiveMenu(null);
    refreshSingleKPI(kpiType);
  };

  const handleRefreshChart = (e: React.MouseEvent, chartType: string) => {
    e.stopPropagation();
    setActiveMenu(null);
    refreshSingleChart(chartType);
  };

  const handleRefreshWidget = (e: React.MouseEvent, widgetType: string) => {
    e.stopPropagation();
    setActiveMenu(null);
    refreshSingleWidget(widgetType);
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    const formData = new FormData();
    formData.append('file', file);
    setIsAnalyzing(true);
    const toastId = toast.loading('Analyzing statement with AI... This may take a moment.');
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await axios.post(`${apiUrl}/api/upload/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
      });
      toast.update(toastId, { render: `Found ${response.data.count} transactions. Please review before importing.`, type: 'info', isLoading: false, autoClose: 3000 });
      setReviewData(response.data.transactions || []);
      setIsReviewOpen(true);
    } catch (error: any) {
      console.error('Upload Error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to analyze file.';
      toast.update(toastId, { render: `Error: ${errorMsg}`, type: 'error', isLoading: false, autoClose: 5000 });
    } finally { setIsAnalyzing(false); }
  };

  const handleConfirmImport = async (reviewedTransactions: any[]) => {
    setIsConfirming(true);
    const toastId = toast.loading('Importing transactions...');
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await axios.post(`${apiUrl}/api/upload/confirm`, { transactions: reviewedTransactions }, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      toast.update(toastId, { render: `Successfully imported ${response.data.count} transactions!`, type: 'success', isLoading: false, autoClose: 5000 });
      setIsReviewOpen(false);
      setReviewData([]);
      refreshDashboard();
    } catch (error: any) {
      console.error('Confirm Error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to import transactions.';
      toast.update(toastId, { render: `Error: ${errorMsg}`, type: 'error', isLoading: false, autoClose: 5000 });
    } finally { setIsConfirming(false); }
  };

  const formatCompact = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '0';
    const abs = Math.abs(num);
    if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${(num / 1_000).toFixed(2)}k`;
    return num.toLocaleString();
  };

  const getFilterDays = (): string => {
    const type = dateFilter.type;
    if (type === 'week') return '7 Day';
    if (type === 'month') return '30 Day';
    if (type === 'quarter') return '90 Day';
    if (type === 'year') return '365 Day';
    if (type === 'all') return 'All time';
    if (type === 'custom' && dateFilter.startDate && dateFilter.endDate) {
      const diff = Math.round((new Date(dateFilter.endDate).getTime() - new Date(dateFilter.startDate).getTime()) / (1000 * 60 * 60 * 24));
      return `${diff} Day`;
    }
    return 'This period';
  };
  const filterDays = getFilterDays();

  const kpiCards: KPICardConfig[] = [
    { title: 'Total Credits', value: formatCompact(kpis?.total_credits?.current || 0), icon: FiTrendingUp, color: '#10b981', bgColor: '#d1fae5', kpiType: 'income', stats: kpis?.total_credits },
    { title: 'Total Expenses', value: formatCompact(kpis?.total_debits?.current || 0), icon: FiTrendingDown, color: '#ef4444', bgColor: '#fee2e2', kpiType: 'expense', stats: kpis?.total_debits },
    { title: 'Net Balance', value: formatCompact(kpis?.net_balance?.current || 0), icon: FiDollarSign, color: '#6d4aff', bgColor: '#ede9fe', kpiType: 'balance', stats: kpis?.net_balance },
    { title: 'Transactions', value: kpis?.total_transactions?.current || 0, icon: FiActivity, color: '#f59e0b', bgColor: '#fef3c7', kpiType: 'transactions', stats: kpis?.total_transactions },
  ];

  const recentTransactions = widgets?.recent_transactions || [];

  const chartConfigs: Record<string, { id: string; title: string; description: string }> = {
    credit_vs_debit: { id: 'credit_vs_debit', title: 'Income vs Expenses', description: 'Comparison of total credits and debits over time.' },
    category_breakdown: { id: 'category_breakdown', title: 'Category Breakdown', description: 'Distribution of expenses across different categories.' },
    recent_transactions: { id: 'recent_transactions', title: 'Recent Transactions', description: 'List of your most recent transactions.' }
  };

  if (loading.kpis && !kpis) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-[32px] font-bold bg-gradient-to-br from-[#1a0d35] to-[#6d4aff] bg-clip-text text-transparent m-0">Dashboard</h1>
          <p className="mt-1 text-gray-500 text-sm m-0">Loading...</p>
        </div>
        <div className="flex justify-center items-center h-[50vh]"><SubLoader /></div>
      </div>
    );
  }

  const renderCardActions = (id: string, onRefresh: (e: React.MouseEvent) => void, onViewDetails?: () => void) => (
    <div className="flex gap-2 relative">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer" onClick={(e) => handleMaximizeClick(e, id)} title="Maximize">
        <FiMaximize2 size={16} />
      </div>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer" onClick={(e) => handleInfoClick(e, id)} title="Info">
        <FiInfo size={16} />
        {showInfo === id && <div className="absolute bottom-full right-0 w-[200px] bg-gray-800 text-white p-2 rounded-lg text-xs leading-relaxed z-20 mb-2 shadow-md pointer-events-none">{chartConfigs[id]?.description || 'Description not available.'}</div>}
      </div>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer relative" onClick={(e) => handleMenuClick(e, id)}>
        <FiMoreVertical size={16} />
        {activeMenu === id && (
          <div className="absolute top-full right-0 w-[140px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30 py-1 mt-1">
            <div className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-200" onClick={onRefresh}><FiRefreshCw size={14} /> Refresh</div>
            {onViewDetails && (
              <div className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-200" onClick={(e) => { e.stopPropagation(); setActiveMenu(null); onViewDetails(); }}>
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
    let content: React.ReactNode = null;
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
        <div className="flex flex-col gap-3">
          {recentTransactions.map((transaction: any, index: number) => (
            <div key={index} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{transaction.category}</span>
                <span className="text-sm text-gray-500">{transaction.description || 'No description'}</span>
                <span className="text-xs text-gray-400">{new Date(transaction.date).toLocaleDateString()}</span>
              </div>
              <div className={`font-bold text-lg ${transaction.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                {transaction.type === 'credit' ? '+' : '-'}₹{Math.abs(transaction.amount).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      ) : <div className="text-center py-10 text-gray-500"><p>No transactions yet</p></div>;
    }

    return (
      <div className="fixed inset-0 bg-black/60 z-[1050] flex items-center justify-center p-5 backdrop-blur-sm" onClick={handleMinimizeClick}>
          <div className="bg-white dark:bg-gray-900 w-full max-w-7xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-zoom-in relative border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
            <h2 className="m-0 text-2xl text-gray-900 dark:text-gray-100 font-bold">{title}</h2>
            <button className="bg-gray-100 dark:bg-gray-800 border-none w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors" onClick={handleMinimizeClick} title="Minimize"><FiMinimize2 size={24} /></button>
          </div>
          <div className="flex-1 p-6 overflow-y-auto">{content}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-5 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 p-10 rounded-2xl flex flex-col items-center justify-center shadow-xl">
            <SubLoader />
            <p className="font-bold mt-5 text-gray-900 dark:text-gray-100">Analyzing Statement with AI...</p>
            <small className="text-gray-500">Extracting transactions from your file.</small>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-[30px] flex-wrap gap-4">
        <div>
          <h1 className="text-[32px] font-bold bg-gradient-to-br from-[#1a0d35] to-[#6d4aff] dark:from-[#c850ff] dark:to-[#6d4aff] bg-clip-text text-transparent m-0 leading-tight">Dashboard</h1>
          <p className="mt-[5px] text-gray-500 text-sm m-0">
            Welcome back! Available Balance:
            <span className="text-green-500 font-bold ml-2">
              ₹{(kpis?.available_balance || 0).toLocaleString()}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <NotificationCenter />
          <DateFilter currentFilter={dateFilter} onFilterChange={handleFilterChange} />
          
          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.csv,.xlsx,.xls" onChange={handleFileChange} />
          <button className="px-6 py-3 bg-white dark:bg-gray-800 text-[#6d4aff] dark:text-[#c850ff] border border-[#6d4aff] dark:border-[#c850ff] rounded-lg text-sm font-semibold cursor-pointer transition-all flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-lg" onClick={handleUploadClick}>
            <FiUpload size={16} /> Upload Statement
          </button>
          <button className="px-6 py-3 bg-gradient-to-br from-[#c850ff] to-[#6d4aff] text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all shadow-[0_4px_12px_rgba(200,80,255,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(200,80,255,0.4)]" onClick={() => setIsModalOpen(true)}>+ New Transaction</button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6 mb-[30px]">
        {kpiCards.map((card, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-gray-700 transition-all cursor-pointer relative overflow-visible flex items-center gap-4 hover:-translate-y-[3px] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)]" onClick={() => handleKPIClick(card.kpiType)}>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: card.bgColor, color: card.color }}>
              {loading.loadingKPIs?.[card.kpiType]
                ? <div className="w-6 h-6 rounded-full border-2 border-transparent border-t-current animate-spin" />
                : <card.icon size={26} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <p className="text-[13px] font-medium text-gray-500 m-0">{card.title}</p>
                <div className="flex gap-2 relative" onClick={(e) => e.stopPropagation()}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer" onClick={(e) => handleMenuClick(e, card.kpiType)}>
                    <FiMoreVertical size={15} />
                    {activeMenu === card.kpiType && (
                      <div className="absolute top-full right-0 w-[140px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30 py-1 mt-1">
                        <div className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-200" onClick={(e) => handleRefreshKPI(e, card.kpiType)}><FiRefreshCw size={13} /> Refresh</div>
                        <div className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-200" onClick={(e) => { e.stopPropagation(); handleKPIClick(card.kpiType); }}><FiMaximize2 size={13} /> View Details</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-[26px] font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-[1.2] m-0 mb-1">{card.value}</p>
              <p className="flex items-center gap-1.5 m-0 text-[13px]">
                <span className={`font-bold ${ (card.stats?.change_percent || 0) >= 0 ? 'text-green-500' : 'text-red-500' }`}>
                  {(card.stats?.change_percent || 0) >= 0 ? '+' : ''}{card.stats?.change_percent ?? 0}%
                </span>
                <span className="text-gray-400 dark:text-gray-500 text-[12px]">({filterDays})</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {kpis && (
        <div className="flex flex-wrap gap-4 mb-[30px]">
          <div className="flex-1 min-w-[200px] bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between cursor-pointer transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-900/50" onClick={() => handleWidgetClick('top_categories')}>
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Highest Expense Category</span>
            <span className="text-base font-bold text-indigo-900 dark:text-indigo-100">{kpis.highest_expense_category?.current || 'N/A'}</span>
          </div>
          <div className="flex-1 min-w-[200px] bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Average Monthly Expense</span>
            <span className="text-base font-bold text-emerald-900 dark:text-emerald-100">₹{(kpis.average_monthly_expense?.current || 0).toLocaleString()}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-[30px]">
        <div className="bg-white dark:bg-gray-800 p-5 lg:p-6 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-none border border-gray-100 dark:border-gray-700 h-[420px] flex flex-col relative overflow-visible">
          <div className="flex justify-between items-center mb-3">
            <h3 className="m-0 text-lg font-bold text-gray-900 dark:text-gray-100">Income vs Expenses</h3>
            <div className="flex items-center gap-2">
              {loading.loadingCharts?.credit_vs_debit && <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-indigo-500 animate-spin"></div>}
              {renderCardActions('credit_vs_debit', (e) => handleRefreshChart(e, 'credit_vs_debit'))}
            </div>
          </div>
          {loading.charts && !loading.loadingCharts?.credit_vs_debit ? (
            <div className="h-[300px] flex items-center justify-center"><SubLoader /></div>
          ) : (
            <div className="flex-1 min-h-[300px] relative -mx-2 -mb-2"><IncomeExpenseChart data={charts?.credit_vs_debit || []} /></div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 lg:p-6 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-none border border-gray-100 dark:border-gray-700 h-[420px] flex flex-col relative overflow-visible">
          <div className="flex justify-between items-center mb-3">
            <h3 className="m-0 text-lg font-bold text-gray-900 dark:text-gray-100">Category Breakdown</h3>
            <div className="flex items-center gap-2">
              {loading.loadingCharts?.category_breakdown && <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-indigo-500 animate-spin"></div>}
              {renderCardActions('category_breakdown', (e) => handleRefreshChart(e, 'category_breakdown'), () => handleWidgetClick('top_categories'))}
            </div>
          </div>
          {loading.charts && !loading.loadingCharts?.category_breakdown ? (
            <div className="h-[300px] flex items-center justify-center"><SubLoader /></div>
          ) : (
            <div className="flex-1 min-h-[300px] relative -mx-2 -mb-2"><CategoryChart data={charts?.category_breakdown || []} /></div>
          )}
        </div>
      </div>

      <div className="mb-[30px]">
        <SpendingChart />
      </div>

      <div className="bg-white dark:bg-gray-800 p-5 lg:p-6 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-none border border-gray-100 dark:border-gray-700 relative overflow-visible mb-6">
        <div className="flex items-center justify-between mb-5 border-b border-gray-100 dark:border-gray-700 pb-4">
          <h3 className="m-0 text-lg font-bold text-gray-900 dark:text-gray-100">Recent Transactions</h3>
          <div className="flex items-center gap-3">
            {loading.loadingWidgets?.recent_transactions && <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-indigo-500 animate-spin"></div>}
            {renderCardActions('recent_transactions', (e) => handleRefreshWidget(e, 'recent_transactions'))}
            <button className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-none px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-900/50" onClick={(e) => { e.stopPropagation(); handleKPIClick('transactions'); }}>View All</button>
          </div>
        </div>

        {loading.widgets && !loading.loadingWidgets?.recent_transactions ? (
          <SubLoader />
        ) : recentTransactions.length > 0 ? (
          <div className="flex flex-col gap-3">
            {recentTransactions.slice(0, 5).map((transaction: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 lg:p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex gap-4 items-center flex-1">
                    <span className="text-gray-400 dark:text-gray-500 text-sm whitespace-nowrap min-w-[80px]">{new Date(transaction.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 min-w-[120px]">{transaction.category}</span>
                    <span className="text-gray-500 text-sm truncate flex-1">{transaction.description || '-'}</span>
                </div>
                <div className={`font-bold ml-4 whitespace-nowrap ${transaction.type === 'credit' ? 'text-green-500' : 'text-gray-900 dark:text-gray-100'}`}>
                  {transaction.type === 'credit' ? '+' : '-'}₹{Math.abs(transaction.amount).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 flex flex-col items-center">
            <p className="text-gray-500 mb-1">No transactions yet</p>
            <small className="text-gray-400">Add your first transaction to get started</small>
          </div>
        )}
      </div>

      {renderMaximizedContent()}

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleTransactionSuccess} />

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
