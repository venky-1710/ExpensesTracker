import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Sector,
    ResponsiveContainer,
    Tooltip,
    Legend
} from 'recharts';
import './Charts.css';

const COLORS = [
    '#B71C1C', // dark red
    '#E65100', // dark orange
    '#F9A825', // dark yellow
    '#1B5E20', // dark green
    '#006064', // dark cyan
    '#0D47A1', // dark blue
    '#4A148C', // dark purple
    '#880E4F', // dark pink
    '#BF360C', // dark tomato
    '#004D40', // dark teal
];

const CategoryChart = ({ data }) => {
    const [activeIndex, setActiveIndex] = React.useState(null);

    if (!data || data.length === 0) {
        return (
            <div className="chart-empty">
                <p>No categories yet</p>
                <small>Add expense transactions to see category breakdown</small>
            </div>
        );
    }

    const total = data.reduce((sum, item) => sum + item.amount, 0);

    const chartData = data.map(item => ({
        name: item.category,
        value: item.amount,
        percent: total > 0 ? ((item.amount / total) * 100).toFixed(1) : '0.0'
    }));

    // Active slice: just expand, no label on slice
    const renderActiveShape = (props) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
        return (
            <g>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius + 12}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                />
            </g>
        );
    };

    // Tooltip: category name — percentage, then value below (smaller)
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const { name, value, percent } = payload[0].payload;
            return (
                <div className="custom-tooltip">
                    <p className="tooltip-label">
                        {name}
                        <span className="tooltip-percent"> — {percent}%</span>
                    </p>
                    <p className="tooltip-value">₹{value.toLocaleString()}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    dataKey="value"
                    stroke="rgba(255, 255, 255, 0.35)"
                    strokeWidth={1.5}
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                >
                    {chartData.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
                            style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                        />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value, entry) => (
                        <span style={{ color: 'var(--legend-text-color, #1f2937)' }}>
                            {`${value}: ₹${entry.payload.value.toLocaleString()}`}
                        </span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default CategoryChart;
