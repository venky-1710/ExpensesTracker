import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './Charts.css';

interface DataPoint {
  date: string;
  credits?: number;
  debits?: number;
  balance?: number;
}

interface TooltipPayloadItem {
  color: string;
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

interface Props {
  data: DataPoint[];
}

const IncomeExpenseChart = ({ data }: Props) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <p>No data available</p>
        <small>Add transactions to see your income vs expenses trend</small>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, i) => (
            <p key={i} className="tooltip-value" style={{ color: entry.color, marginBottom: i < payload.length - 1 ? '2px' : 0 }}>
              {entry.name}: ₹{entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary, #8b92a7)', fontSize: 12 }} stroke="var(--border-color, rgba(255,255,255,0.1))" />
        <YAxis tick={{ fill: 'var(--text-secondary, #8b92a7)', fontSize: 12 }} stroke="var(--border-color, rgba(255,255,255,0.1))" />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px' }} formatter={(value) => <span style={{ color: 'var(--legend-text-color, #1f2937)' }}>{value}</span>} />
        <Line type="monotone" dataKey="credits" stroke="#10b981" strokeWidth={2} name="Income" dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="debits" stroke="#ef4444" strokeWidth={2} name="Expenses" dot={{ fill: '#ef4444', r: 4 }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="balance" stroke="#8b5cf6" strokeWidth={2} name="Available Balance" dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default IncomeExpenseChart;
