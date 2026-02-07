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
        type: 'month',
        startDate: null,
        endDate: null,
    });

    const [kpis, setKpis] = useState(null);
    const [charts, setCharts] = useState(null);
    const [widgets, setWidgets] = useState(null);
    const [transactions, setTransactions] = useState({ transactions: [], total: 0 });

    const [loading, setLoading] = useState({
        kpis: false,
        charts: false,
        widgets: false,
        transactions: false,
    });

    const fetchKPIs = useCallback(async () => {
        setLoading((prev) => ({ ...prev, kpis: true }));
        try {
            const params = {
                filter_type: dateFilter.type,
                ...(dateFilter.startDate && { start_date: dateFilter.startDate }),
                ...(dateFilter.endDate && { end_date: dateFilter.endDate }),
            };
            const response = await dashboardService.getKPIs(params);
            setKpis(response.data);
        } catch (error) {
            console.error('Failed to fetch KPIs:', error);
        } finally {
            setLoading((prev) => ({ ...prev, kpis: false }));
        }
    }, [dateFilter]);

    const fetchCharts = useCallback(async () => {
        setLoading((prev) => ({ ...prev, charts: true }));
        try {
            const params = {
                filter_type: dateFilter.type,
                ...(dateFilter.startDate && { start_date: dateFilter.startDate }),
                ...(dateFilter.endDate && { end_date: dateFilter.endDate }),
            };
            const response = await dashboardService.getCharts(params);
            setCharts(response.data);
        } catch (error) {
            console.error('Failed to fetch charts:', error);
        } finally {
            setLoading((prev) => ({ ...prev, charts: false }));
        }
    }, [dateFilter]);

    const fetchWidgets = useCallback(async () => {
        setLoading((prev) => ({ ...prev, widgets: true }));
        try {
            const response = await dashboardService.getWidgets({
                filter_type: dateFilter.type,
            });
            setWidgets(response.data);
        } catch (error) {
            console.error('Failed to fetch widgets:', error);
        } finally {
            setLoading((prev) => ({ ...prev, widgets: false }));
        }
    }, [dateFilter]);

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
    };

    return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};
