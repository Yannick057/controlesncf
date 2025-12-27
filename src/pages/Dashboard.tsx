import { Train, Building2, Users, AlertTriangle } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Charts } from '@/components/dashboard/Charts';
import { RecentControlsTable } from '@/components/dashboard/RecentControlsTable';
import { useOnboardControls, useStationControls, useControlStats } from '@/hooks/useControls';

export default function Dashboard() {
  const { controls: onboardControls } = useOnboardControls();
  const { controls: stationControls } = useStationControls();
  const stats = useControlStats(onboardControls, stationControls);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble de vos contrôles</p>
      </div>

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

      <Charts onboardControls={onboardControls} stationControls={stationControls} />

      <RecentControlsTable onboardControls={onboardControls} stationControls={stationControls} />
    </div>
  );
}
