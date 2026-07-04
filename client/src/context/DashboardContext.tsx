import React, { createContext, useContext, useState, useCallback } from 'react';
import { dashboardService } from '../services/dashboardService';
import { transactionService } from '../services/transactionService';
import type { DateFilterState, KPIs, Transaction } from '../types';

interface LoadingState {
  kpis: boolean;
  loadingKPIs: Record<string, boolean>;
  charts: boolean;
  loadingCharts: Record<string, boolean>;
  widgets: boolean;
  loadingWidgets: Record<string, boolean>;
  transactions: boolean;
}

interface TransactionsState {
  transactions: Transaction[];
  total: number;
}

interface DashboardContextType {
  dateFilter: DateFilterState;
  setDateFilter: React.Dispatch<React.SetStateAction<DateFilterState>>;
  kpis: KPIs | null;
  charts: Record<string, any> | null;
  widgets: Record<string, any> | null;
  transactions: TransactionsState;
  loading: LoadingState;
  fetchKPIs: (kpiType?: string | null) => Promise<void>;
  fetchCharts: (chartType?: string | null) => Promise<void>;
  fetchWidgets: (widgetType?: string | null) => Promise<void>;
  fetchTransactions: (params?: Record<string, any>) => Promise<void>;
  refreshDashboard: () => void;
  refreshSingleKPI: (kpiType: string) => Promise<void>;
  refreshSingleChart: (chartType: string) => Promise<void>;
  refreshSingleWidget: (widgetType: string) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export const useDashboard = (): DashboardContextType => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children }: { children: React.ReactNode }) => {
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    type: 'all',
    startDate: null,
    endDate: null,
  });

  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [charts, setCharts] = useState<Record<string, any> | null>(null);
  const [widgets, setWidgets] = useState<Record<string, any> | null>(null);
  const [transactions, setTransactions] = useState<TransactionsState>({ transactions: [], total: 0 });

  const [loading, setLoading] = useState<LoadingState>({
    kpis: false,
    loadingKPIs: {},
    charts: false,
    loadingCharts: {},
    widgets: false,
    loadingWidgets: {},
    transactions: false,
  });

  const fetchKPIs = useCallback(async (kpiType: string | null = null) => {
    if (kpiType) {
      setLoading((prev) => ({
        ...prev,
        loadingKPIs: { ...prev.loadingKPIs, [kpiType]: true }
      }));
    } else {
      setLoading((prev) => ({ ...prev, kpis: true }));
    }

    try {
      const params: Record<string, any> = {
        filter_type: dateFilter.type,
        ...(dateFilter.startDate && { start_date: dateFilter.startDate }),
        ...(dateFilter.endDate && { end_date: dateFilter.endDate }),
        ...(kpiType && { kpi_type: kpiType })
      };
      const response = await dashboardService.getKPIs(params);

      if (kpiType) {
        setKpis(prev => ({ ...prev, ...response.data }));
      } else {
        setKpis(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch KPIs:', error);
    } finally {
      if (kpiType) {
        setLoading((prev) => ({
          ...prev,
          loadingKPIs: { ...prev.loadingKPIs, [kpiType]: false }
        }));
      } else {
        setLoading((prev) => ({ ...prev, kpis: false }));
      }
    }
  }, [dateFilter]);

  const refreshSingleKPI = useCallback((kpiType: string) => {
    return fetchKPIs(kpiType);
  }, [fetchKPIs]);

  const fetchCharts = useCallback(async (chartType: string | null = null) => {
    if (chartType) {
      setLoading((prev) => ({
        ...prev,
        loadingCharts: { ...prev.loadingCharts, [chartType]: true }
      }));
    } else {
      setLoading((prev) => ({ ...prev, charts: true }));
    }

    try {
      const params: Record<string, any> = {
        filter_type: dateFilter.type,
        ...(dateFilter.startDate && { start_date: dateFilter.startDate }),
        ...(dateFilter.endDate && { end_date: dateFilter.endDate }),
        ...(chartType && { chart_type: chartType })
      };
      const response = await dashboardService.getCharts(params);

      if (chartType) {
        setCharts(prev => ({ ...prev, ...response.data }));
      } else {
        setCharts(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch charts:', error);
    } finally {
      if (chartType) {
        setLoading((prev) => ({
          ...prev,
          loadingCharts: { ...prev.loadingCharts, [chartType]: false }
        }));
      } else {
        setLoading((prev) => ({ ...prev, charts: false }));
      }
    }
  }, [dateFilter]);

  const refreshSingleChart = useCallback((chartType: string) => {
    return fetchCharts(chartType);
  }, [fetchCharts]);

  const fetchWidgets = useCallback(async (widgetType: string | null = null) => {
    if (widgetType) {
      setLoading((prev) => ({
        ...prev,
        loadingWidgets: { ...prev.loadingWidgets, [widgetType]: true }
      }));
    } else {
      setLoading((prev) => ({ ...prev, widgets: true }));
    }

    try {
      const response = await dashboardService.getWidgets({
        filter_type: dateFilter.type,
        ...(dateFilter.startDate && { start_date: dateFilter.startDate }),
        ...(dateFilter.endDate && { end_date: dateFilter.endDate }),
        ...(widgetType && { widget_type: widgetType })
      });

      if (widgetType) {
        setWidgets(prev => ({ ...prev, ...response.data }));
      } else {
        setWidgets(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch widgets:', error);
    } finally {
      if (widgetType) {
        setLoading((prev) => ({
          ...prev,
          loadingWidgets: { ...prev.loadingWidgets, [widgetType]: false }
        }));
      } else {
        setLoading((prev) => ({ ...prev, widgets: false }));
      }
    }
  }, [dateFilter]);

  const refreshSingleWidget = useCallback((widgetType: string) => {
    return fetchWidgets(widgetType);
  }, [fetchWidgets]);

  const fetchTransactions = useCallback(async (params: Record<string, any> = {}) => {
    setLoading((prev) => ({ ...prev, transactions: true }));
    try {
      const response = await transactionService.getTransactions(params);
      setTransactions(response);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading((prev) => ({ ...prev, transactions: false }));
    }
  }, []);

  const refreshDashboard = useCallback(() => {
    fetchKPIs();
    fetchCharts();
    fetchWidgets();
  }, [fetchKPIs, fetchCharts, fetchWidgets]);

  const value: DashboardContextType = {
    dateFilter,
    setDateFilter,
    kpis,
    charts,
    widgets,
    transactions,
    loading,
    fetchKPIs,
    fetchCharts,
    fetchWidgets,
    fetchTransactions,
    refreshDashboard,
    refreshSingleKPI,
    refreshSingleChart,
    refreshSingleWidget,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};
