import { useState, useMemo } from 'react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { generatePDFReport, openHTMLReport, downloadHTMLReport } from '@/utils/generateReport';
import { toast } from 'sonner';
import { FileDown, Globe, CalendarIcon, Download, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ControlData {
  trainNumber?: string;
  stationName?: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  passengers: number;
  fraudCount: number;
  fraudRate: number;
}

interface ReportGeneratorDialogProps {
  onboardControls: ControlData[];
  stationControls: ControlData[];
  teamName?: string;
  trigger?: React.ReactNode;
}

type PeriodType = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export function ReportGeneratorDialog({
  onboardControls,
  stationControls,
  teamName,
  trigger,
}: ReportGeneratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>('today');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  const getDateRange = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    switch (periodType) {
      case 'today':
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return { start: todayStart, end: today };
      case 'yesterday':
        const yesterdayStart = subDays(today, 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = subDays(today, 1);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return { start: yesterdayStart, end: yesterdayEnd };
      case 'week':
        return { 
          start: startOfWeek(today, { locale: fr }), 
          end: endOfWeek(today, { locale: fr }) 
        };
      case 'month':
        return { 
          start: startOfMonth(today), 
          end: endOfMonth(today) 
        };
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
        return { start: today, end: today };
      default:
        return { start: today, end: today };
    }
  }, [periodType, customStartDate, customEndDate]);

  const filteredOnboardControls = useMemo(() => {
    const { start, end } = getDateRange;
    return onboardControls.filter(c => {
      const controlDate = parseISO(c.date);
      return isWithinInterval(controlDate, { start, end });
    });
  }, [onboardControls, getDateRange]);

  const filteredStationControls = useMemo(() => {
    const { start, end } = getDateRange;
    return stationControls.filter(c => {
      const controlDate = parseISO(c.date);
      return isWithinInterval(controlDate, { start, end });
    });
  }, [stationControls, getDateRange]);

  const getPeriodLabel = () => {
    const { start, end } = getDateRange;
    switch (periodType) {
      case 'today':
        return format(start, 'dd MMMM yyyy', { locale: fr });
      case 'yesterday':
        return format(start, 'dd MMMM yyyy', { locale: fr });
      case 'week':
        return `Semaine du ${format(start, 'dd MMM', { locale: fr })} au ${format(end, 'dd MMM yyyy', { locale: fr })}`;
      case 'month':
        return format(start, 'MMMM yyyy', { locale: fr });
      case 'custom':
        if (customStartDate && customEndDate) {
          return `Du ${format(customStartDate, 'dd MMM', { locale: fr })} au ${format(customEndDate, 'dd MMM yyyy', { locale: fr })}`;
        }
        return 'Sélectionnez des dates';
      default:
        return '';
    }
  };

  const getReportTitle = () => {
    switch (periodType) {
      case 'today':
        return 'Rapport journalier';
      case 'yesterday':
        return 'Rapport de la veille';
      case 'week':
        return 'Rapport hebdomadaire';
      case 'month':
        return 'Rapport mensuel';
      case 'custom':
        return 'Rapport personnalisé';
      default:
        return 'Rapport';
    }
  };

  const stats = useMemo(() => {
    const totalControls = filteredOnboardControls.length + filteredStationControls.length;
    const totalPassengers = [...filteredOnboardControls, ...filteredStationControls].reduce(
      (sum, c) => sum + c.passengers, 0
    );
    const totalFraud = [...filteredOnboardControls, ...filteredStationControls].reduce(
      (sum, c) => sum + c.fraudCount, 0
    );
    return { totalControls, totalPassengers, totalFraud };
  }, [filteredOnboardControls, filteredStationControls]);

  const handleGeneratePDF = () => {
    if (stats.totalControls === 0) {
      toast.error('Aucune donnée pour cette période');
      return;
    }

    generatePDFReport({
      title: getReportTitle(),
      period: getPeriodLabel(),
      teamName,
      onboardControls: filteredOnboardControls.map(c => ({
        trainNumber: c.trainNumber,
        origin: c.origin,
        destination: c.destination,
        date: c.date,
        time: c.time,
        passengers: c.passengers,
        fraudCount: c.fraudCount,
        fraudRate: c.fraudRate,
      })),
      stationControls: filteredStationControls.map(c => ({
        station_name: c.stationName,
        origin: c.origin,
        destination: c.destination,
        date: c.date,
        time: c.time,
        passengers: c.passengers,
        fraudCount: c.fraudCount,
        fraudRate: c.fraudRate,
      })),
    });
    toast.success('Rapport PDF généré');
    setOpen(false);
  };

  const handleGenerateHTML = (download: boolean = false) => {
    if (stats.totalControls === 0) {
      toast.error('Aucune donnée pour cette période');
      return;
    }

    const options = {
      title: getReportTitle(),
      period: getPeriodLabel(),
      teamName,
      onboardControls: filteredOnboardControls.map(c => ({
        trainNumber: c.trainNumber,
        origin: c.origin,
        destination: c.destination,
        date: c.date,
        time: c.time,
        passengers: c.passengers,
        fraudCount: c.fraudCount,
        fraudRate: c.fraudRate,
      })),
      stationControls: filteredStationControls.map(c => ({
        station_name: c.stationName,
        origin: c.origin,
        destination: c.destination,
        date: c.date,
        time: c.time,
        passengers: c.passengers,
        fraudCount: c.fraudCount,
        fraudRate: c.fraudRate,
      })),
    };

    if (download) {
      downloadHTMLReport(options);
      toast.success('Rapport HTML téléchargé');
    } else {
      openHTMLReport(options);
    }
    setOpen(false);
  };

  const isCustomValid = periodType !== 'custom' || (customStartDate && customEndDate);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Générer un rapport
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Générer un rapport</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Period Selection */}
          <div className="space-y-3">
            <Label>Période</Label>
            <RadioGroup
              value={periodType}
              onValueChange={(v) => setPeriodType(v as PeriodType)}
              className="grid grid-cols-2 gap-2"
            >
              <Label
                htmlFor="today"
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors',
                  periodType === 'today' ? 'border-primary bg-primary/10' : 'hover:bg-secondary'
                )}
              >
                <RadioGroupItem value="today" id="today" />
                Aujourd'hui
              </Label>
              <Label
                htmlFor="yesterday"
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors',
                  periodType === 'yesterday' ? 'border-primary bg-primary/10' : 'hover:bg-secondary'
                )}
              >
                <RadioGroupItem value="yesterday" id="yesterday" />
                Hier
              </Label>
              <Label
                htmlFor="week"
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors',
                  periodType === 'week' ? 'border-primary bg-primary/10' : 'hover:bg-secondary'
                )}
              >
                <RadioGroupItem value="week" id="week" />
                Cette semaine
              </Label>
              <Label
                htmlFor="month"
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors',
                  periodType === 'month' ? 'border-primary bg-primary/10' : 'hover:bg-secondary'
                )}
              >
                <RadioGroupItem value="month" id="month" />
                Ce mois
              </Label>
              <Label
                htmlFor="custom"
                className={cn(
                  'col-span-2 flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors',
                  periodType === 'custom' ? 'border-primary bg-primary/10' : 'hover:bg-secondary'
                )}
              >
                <RadioGroupItem value="custom" id="custom" />
                Période personnalisée
              </Label>
            </RadioGroup>
          </div>

          {/* Custom Date Range */}
          {periodType === 'custom' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !customStartDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, 'dd/MM/yyyy') : 'Sélectionner'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      locale={fr}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Date de fin</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !customEndDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, 'dd/MM/yyyy') : 'Sélectionner'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      locale={fr}
                      disabled={(date) => customStartDate ? date < customStartDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Preview Stats */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-2">{getPeriodLabel()}</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{stats.totalControls}</p>
                  <p className="text-xs text-muted-foreground">Contrôles</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalPassengers.toLocaleString('fr-FR')}</p>
                  <p className="text-xs text-muted-foreground">Passagers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalFraud}</p>
                  <p className="text-xs text-muted-foreground">Fraudes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => handleGenerateHTML(false)}
            disabled={!isCustomValid || stats.totalControls === 0}
            className="w-full sm:w-auto"
          >
            <Globe className="mr-2 h-4 w-4" />
            Ouvrir HTML
          </Button>
          <Button
            variant="outline"
            onClick={() => handleGenerateHTML(true)}
            disabled={!isCustomValid || stats.totalControls === 0}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            Télécharger HTML
          </Button>
          <Button
            onClick={handleGeneratePDF}
            disabled={!isCustomValid || stats.totalControls === 0}
            className="w-full sm:w-auto"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Générer PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
