import { useState, useMemo, useEffect } from 'react';
import { Train, Building2, Users, AlertTriangle } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Charts } from '@/components/dashboard/Charts';
import { RecentControlsTable } from '@/components/dashboard/RecentControlsTable';
import { DashboardFilters, DashboardFiltersState } from '@/components/dashboard/DashboardFilters';
import { FraudAlertSettings } from '@/components/dashboard/FraudAlertSettings';
import { useOnboardControls, useStationControls, useControlStats } from '@/hooks/useControls';
import { useFraudNotifications } from '@/hooks/useFraudNotifications';

export default function Dashboard() {
  const { controls: onboardControls } = useOnboardControls();
  const { controls: stationControls } = useStationControls();
  const { checkFraudRate } = useFraudNotifications();

  // Initialize filters with last 7 days
  const [filters, setFilters] = useState<DashboardFiltersState>(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return {
      period: 'week',
      startDate: weekAgo,
      endDate: now,
      trainType: 'all',
      line: 'all',
    };
  });

  // Extract unique train types and lines
  const trainTypes = useMemo(() => {
    const types = new Set<string>();
    onboardControls.forEach((c) => {
      // Extract train type from train number (e.g., TGV, TER, etc.)
      const match = c.trainNumber.match(/^([A-Z]+)/);
      if (match) types.add(match[1]);
    });
    return Array.from(types).sort();
  }, [onboardControls]);

  const lines = useMemo(() => {
    const lineSet = new Set<string>();
    onboardControls.forEach((c) => {
      if (c.origin && c.destination) {
        lineSet.add(`${c.origin} - ${c.destination}`);
      }
    });
    return Array.from(lineSet).sort();
  }, [onboardControls]);

  // Filter controls based on filters
  const filteredOnboardControls = useMemo(() => {
    return onboardControls.filter((c) => {
      const date = new Date(c.date);
      
      // Date filter
      if (filters.startDate && date < filters.startDate) return false;
      if (filters.endDate && date > filters.endDate) return false;
      
      // Train type filter
      if (filters.trainType !== 'all') {
        const match = c.trainNumber.match(/^([A-Z]+)/);
        if (!match || match[1] !== filters.trainType) return false;
      }
      
      // Line filter
      if (filters.line !== 'all') {
        const line = `${c.origin} - ${c.destination}`;
        if (line !== filters.line) return false;
      }
      
      return true;
    });
  }, [onboardControls, filters]);

  const filteredStationControls = useMemo(() => {
    return stationControls.filter((c) => {
      const date = new Date(c.date);
      
      // Date filter
      if (filters.startDate && date < filters.startDate) return false;
      if (filters.endDate && date > filters.endDate) return false;
      
      return true;
    });
  }, [stationControls, filters]);

  const stats = useControlStats(filteredOnboardControls, filteredStationControls);

  // Check fraud rate for notifications
  useEffect(() => {
    if (stats.fraudRate > 0) {
      checkFraudRate(stats.fraudRate);
    }
  }, [stats.fraudRate, checkFraudRate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">Vue d'ensemble de vos contrôles</p>
        </div>
        <FraudAlertSettings />
      </div>

      <DashboardFilters 
        filters={filters} 
        onFiltersChange={setFilters}
        trainTypes={trainTypes}
        lines={lines}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Contrôles à bord"
          value={stats.totalOnboard}
          icon={Train}
          variant="primary"
          delay={0}
        />
        <StatsCard
          title="Contrôles en gare"
          value={stats.totalStation}
          icon={Building2}
          variant="success"
          delay={50}
        />
        <StatsCard
          title="Total passagers"
          value={stats.totalPassengers.toLocaleString()}
          icon={Users}
          variant="default"
          delay={100}
        />
        <StatsCard
          title="Taux de fraude"
          value={`${stats.fraudRate.toFixed(1)}%`}
          icon={AlertTriangle}
          variant={stats.fraudRate > 5 ? 'destructive' : stats.fraudRate > 2 ? 'warning' : 'success'}
          delay={150}
        />
      </div>

      <Charts onboardControls={filteredOnboardControls} stationControls={filteredStationControls} />

      <RecentControlsTable onboardControls={filteredOnboardControls} stationControls={filteredStationControls} />
    </div>
  );
}
