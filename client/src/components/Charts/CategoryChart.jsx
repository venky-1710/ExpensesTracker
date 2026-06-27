import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import {
    TitleComponent,
    TooltipComponent,
    LegendComponent
} from 'echarts/components';
import { PieChart } from 'echarts/charts';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import './Charts.css';

echarts.use([
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    PieChart,
    CanvasRenderer,
    LabelLayout
]);

const COLORS = [
    '#6d4aff',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#3b82f6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#8b5cf6',
    '#06b6d4',
];

const CategoryChart = ({ data }) => {
    const chartRef = useRef(null);
    const instanceRef = useRef(null);

    useEffect(() => {
        if (!chartRef.current) return;

        // Init chart instance once
        if (!instanceRef.current) {
            instanceRef.current = echarts.init(chartRef.current, null, { renderer: 'canvas' });
        }

        const chart = instanceRef.current;

        if (!data || data.length === 0) {
            chart.clear();
            return;
        }

        const total = data.reduce((sum, item) => sum + item.amount, 0);

        const seriesData = data.map((item, index) => ({
            name: item.category,
            value: item.amount,
            percent: total > 0 ? ((item.amount / total) * 100).toFixed(1) : '0.0',
            itemStyle: { color: COLORS[index % COLORS.length] }
        }));

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(15, 10, 40, 0.92)',
                borderColor: 'rgba(109, 74, 255, 0.4)',
                borderWidth: 1,
                borderRadius: 10,
                padding: [10, 14],
                textStyle: {
                    color: '#e2e8f0',
                    fontSize: 13,
                    fontFamily: 'Inter, sans-serif'
                },
                formatter: (params) => {
                    return `
                        <div style="font-weight:600;margin-bottom:4px;">${params.name}</div>
                        <div style="display:flex;justify-content:space-between;gap:20px;">
                            <span style="color:#a78bfa;">Amount</span>
                            <span style="color:#fff;font-weight:600;">₹${params.value.toLocaleString()}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;gap:20px;">
                            <span style="color:#a78bfa;">Share</span>
                            <span style="color:#fff;font-weight:600;">${params.percent}%</span>
                        </div>
                    `;
                }
            },
            legend: {
                type: 'scroll',
                orient: 'horizontal',
                left: 'center',
                bottom: 0,
                icon: 'circle',
                itemWidth: 10,
                itemHeight: 10,
                itemGap: 14,
                textStyle: {
                    color: '#94a3b8',
                    fontSize: 12,
                    fontFamily: 'Inter, sans-serif'
                },
                pageIconColor: '#6d4aff',
                pageIconInactiveColor: '#cbd5e1',
                pageTextStyle: { color: '#94a3b8', fontSize: 11 },
                pageButtonItemGap: 6
            },
            series: [
                {
                    name: 'Category',
                    type: 'pie',
                    radius: '50%',
                    center: ['50%', '45%'],
                    data: seriesData,
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    label: {
                        color: '#94a3b8',
                        fontSize: 12,
                        fontFamily: 'Inter, sans-serif'
                    },
                    animationType: 'scale',
                    animationEasing: 'elasticOut',
                    animationDelay: (idx) => idx * 60
                }
            ]
        };

        chart.setOption(option, true);

        // Handle resize
        const handleResize = () => chart.resize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [data]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (instanceRef.current) {
                instanceRef.current.dispose();
                instanceRef.current = null;
            }
        };
    }, []);

    if (!data || data.length === 0) {
        return (
            <div className="chart-empty">
                <p>No categories yet</p>
                <small>Add expense transactions to see category breakdown</small>
            </div>
        );
    }

    return (
        <div
            ref={chartRef}
            style={{ width: '100%', height: '340px' }}
        />
    );
};

export default CategoryChart;
