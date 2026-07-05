import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FilterState } from '../components/DateFilterModal';

interface FilterContextType {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<FilterState>({
    type: 'all',
    startDate: null,
    endDate: null,
    granularity: 'monthly',
  });

  return (
    <FilterContext.Provider value={{ filter, setFilter }}>
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
