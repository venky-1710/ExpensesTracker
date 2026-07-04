import React, { useState, useRef, useEffect } from 'react';
import { FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight, FiBarChart2 } from 'react-icons/fi';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays,
  subDays, subMonths as subM, startOfDay, endOfDay,
  isBefore, isAfter, isWithinInterval, startOfYear,
  subQuarters, startOfQuarter, endOfQuarter, subWeeks, differenceInDays
} from 'date-fns';
import './DateFilter.css';
import type { DateFilterState } from '../../types';

interface Props {
  currentFilter: DateFilterState;
  onFilterChange: (filter: DateFilterState) => void;
}

const DateFilter = ({ currentFilter, onFilterChange }: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentMonthView, setCurrentMonthView] = useState<Date>(new Date());
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<string>('auto');
  const filterRef = useRef<HTMLDivElement>(null);

  const filterOptions = [
    { label: 'All Time',        value: 'all' },
    { label: 'Last 7 Days',     value: '6days' },
    { label: 'Last Week',       value: 'lastWeek' },
    { label: 'Last 30 Days',    value: '30days' },
    { label: 'Last Month',      value: 'month' },
    { label: 'Last 6 Months',   value: '6months' },
    { label: 'Last Quadrant',   value: 'lastQuadrant' },
    { label: 'Current MTD',     value: 'mtd' },
    { label: 'Current YTD',     value: 'ytd' },
    { label: 'Custom Range',    value: 'custom' }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentFilter?.type === 'custom' && currentFilter.startDate && currentFilter.endDate) {
      setSelectionStart(new Date(currentFilter.startDate));
      setSelectionEnd(new Date(currentFilter.endDate));
      setCurrentMonthView(new Date(currentFilter.startDate));
      setSelectedPreset(null);
    } else {
      setSelectionStart(null);
      setSelectionEnd(null);
      setCurrentMonthView(new Date());
      setSelectedPreset(currentFilter ? currentFilter.type : null);
    }
    if (currentFilter?.granularity) {
      setGranularity(currentFilter.granularity);
    } else {
      const type = currentFilter ? currentFilter.type : null;
      const days = getDaysDuration(null, null, type);
      setGranularity(days > 31 ? 'monthly' : 'daily');
    }
  }, [currentFilter, isOpen]);

  const getDaysDuration = (start: Date | null, end: Date | null, type: string | null) => {
    if (type === 'custom' && start && end) {
      return Math.abs(differenceInDays(end, start));
    }
    switch (type) {
      case '6days': return 6;
      case 'lastWeek': return 7;
      case '30days':
      case 'month':
      case 'mtd': return 30;
      case 'lastQuadrant': return 90;
      case '6months': return 180;
      case 'year':
      case 'ytd': return 365;
      case 'all': return 3650;
      default: return 30;
    }
  };

  const getGranularityOptions = () => {
    const type = selectedPreset || currentFilter?.type;
    const days = getDaysDuration(selectionStart, selectionEnd, type);
    
    if (days <= 31) {
      return [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' }
      ];
    } else if (days <= 366) {
      return [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' }
      ];
    } else {
      return [
        { label: 'Monthly', value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' },
        { label: 'Yearly', value: 'yearly' }
      ];
    }
  };

  const handleFilterSelect = (value: string) => {
    if (value === 'custom') { setSelectedPreset('custom'); return; }
    
    const days = getDaysDuration(null, null, value);
    const defaultGran = days > 31 ? 'monthly' : 'daily';
    setGranularity(defaultGran);

    if (value === 'all') {
      setSelectedPreset(value);
      onFilterChange({
        type: value,
        startDate: null,
        endDate: null,
        granularity: defaultGran
      });
      setIsOpen(false);
      return;
    }

    const today = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (value) {
      case '6days':
        startDate = startOfDay(subDays(today, 6));
        endDate = endOfDay(today);
        break;
      case '30days':
        startDate = startOfDay(subDays(today, 29));
        endDate = endOfDay(today);
        break;
      case 'lastWeek': {
        const lastW = subWeeks(today, 1);
        startDate = startOfWeek(lastW);
        endDate = endOfWeek(lastW);
        break;
      }
      case 'month': {
        const lastMonth = subM(today, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      }
      case '6months':
        startDate = startOfDay(subMonths(today, 6));
        endDate = endOfDay(today);
        break;
      case 'lastQuadrant': {
        const lastQ = subQuarters(today, 1);
        startDate = startOfQuarter(lastQ);
        endDate = endOfQuarter(lastQ);
        break;
      }
      case 'mtd':
        startDate = startOfMonth(today);
        endDate = endOfDay(today);
        break;
      case 'ytd':
        startDate = startOfYear(today);
        endDate = endOfDay(today);
        break;
    }

    if (startDate && endDate) {
      setSelectedPreset(value);
      setSelectionStart(startDate);
      setSelectionEnd(endDate);
      setCurrentMonthView(startDate);
    }
  };

  const onDateClick = (day: Date) => {
    setSelectedPreset('custom');
    if (!selectionStart || (selectionStart && selectionEnd)) {
      setSelectionStart(startOfDay(day));
      setSelectionEnd(null);
    } else {
      if (isBefore(day, selectionStart)) {
        setSelectionStart(startOfDay(day));
        setSelectionEnd(null);
      } else {
        setSelectionEnd(endOfDay(day));
      }
    }
  };

  const handleApplyCustom = () => {
    if (selectionStart && selectionEnd) {
      const backendSupported = ['all', '6days', 'week', 'month', '6months', 'year'];
      let typeToEmit = 'custom';
      if (selectedPreset && backendSupported.includes(selectedPreset)) {
        typeToEmit = selectedPreset;
      }
      onFilterChange({
        type: typeToEmit,
        startDate: selectionStart.toISOString(),
        endDate: selectionEnd.toISOString(),
        granularity: granularity
      });
      setIsOpen(false);
    } else if (selectedPreset || currentFilter) {
      onFilterChange({
        ...(currentFilter || { type: selectedPreset || 'all', startDate: null, endDate: null }),
        type: selectedPreset || currentFilter?.type || 'all',
        granularity: granularity
      });
      setIsOpen(false);
    }
  };

  const renderHeader = () => (
    <div className="calendar-header">
      <button type="button" onClick={() => setCurrentMonthView(subMonths(currentMonthView, 1))} className="nav-btn">
        <FiChevronLeft />
      </button>
      <div className="current-month">{format(currentMonthView, 'MMMM yyyy')}</div>
      <button type="button" onClick={() => setCurrentMonthView(addMonths(currentMonthView, 1))} className="nav-btn">
        <FiChevronRight />
      </button>
    </div>
  );

  const renderDays = () => {
    const days: JSX.Element[] = [];
    const startDate = startOfWeek(currentMonthView);
    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="weekday" key={i}>
          {format(addDays(startDate, i), 'eeee').substring(0, 2)}
        </div>
      );
    }
    return <div className="weekdays-row">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonthView);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows: JSX.Element[] = [];
    let days: JSX.Element[] = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'd');
        const cloneDay = day;
        const isSelected = !!(
          (selectionStart && isSameDay(day, selectionStart)) ||
          (selectionEnd && isSameDay(day, selectionEnd))
        );
        const isStart = !!(selectionStart && isSameDay(day, selectionStart));
        const isEnd = !!(selectionEnd && isSameDay(day, selectionEnd));
        const isInRange = !!(
          (selectionStart && selectionEnd && isWithinInterval(day, { start: selectionStart, end: selectionEnd })) ||
          (selectionStart && !selectionEnd && hoverDate && isAfter(hoverDate, selectionStart) && isWithinInterval(day, { start: selectionStart, end: hoverDate }))
        );

        days.push(
          <div
            className={`day-cell ${!isSameMonth(day, monthStart) ? 'disabled' : isSelected ? 'selected' : isInRange ? 'in-range' : ''} ${isSameDay(day, new Date()) ? 'today' : ''} ${isStart ? 'range-start' : ''} ${isEnd ? 'range-end' : ''}`}
            key={day.toString()}
            onClick={() => onDateClick(cloneDay)}
            onMouseEnter={() => setHoverDate(cloneDay)}
          >
            <span className="day-number">{formattedDate}</span>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="days-row" key={day.toString()}>{days}</div>);
      days = [];
    }
    return <div className="days-grid">{rows}</div>;
  };

  const getCurrentLabel = (): string => {
    if (currentFilter?.type === 'custom' && currentFilter.startDate && currentFilter.endDate) {
      return `${format(new Date(currentFilter.startDate), 'MMM d, yyyy')} - ${format(new Date(currentFilter.endDate), 'MMM d, yyyy')}`;
    }
    const option = filterOptions.find(opt => currentFilter && opt.value === currentFilter.type);
    if (option) {
      if (currentFilter.startDate && currentFilter.endDate) {
        return `${format(new Date(currentFilter.startDate), 'MMM d, yyyy')} - ${format(new Date(currentFilter.endDate), 'MMM d, yyyy')}`;
      }
      return option.label;
    }
    if (currentFilter?.startDate && currentFilter.endDate) {
      return `${format(new Date(currentFilter.startDate), 'MMM d, yyyy')} - ${format(new Date(currentFilter.endDate), 'MMM d, yyyy')}`;
    }
    return 'All Time';
  };

  const isActiveSidebar = (val: string): boolean => {
    if (selectedPreset !== null) return selectedPreset === val;
    if (!currentFilter) return false;
    if (currentFilter.type === val) return true;
    if (val === 'custom' && (selectionStart || currentFilter.type === 'custom')) return true;
    return false;
  };

  return (
    <div className="date-filter custom-picker-wrapper" ref={filterRef}>
      <button className="filter-button" onClick={() => setIsOpen(!isOpen)}>
        <FiCalendar size={18} />
        <span>{getCurrentLabel()}</span>
        <FiChevronDown size={16} className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="filter-overlay" onClick={() => setIsOpen(false)} />
          <div className="date-picker-popover">
            <div className="picker-sidebar">
              <ul>
                {filterOptions.map((option) => (
                  <li
                    key={option.value}
                    className={isActiveSidebar(option.value) ? 'active' : ''}
                    onClick={() => handleFilterSelect(option.value)}
                  >
                    {option.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="picker-calendar">
              {renderHeader()}
              {renderDays()}
              {renderCells()}
              <div className="picker-footer flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="selected-range-text">
                    {selectionStart ? format(selectionStart, 'MMM d, yyyy') : 'Start Date'}
                    {' - '}
                    {selectionEnd ? format(selectionEnd, 'MMM d, yyyy') : 'End Date'}
                  </div>
                  
                  <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-3 ml-1 flex-wrap">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Granularity:</span>
                    <div className="flex gap-1 flex-wrap">
                      {getGranularityOptions().map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`px-2 py-1 text-xs rounded-md border transition-colors ${granularity === opt.value ? 'bg-[#6d4aff] text-white border-[#6d4aff]' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          onClick={() => setGranularity(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="picker-actions">
                  <button className="btn-cancel" onClick={() => setIsOpen(false)}>Cancel</button>
                  <button
                    className="btn-apply"
                    onClick={handleApplyCustom}
                    disabled={(!selectionStart || !selectionEnd) && !selectedPreset && !currentFilter}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DateFilter;
