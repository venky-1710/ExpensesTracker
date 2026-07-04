import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiDownload, FiSearch, FiTrendingUp, FiTrendingDown, FiDollarSign, FiActivity, FiList, FiPieChart } from 'react-icons/fi';
import { transactionService } from '../services/transactionService';
import { useDashboard } from '../context/DashboardContext';
import SubLoader from '../components/SubLoader/SubLoader';
import TransactionFilters from '../components/TransactionFilters/TransactionFilters';
import type { Transaction, TransactionFiltersState } from '../types';

interface Stats {
  totalCredits: number;
  totalDebits: number;
  availableBalance: number;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface ViewConfig {
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  description: string;
}

const DetailView = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { dateFilter, kpis, fetchKPIs } = useDashboard();

  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<Stats>({ totalCredits: 0, totalDebits: 0, availableBalance: 0 });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [filters, setFilters] = useState<TransactionFiltersState>({ category: '', payment_method: '', type: '' });

  useEffect(() => { if (!kpis) fetchKPIs(); }, [kpis, fetchKPIs]);
  useEffect(() => { fetchData(); }, [type, dateFilter, itemsPerPage, currentPage, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        filter_type: dateFilter.type, limit: 1000,
        ...(dateFilter.startDate && { start_date: dateFilter.startDate }),
        ...(dateFilter.endDate && { end_date: dateFilter.endDate }),
        ...filters
      };
      Object.keys(params).forEach(key => { if (params[key] === '' || params[key] === null) delete params[key]; });
      if (type === 'income') params.type = 'credit';
      else if (type === 'expense') params.type = 'debit';

      const response = await transactionService.getTransactions(params);
      setData(response.transactions || []);
      setStats({
        totalCredits: response.total_credits || 0,
        totalDebits: response.total_debits || 0,
        availableBalance: response.available_balance || 0
      });
    } catch (error) {
      console.error('Failed to fetch detail data:', error);
    } finally { setLoading(false); }
  };

  const handleExport = async (format: string) => {
    try {
      const params: Record<string, any> = {
        format, filter_type: dateFilter.type,
        ...(dateFilter.startDate && { start_date: dateFilter.startDate }),
        ...(dateFilter.endDate && { end_date: dateFilter.endDate }),
        ...filters
      };
      if (type === 'income') params.type = 'credit';
      if (type === 'expense') params.type = 'debit';
      Object.keys(params).forEach(key => { if (params[key] === '' || params[key] === null) delete params[key]; });
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

  const getViewConfig = (): ViewConfig => {
    const configs: Record<string, ViewConfig> = {
      income: { title: 'Income Details', icon: FiTrendingUp, color: '#10b981', description: 'Detailed view of all your income sources' },
      expense: { title: 'Expense Details', icon: FiTrendingDown, color: '#ef4444', description: 'Detailed breakdown of your expenses' },
      balance: { title: 'Balance History', icon: FiDollarSign, color: '#6d4aff', description: 'Track your balance changes over time' },
      transactions: { title: 'All Transactions', icon: FiActivity, color: '#f59e0b', description: 'Complete history of all transactions' },
      recent_transactions: { title: 'Recent Activity', icon: FiList, color: '#6d4aff', description: 'Your most recent financial activity' },
      top_categories: { title: 'Category Breakdown', icon: FiPieChart, color: '#c850ff', description: 'Spending analysis by category' }
    };
    return configs[type || ''] || configs.transactions;
  };

  const viewConfig = getViewConfig();

  const handleSort = (key: string) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const processedData = [...data]
    .filter(item =>
      searchTerm === '' ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortConfig.key === 'date') {
        return sortConfig.direction === 'asc'
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime();
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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(processedData.length / itemsPerPage);

  return (
    <div className="max-w-[1400px] mx-auto pb-10">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <button className="px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm" onClick={() => navigate('/dashboard')}>
              <FiArrowLeft size={18} />
            </button>
            <div className="p-2 rounded-lg flex items-center justify-center" style={{ background: `${viewConfig.color}20`, color: viewConfig.color }}>
              <viewConfig.icon size={24} />
            </div>
            <h1 className="m-0 text-3xl font-bold text-gray-900 dark:text-white">{viewConfig.title}</h1>
          </div>
          <p className="m-0 text-gray-500 text-sm ml-[62px]">{viewConfig.description}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-[200px]" />
          </div>
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm" onClick={() => setShowExportMenu(!showExportMenu)}>
              <FiDownload size={18} /> Export
            </button>
            {showExportMenu && (
              <div className="absolute top-full right-0 mt-2 min-w-[160px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-none cursor-pointer bg-transparent" onClick={() => handleExport('csv')}>Export as CSV</button>
                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-none cursor-pointer bg-transparent" onClick={() => handleExport('xlsx')}>Export as Excel</button>
                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-none cursor-pointer bg-transparent" onClick={() => handleExport('pdf')}>Export as PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 flex flex-col gap-2">
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Total Credits</span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">+₹{stats.totalCredits?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-2xl border border-red-100 dark:border-red-800/30 flex flex-col gap-2">
          <span className="text-sm font-medium text-red-700 dark:text-red-400">Total Debits</span>
          <span className="text-2xl font-bold text-red-600 dark:text-red-500">-₹{stats.totalDebits?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 flex flex-col gap-2">
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Current Balance</span>
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-500">₹{stats.availableBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
        </div>
      </div>

      <div className="mb-6">
        <TransactionFilters filters={filters} onFilterChange={setFilters} />
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-500">
          <SubLoader />
          <p>Loading transactions...</p>
        </div>
      ) : processedData.length > 0 ? (
        <>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden mb-6 overflow-x-auto">
            <div className="grid grid-cols-[100px_1fr_2fr_1.5fr_120px_100px] lg:grid-cols-[120px_1.5fr_2fr_1.5fr_150px_120px] gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[800px]">
              <div className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 select-none flex items-center gap-1" onClick={() => handleSort('date')}>
                Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
              <div className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 select-none flex items-center gap-1" onClick={() => handleSort('category')}>
                Category {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
              <div>Description</div>
              <div>Payment Method</div>
              <div className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 select-none flex items-center gap-1 justify-end" onClick={() => handleSort('amount')}>
                Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
              <div className="text-center">Status</div>
            </div>
            <div className="flex flex-col min-w-[800px]">
              {currentItems.map((item, index) => (
                <div key={item.id || index} className="grid grid-cols-[100px_1fr_2fr_1.5fr_120px_100px] lg:grid-cols-[120px_1.5fr_2fr_1.5fr_150px_120px] gap-4 p-4 items-center border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="text-sm text-gray-500">{new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${item.type === 'credit' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {item.category}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{item.description || 'No description'}</div>
                  <div className="text-sm text-gray-500 truncate">{item.payment_method}</div>
                  <div className={`text-right text-sm font-bold ${item.type === 'credit' ? 'text-emerald-500' : 'text-gray-900 dark:text-gray-100'}`}>
                    {item.type === 'credit' ? '+' : '-'}₹{Math.abs(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex justify-center">
                    <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30 px-2 py-1 rounded">Completed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Previous</button>
              <span className="text-sm text-gray-500 font-medium">Page {currentPage} of {totalPages}</span>
              <button className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage >= totalPages}>Next</button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-20 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="text-5xl mb-4">📂</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 m-0">No records found</h3>
          <p className="text-gray-500 m-0 text-sm">Try adjusting your search or filters to find what you're looking for.</p>
        </div>
      )}
    </div>
  );
};

export default DetailView;
