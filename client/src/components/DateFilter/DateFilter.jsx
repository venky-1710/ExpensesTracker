import React, { useState } from 'react';
import { FiCalendar, FiChevronDown } from 'react-icons/fi';
import './DateFilter.css';

const DateFilter = ({ currentFilter, onFilterChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showCustomRange, setShowCustomRange] = useState(false);
    const [customDates, setCustomDates] = useState({ startDate: '', endDate: '' });

    const filterOptions = [
        { label: 'All Time', value: 'all' },
        { label: 'Last 7 Days', value: '6days' },
        { label: 'Last Week', value: 'week' },
        { label: 'Last Month', value: 'month' },
        { label: 'Last 6 Months', value: '6months' },
        { label: 'Last Year', value: 'year' },
        { label: 'Custom Range', value: 'custom' }
    ];

    const handleFilterSelect = (value) => {
        if (value === 'custom') {
            setShowCustomRange(true);
            setIsOpen(false);
        } else {
            setShowCustomRange(false);
            onFilterChange({ type: value, startDate: null, endDate: null });
            setIsOpen(false);
        }
    };

    const handleCustomRangeApply = () => {
        if (customDates.startDate && customDates.endDate) {
            onFilterChange({
                type: 'custom',
                startDate: customDates.startDate,
                endDate: customDates.endDate
            });
            setShowCustomRange(false);
        }
    };

    const getCurrentLabel = () => {
        if (currentFilter.type === 'custom' && currentFilter.startDate && currentFilter.endDate) {
            return `${new Date(currentFilter.startDate).toLocaleDateString()} - ${new Date(currentFilter.endDate).toLocaleDateString()}`;
        }
        const option = filterOptions.find(opt => opt.value === currentFilter.type);
        return option ? option.label : 'All Time';
    };

    return (
        <div className="date-filter">
            <button className="filter-button" onClick={() => setIsOpen(!isOpen)}>
                <FiCalendar size={18} />
                <span>{getCurrentLabel()}</span>
                <FiChevronDown size={16} className={`chevron ${isOpen ? 'open' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="filter-overlay" onClick={() => setIsOpen(false)}></div>
                    <div className="filter-dropdown">
                        {filterOptions.map((option) => (
                            <button
                                key={option.value}
                                className={`filter-option ${currentFilter.type === option.value ? 'active' : ''}`}
                                onClick={() => handleFilterSelect(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {showCustomRange && (
                <>
                    <div className="filter-overlay" onClick={() => setShowCustomRange(false)}></div>
                    <div className="custom-range-modal">
                        <h3>Select Custom Date Range</h3>
                        <div className="date-inputs">
                            <div className="input-group">
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    value={customDates.startDate}
                                    onChange={(e) => setCustomDates({ ...customDates, startDate: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>End Date</label>
                                <input
                                    type="date"
                                    value={customDates.endDate}
                                    onChange={(e) => setCustomDates({ ...customDates, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowCustomRange(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn-apply"
                                onClick={handleCustomRangeApply}
                                disabled={!customDates.startDate || !customDates.endDate}
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DateFilter;
