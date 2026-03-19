import React, { createContext, useContext, useState, useCallback } from 'react';
import { dashboardService } from '../services/dashboardService';
import { transactionService } from '../services/transactionService';

const DashboardContext = createContext(null);

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
};

export const DashboardProvider = ({ children }) => {
    const [dateFilter, setDateFilter] = useState({
        type: 'all',
        startDate: null,
        endDate: null,
    });

    const [kpis, setKpis] = useState(null);
    const [charts, setCharts] = useState(null);
    const [widgets, setWidgets] = useState(null);
    const [transactions, setTransactions] = useState({ transactions: [], total: 0 });

    const [loading, setLoading] = useState({
        kpis: false, // global kpi loading
        loadingKPIs: {}, // specific kpi loading { income: true, ... }
        charts: false, // global chart loading
        loadingCharts: {}, // specific chart loading { credit_vs_debit: true }
        widgets: false, // global widget loading
        loadingWidgets: {}, // specific widget loading { recent_transactions: true }
        transactions: false,
    });

    const fetchKPIs = useCallback(async (kpiType = null) => {
        if (kpiType) {
            setLoading((prev) => ({
                ...prev,
                loadingKPIs: { ...prev.loadingKPIs, [kpiType]: true }
            }));
        } else {
            setLoading((prev) => ({ ...prev, kpis: true }));
        }

        try {
            const params = {
                filter_type: dateFilter.type,
                ...(dateFilter.startDate && { start_date: dateFilter.startDate }),
                ...(dateFilter.endDate && { end_date: dateFilter.endDate }),
                ...(kpiType && { kpi_type: kpiType })
            };
            const response = await dashboardService.getKPIs(params);

            if (kpiType) {
                // Merge new data with existing
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

    const refreshSingleKPI = useCallback((kpiType) => {
        return fetchKPIs(kpiType);
    }, [fetchKPIs]);

    const fetchCharts = useCallback(async (chartType = null) => {
        if (chartType) {
            setLoading((prev) => ({
                ...prev,
                loadingCharts: { ...prev.loadingCharts, [chartType]: true }
            }));
        } else {
            setLoading((prev) => ({ ...prev, charts: true }));
        }

        try {
            const params = {
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

    const refreshSingleChart = useCallback((chartType) => {
        return fetchCharts(chartType);
    }, [fetchCharts]);

    const fetchWidgets = useCallback(async (widgetType = null) => {
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

    const refreshSingleWidget = useCallback((widgetType) => {
        return fetchWidgets(widgetType);
    }, [fetchWidgets]);

    const fetchTransactions = useCallback(async (params = {}) => {
        setLoading((prev) => ({ ...prev, transactions: true }));
        try {
            const response = await transactionService.getTransactions(params);
            setTransactions(response);
        } catch (error) {
            console.error('Failed to fetch trans actions:', error);
        } finally {
            setLoading((prev) => ({ ...prev, transactions: false }));
        }
    }, []);

    const refreshDashboard = useCallback(() => {
        fetchKPIs();
        fetchCharts();
        fetchWidgets();
    }, [fetchKPIs, fetchCharts, fetchWidgets]);

    const value = {
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
