import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { FiBarChart2 } from 'react-icons/fi';
import api from '../../services/api';
import './SpendingChart.css';

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear - 2, currentYear - 1, currentYear];
const PERIOD_OPTIONS = [
  { label: 'Months', value: 'months' },
  { label: 'Quarters', value: 'quarters' },
];

interface SeriesItem {
  name: string;
  data: number[];
  color: string;
}

interface ChartData {
  labels: string[];
  series: SeriesItem[];
}

const SpendingChart = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const [year, setYear] = useState<number>(currentYear);
  const [period, setPeriod] = useState<string>('months');
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/spending', { params: { year, period } });
      setData(res.data.data);
    } catch (err) {
      console.error('SpendingChart fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [year, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!chartRef.current || !data) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, null, { renderer: 'canvas' });
    }

    const formatVal = (v: number): string => {
      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
      return String(v);
    };

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 10,
        padding: [10, 14],
        textStyle: { color: '#374151', fontSize: 13, fontFamily: 'Inter, sans-serif' },
        axisPointer: { type: 'line', lineStyle: { color: '#6d4aff', width: 1.5, type: 'dashed' } },
        formatter: (params: any[]) => {
          const label = params[0]?.axisValue || '';
          let html = `<div style="font-weight:600;margin-bottom:6px;color:#111827;">&#128197; ${label}</div>`;
          params.forEach(p => {
            html += `<div style="display:flex;justify-content:space-between;align-items:center;gap:24px;margin-bottom:2px;">
              <span style="display:flex;align-items:center;gap:6px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block;"></span>
                <span style="color:#6b7280;">${p.seriesName}</span>
              </span>
              <span style="font-weight:700;color:#111827;">&#8377;${p.value.toLocaleString()}</span>
            </div>`;
          });
          return html;
        }
      },
      legend: {
        top: 0, left: 0, icon: 'circle', itemWidth: 10, itemHeight: 10, itemGap: 20,
        textStyle: { color: '#6b7280', fontSize: 12, fontFamily: 'Inter, sans-serif' }
      },
      grid: { top: 40, right: 16, bottom: 24, left: 52, containLabel: false },
      xAxis: {
        type: 'category', data: data.labels, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#9ca3af', fontSize: 12, fontFamily: 'Inter, sans-serif' }
      },
      yAxis: {
        type: 'value', splitLine: { show: false },
        axisLabel: { color: '#9ca3af', fontSize: 11, fontFamily: 'Inter, sans-serif', formatter: (v: number) => formatVal(v) }
      },
      series: data.series.map((s) => ({
        name: s.name, type: 'line', data: s.data, smooth: true,
        symbol: 'circle', symbolSize: 6, showSymbol: false,
        emphasis: { scale: true, focus: 'series' },
        itemStyle: { color: s.color, borderWidth: 2 },
        lineStyle: { color: s.color, width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: s.color.replace(')', ', 0.18)').replace('rgb', 'rgba') },
            { offset: 1, color: s.color.replace(')', ', 0.01)').replace('rgb', 'rgba') }
          ])
        }
      }))
    };

    chartInstance.current.setOption(option, true);
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  return (
    <div className="spending-card">
      <div className="spending-header">
        <div className="spending-title">
          <FiBarChart2 size={18} />
          <span>Spending</span>
        </div>
        <div className="spending-controls">
          <select className="spending-select" value={year} onChange={e => setYear(Number(e.target.value))}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="spending-select" value={period} onChange={e => setPeriod(e.target.value)}>
            {PERIOD_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>
      {loading ? (
        <div className="spending-loader"><div className="spending-spinner" /></div>
      ) : (
        <div ref={chartRef} style={{ width: '100%', height: '280px' }} />
      )}
    </div>
  );
};

export default SpendingChart;
