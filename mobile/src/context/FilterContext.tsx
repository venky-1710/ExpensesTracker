import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FilterState } from '../components/DateFilterModal';

interface FilterContextType {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  refreshKey: number;
  triggerRefresh: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<FilterState>({
    type: 'all',
    startDate: null,
    endDate: null,
    granularity: 'monthly',
  });

  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  React.useEffect(() => {
    // Auto-refresh data every 60 seconds
    const interval = setInterval(() => {
      triggerRefresh();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <FilterContext.Provider value={{ filter, setFilter, refreshKey, triggerRefresh }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useGlobalFilter() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useGlobalFilter must be used within a FilterProvider');
  }
  return context;
}
