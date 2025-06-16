
import React from 'react';
import { FilterPeriod, CustomDateRange } from '../types';
import { FILTER_PERIOD_OPTIONS } from '../constants';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface FilterControlsProps {
  currentFilter: FilterPeriod;
  onFilterChange: (filter: FilterPeriod) => void;
  customRange: CustomDateRange;
  onCustomRangeChange: (name: keyof CustomDateRange, value: string) => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({ 
  currentFilter, 
  onFilterChange,
  customRange,
  onCustomRangeChange
}) => {
  return (
    <div className="p-4 bg-slate-800 rounded-lg shadow mb-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTER_PERIOD_OPTIONS.map(option => (
          <Button
            key={option.id}
            variant={currentFilter === option.id ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onFilterChange(option.id as FilterPeriod)}
            aria-pressed={currentFilter === option.id}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {currentFilter === FilterPeriod.CUSTOM && (
        <div className="grid md:grid-cols-2 gap-4 p-4 border border-slate-700 rounded-md bg-slate-800/50">
          <Input
            type="date"
            label="Desde"
            id="startDate"
            value={customRange.startDate}
            onChange={(e) => onCustomRangeChange('startDate', e.target.value)}
            containerClassName="mb-0"
          />
          <Input
            type="date"
            label="Hasta"
            id="endDate"
            value={customRange.endDate}
            onChange={(e) => onCustomRangeChange('endDate', e.target.value)}
            containerClassName="mb-0"
          />
        </div>
      )}
    </div>
  );
};
