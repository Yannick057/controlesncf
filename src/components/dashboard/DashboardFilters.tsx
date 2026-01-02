import { useState } from 'react';
import { Calendar, Filter, Train } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface DashboardFiltersState {
  period: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate: Date | undefined;
  endDate: Date | undefined;
  trainType: string;
  line: string;
}

interface DashboardFiltersProps {
  filters: DashboardFiltersState;
  onFiltersChange: (filters: DashboardFiltersState) => void;
  trainTypes: string[];
  lines: string[];
}

export function DashboardFilters({ filters, onFiltersChange, trainTypes, lines }: DashboardFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePeriodChange = (period: DashboardFiltersState['period']) => {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined = now;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'custom':
        startDate = filters.startDate;
        endDate = filters.endDate;
        break;
    }

    onFiltersChange({ ...filters, period, startDate, endDate });
  };

  const handleReset = () => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    onFiltersChange({
      period: 'week',
      startDate: weekAgo,
      endDate: now,
      trainType: 'all',
      line: 'all',
    });
  };

  return (
    <Card className="animate-fade-in">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtres
          </Button>

          <div className="flex flex-wrap gap-2">
            {['week', 'month', 'quarter', 'year'].map((p) => (
              <Button
                key={p}
                variant={filters.period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePeriodChange(p as DashboardFiltersState['period'])}
              >
                {p === 'week' ? '7 jours' : p === 'month' ? '30 jours' : p === 'quarter' ? '3 mois' : '1 an'}
              </Button>
            ))}
          </div>

          {(filters.trainType !== 'all' || filters.line !== 'all') && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Réinitialiser
            </Button>
          )}
        </div>

        {isExpanded && (
          <div className="grid gap-4 mt-4 sm:grid-cols-2 lg:grid-cols-4 animate-slide-up">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Calendar className="h-4 w-4" />
                    {filters.startDate ? format(filters.startDate, 'dd MMM yyyy', { locale: fr }) : 'Sélectionner'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => onFiltersChange({ ...filters, startDate: date, period: 'custom' })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Calendar className="h-4 w-4" />
                    {filters.endDate ? format(filters.endDate, 'dd MMM yyyy', { locale: fr }) : 'Sélectionner'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => onFiltersChange({ ...filters, endDate: date, period: 'custom' })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Type de train</Label>
              <Select 
                value={filters.trainType} 
                onValueChange={(v) => onFiltersChange({ ...filters, trainType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {trainTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ligne</Label>
              <Select 
                value={filters.line} 
                onValueChange={(v) => onFiltersChange({ ...filters, line: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les lignes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les lignes</SelectItem>
                  {lines.map((line) => (
                    <SelectItem key={line} value={line}>{line}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
