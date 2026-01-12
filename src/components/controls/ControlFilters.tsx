import { useState } from 'react';
import { Filter, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ControlFiltersState {
  dateStart: string;
  dateEnd: string;
  search: string;
  minFraudRate: number;
  maxFraudRate: number;
}

interface ControlFiltersProps {
  filters: ControlFiltersState;
  onFiltersChange: (filters: ControlFiltersState) => void;
  type: 'onboard' | 'station';
}

const defaultFilters: ControlFiltersState = {
  dateStart: '',
  dateEnd: '',
  search: '',
  minFraudRate: 0,
  maxFraudRate: 100,
};

export function ControlFilters({ filters, onFiltersChange, type }: ControlFiltersProps) {
  const [open, setOpen] = useState(false);
  
  const hasActiveFilters = 
    filters.dateStart !== '' ||
    filters.dateEnd !== '' ||
    filters.search !== '' ||
    filters.minFraudRate !== 0 ||
    filters.maxFraudRate !== 100;

  const activeFilterCount = [
    filters.dateStart || filters.dateEnd,
    filters.search,
    filters.minFraudRate !== 0 || filters.maxFraudRate !== 100,
  ].filter(Boolean).length;

  const resetFilters = () => {
    onFiltersChange(defaultFilters);
  };

  const updateFilter = <K extends keyof ControlFiltersState>(key: K, value: ControlFiltersState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Quick search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={type === 'onboard' ? 'Train, trajet...' : 'Gare, trajet...'}
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-9 w-[180px] sm:w-[220px]"
        />
        {filters.search && (
          <button
            onClick={() => updateFilter('search', '')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Advanced filters popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-4 w-4" />
            Filtres
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtres avancés</h4>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <X className="mr-1 h-3 w-3" />
                  Réinitialiser
                </Button>
              )}
            </div>

            {/* Date range */}
            <div className="space-y-2">
              <Label className="text-sm">Période</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="date"
                    placeholder="Début"
                    value={filters.dateStart}
                    onChange={(e) => updateFilter('dateStart', e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Input
                    type="date"
                    placeholder="Fin"
                    value={filters.dateEnd}
                    onChange={(e) => updateFilter('dateEnd', e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Fraud rate range */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Taux de fraude</Label>
                <span className="text-xs text-muted-foreground">
                  {filters.minFraudRate}% - {filters.maxFraudRate}%
                </span>
              </div>
              <Slider
                value={[filters.minFraudRate, filters.maxFraudRate]}
                onValueChange={([min, max]) => {
                  onFiltersChange({ ...filters, minFraudRate: min, maxFraudRate: max });
                }}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Quick presets */}
            <div className="space-y-2">
              <Label className="text-sm">Raccourcis</Label>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    onFiltersChange({ ...filters, dateStart: today, dateEnd: today });
                  }}
                >
                  Aujourd'hui
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    onFiltersChange({ 
                      ...filters, 
                      dateStart: weekAgo.toISOString().split('T')[0], 
                      dateEnd: today.toISOString().split('T')[0] 
                    });
                  }}
                >
                  7 derniers jours
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    onFiltersChange({ ...filters, minFraudRate: 5, maxFraudRate: 100 });
                  }}
                  className={cn(filters.minFraudRate >= 5 && 'border-destructive text-destructive')}
                >
                  Fraude &gt; 5%
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="hidden sm:flex items-center gap-1">
          {(filters.dateStart || filters.dateEnd) && (
            <Badge variant="secondary" className="text-xs">
              📅 {filters.dateStart || '...'} → {filters.dateEnd || '...'}
              <button 
                onClick={() => onFiltersChange({ ...filters, dateStart: '', dateEnd: '' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {(filters.minFraudRate !== 0 || filters.maxFraudRate !== 100) && (
            <Badge variant="secondary" className="text-xs">
              📊 {filters.minFraudRate}%-{filters.maxFraudRate}%
              <button 
                onClick={() => onFiltersChange({ ...filters, minFraudRate: 0, maxFraudRate: 100 })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export function applyControlFilters<T extends { 
  date: string; 
  fraudRate: number;
  trainNumber?: string;
  origin?: string;
  destination?: string;
  stationName?: string;
  platform?: string;
}>(
  controls: T[],
  filters: ControlFiltersState
): T[] {
  return controls.filter((control) => {
    // Date filter
    if (filters.dateStart && control.date < filters.dateStart) return false;
    if (filters.dateEnd && control.date > filters.dateEnd) return false;

    // Fraud rate filter
    if (control.fraudRate < filters.minFraudRate) return false;
    if (control.fraudRate > filters.maxFraudRate) return false;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchableFields = [
        control.trainNumber,
        control.origin,
        control.destination,
        control.stationName,
        control.platform,
      ].filter(Boolean).map(s => s?.toLowerCase());
      
      if (!searchableFields.some(field => field?.includes(searchLower))) {
        return false;
      }
    }

    return true;
  });
}

export const defaultControlFilters: ControlFiltersState = defaultFilters;
