import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Download, FileSpreadsheet, FileText, Printer, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ExportFilters, exportToHTML, exportToPDF, exportToCSV, filterOnboardControls, filterStationControls } from '@/utils/exportControls';
import { OnboardControl, StationControl } from '@/hooks/useSupabaseControls';

interface ExportFilterDialogProps {
  controls: OnboardControl[] | StationControl[];
  type: 'onboard' | 'station';
  trigger?: React.ReactNode;
}

export function ExportFilterDialog({ controls, type, trigger }: ExportFilterDialogProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<ExportFilters>({});
  const [fraudRange, setFraudRange] = useState<[number, number]>([0, 100]);

  // Calculate filtered count
  const getFilteredCount = () => {
    const activeFilters: ExportFilters = {
      ...filters,
      minFraudRate: fraudRange[0] > 0 ? fraudRange[0] : undefined,
      maxFraudRate: fraudRange[1] < 100 ? fraudRange[1] : undefined,
    };
    
    if (type === 'onboard') {
      return filterOnboardControls(controls as OnboardControl[], activeFilters).length;
    }
    return filterStationControls(controls as StationControl[], activeFilters).length;
  };

  const handleExport = (format: 'html' | 'pdf' | 'csv') => {
    const activeFilters: ExportFilters = {
      ...filters,
      minFraudRate: fraudRange[0] > 0 ? fraudRange[0] : undefined,
      maxFraudRate: fraudRange[1] < 100 ? fraudRange[1] : undefined,
    };

    switch (format) {
      case 'html':
        exportToHTML(controls, type, activeFilters);
        break;
      case 'pdf':
        exportToPDF(controls, type, activeFilters);
        break;
      case 'csv':
        exportToCSV(controls, type, activeFilters);
        break;
    }
    setOpen(false);
  };

  const resetFilters = () => {
    setFilters({});
    setFraudRange([0, 100]);
  };

  const hasActiveFilters = 
    filters.dateStart || 
    filters.dateEnd || 
    filters.trainNumber || 
    filters.stationName ||
    filters.origin || 
    filters.destination || 
    fraudRange[0] > 0 || 
    fraudRange[1] < 100;

  const filteredCount = getFilteredCount();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Exporter les contrôles {type === 'onboard' ? 'à bord' : 'en gare'}
          </DialogTitle>
          <DialogDescription>
            Configurez les filtres avant d'exporter. {controls.length} contrôle(s) disponible(s).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Période</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !filters.dateStart && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateStart ? format(new Date(filters.dateStart), 'P', { locale: fr }) : 'Date début'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateStart ? new Date(filters.dateStart) : undefined}
                    onSelect={(date) => setFilters(f => ({ ...f, dateStart: date ? format(date, 'yyyy-MM-dd') : undefined }))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !filters.dateEnd && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateEnd ? format(new Date(filters.dateEnd), 'P', { locale: fr }) : 'Date fin'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateEnd ? new Date(filters.dateEnd) : undefined}
                    onSelect={(date) => setFilters(f => ({ ...f, dateEnd: date ? format(date, 'yyyy-MM-dd') : undefined }))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Train/Station filter based on type */}
          {type === 'onboard' ? (
            <div className="space-y-2">
              <Label htmlFor="trainNumber" className="text-sm font-medium">Numéro de train</Label>
              <Input
                id="trainNumber"
                placeholder="Ex: TGV 1234"
                value={filters.trainNumber || ''}
                onChange={(e) => setFilters(f => ({ ...f, trainNumber: e.target.value || undefined }))}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="stationName" className="text-sm font-medium">Nom de la gare</Label>
              <Input
                id="stationName"
                placeholder="Ex: Metz-Ville"
                value={filters.stationName || ''}
                onChange={(e) => setFilters(f => ({ ...f, stationName: e.target.value || undefined }))}
              />
            </div>
          )}

          {/* Origin & Destination */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="origin" className="text-sm font-medium">Origine</Label>
              <Input
                id="origin"
                placeholder="Ville de départ"
                value={filters.origin || ''}
                onChange={(e) => setFilters(f => ({ ...f, origin: e.target.value || undefined }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination" className="text-sm font-medium">Destination</Label>
              <Input
                id="destination"
                placeholder="Ville d'arrivée"
                value={filters.destination || ''}
                onChange={(e) => setFilters(f => ({ ...f, destination: e.target.value || undefined }))}
              />
            </div>
          </div>

          {/* Fraud Rate Range */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Taux de fraude</Label>
              <span className="text-sm text-muted-foreground">
                {fraudRange[0]}% - {fraudRange[1]}%
              </span>
            </div>
            <Slider
              value={fraudRange}
              onValueChange={(value) => setFraudRange(value as [number, number])}
              min={0}
              max={100}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Résultat du filtre</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs gap-1">
                  <X className="h-3 w-3" />
                  Réinitialiser
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={filteredCount === controls.length ? "secondary" : "default"}>
                {filteredCount} contrôle(s)
              </Badge>
              {filteredCount !== controls.length && (
                <span className="text-xs text-muted-foreground">
                  sur {controls.length} au total
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleExport('csv')}
            disabled={filteredCount === 0}
            className="gap-2 w-full sm:w-auto"
          >
            <FileSpreadsheet className="h-4 w-4" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleExport('html')}
            disabled={filteredCount === 0}
            className="gap-2 w-full sm:w-auto"
          >
            <FileText className="h-4 w-4" />
            HTML
          </Button>
          <Button 
            onClick={() => handleExport('pdf')}
            disabled={filteredCount === 0}
            className="gap-2 w-full sm:w-auto"
          >
            <Printer className="h-4 w-4" />
            Imprimer / PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
