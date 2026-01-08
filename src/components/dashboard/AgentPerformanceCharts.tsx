import { useMemo, useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Users, TrendingUp, CalendarIcon, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OnboardControl, StationControl } from '@/hooks/useSupabaseControls';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface AgentPerformanceChartsProps {
  onboardControls: OnboardControl[];
  stationControls: StationControl[];
  profiles: Profile[];
}

type DatePreset = 'all' | '7d' | '30d' | 'thisMonth' | 'lastMonth' | 'custom';

export function AgentPerformanceCharts({ onboardControls, stationControls, profiles }: AgentPerformanceChartsProps) {
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  // Compute date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case 'all':
        return { start: new Date(2020, 0, 1), end: now };
      case '7d':
        return { start: subDays(now, 7), end: now };
      case '30d':
        return { start: subDays(now, 30), end: now };
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'custom':
        return { start: startDate || subDays(now, 30), end: endDate || now };
      default:
        return { start: subDays(now, 30), end: now };
    }
  }, [datePreset, startDate, endDate]);

  const allControls = useMemo(() => {
    return [...onboardControls.map(c => ({ ...c, user_id: c.userId || '', fraud_rate: c.fraudRate, control_date: c.date })), 
            ...stationControls.map(c => ({ ...c, user_id: c.userId || '', fraud_rate: c.fraudRate, control_date: c.date }))]
      .filter(control => {
        const controlDate = new Date(control.control_date);
        return isWithinInterval(controlDate, { start: startOfDay(dateRange.start), end: endOfDay(dateRange.end) });
      });
  }, [onboardControls, stationControls, dateRange]);

  const agentStats = useMemo(() => {
    const stats = new Map<string, { totalControls: number; totalPassengers: number; totalFraudRate: number; controlCount: number }>();

    allControls.forEach(control => {
      const current = stats.get(control.user_id) || { totalControls: 0, totalPassengers: 0, totalFraudRate: 0, controlCount: 0 };
      stats.set(control.user_id, {
        totalControls: current.totalControls + 1,
        totalPassengers: current.totalPassengers + control.passengers,
        totalFraudRate: current.totalFraudRate + control.fraud_rate,
        controlCount: current.controlCount + 1,
      });
    });

    return Array.from(stats.entries()).map(([userId, data]) => {
      const profile = profiles.find(p => p.id === userId);
      return {
        name: profile?.full_name || profile?.email?.split('@')[0] || 'Agent inconnu',
        controles: data.totalControls,
        passagers: data.totalPassengers,
        tauxFraude: data.controlCount > 0 ? (data.totalFraudRate / data.controlCount).toFixed(1) : '0',
      };
    }).sort((a, b) => b.controles - a.controles).slice(0, 10);
  }, [allControls, profiles]);

  const weeklyTrend = useMemo(() => {
    const weeks = new Map<string, { controls: number; passengers: number }>();
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - (i * 7));
      const weekKey = `S${getWeekNumber(date)}`;
      weeks.set(weekKey, { controls: 0, passengers: 0 });
    }

    allControls.forEach(control => {
      const date = new Date(control.control_date);
      const weekKey = `S${getWeekNumber(date)}`;
      if (weeks.has(weekKey)) {
        const current = weeks.get(weekKey)!;
        weeks.set(weekKey, {
          controls: current.controls + 1,
          passengers: current.passengers + control.passengers,
        });
      }
    });

    return Array.from(weeks.entries()).map(([week, data]) => ({
      semaine: week,
      controles: data.controls,
      passagers: data.passengers,
    }));
  }, [allControls]);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const now = new Date();
      switch (preset) {
        case '7d':
          setStartDate(subDays(now, 7));
          setEndDate(now);
          break;
        case '30d':
          setStartDate(subDays(now, 30));
          setEndDate(now);
          break;
        case 'thisMonth':
          setStartDate(startOfMonth(now));
          setEndDate(endOfMonth(now));
          break;
        case 'lastMonth':
          const lastMonth = subMonths(now, 1);
          setStartDate(startOfMonth(lastMonth));
          setEndDate(endOfMonth(lastMonth));
          break;
        case 'all':
          setStartDate(new Date(2020, 0, 1));
          setEndDate(now);
          break;
      }
    }
  };

  const chartConfig = {
    controles: { label: 'Contrôles', color: 'hsl(var(--primary))' },
    passagers: { label: 'Passagers', color: 'hsl(var(--accent))' },
  };

  return (
    <div className="space-y-6">
      {/* Date Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Période :</span>
            </div>
            
            <Select value={datePreset} onValueChange={(v) => handlePresetChange(v as DatePreset)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sélectionner période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="thisMonth">Ce mois-ci</SelectItem>
                <SelectItem value="lastMonth">Mois dernier</SelectItem>
                <SelectItem value="all">Tout</SelectItem>
                <SelectItem value="custom">Personnalisé</SelectItem>
              </SelectContent>
            </Select>

            {datePreset === 'custom' && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy", { locale: fr }) : "Début"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
                
                <span className="text-muted-foreground">→</span>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy", { locale: fr }) : "Fin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="ml-auto text-sm text-muted-foreground">
              {allControls.length} contrôle{allControls.length > 1 ? 's' : ''} sur la période
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {agentStats.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune donnée de performance pour cette période</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Performance par agent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agentStats} layout="vertical">
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="controles" fill="hsl(var(--primary))" radius={4} name="Contrôles" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Tendance hebdomadaire
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrend}>
                    <XAxis dataKey="semaine" fontSize={12} />
                    <YAxis fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="controles" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Contrôles" />
                    <Line type="monotone" dataKey="passagers" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} name="Passagers" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
