import { ControlForm } from '@/components/controls/ControlForm';
import { ControlsTable } from '@/components/controls/ControlsTable';
import { useOnboardControls, OnboardControl } from '@/hooks/useControls';
import { cn } from '@/lib/utils';

export default function OnboardControls() {
  const { controls, addControl } = useOnboardControls();

  const handleSubmit = (data: Record<string, string | number>) => {
    addControl({
      trainNumber: data.trainNumber as string,
      route: data.route as string,
      date: data.date as string,
      time: data.time as string,
      passengers: data.passengers as number,
      fraudCount: data.fraudCount as number,
    });
  };

  const columns = [
    {
      key: 'trainNumber',
      label: 'Train',
      render: (item: OnboardControl) => (
        <span className="font-medium">{item.trainNumber}</span>
      ),
    },
    {
      key: 'route',
      label: 'Trajet',
      render: (item: OnboardControl) => (
        <span className="text-muted-foreground">{item.route}</span>
      ),
    },
    {
      key: 'datetime',
      label: 'Date/Heure',
      render: (item: OnboardControl) => (
        <span className="text-muted-foreground">
          {new Date(item.date).toLocaleDateString('fr-FR')} {item.time}
        </span>
      ),
    },
    {
      key: 'passengers',
      label: 'Passagers',
      align: 'right' as const,
      render: (item: OnboardControl) => (
        <span className="font-medium">{item.passengers}</span>
      ),
    },
    {
      key: 'fraudCount',
      label: 'Fraudes',
      align: 'right' as const,
      render: (item: OnboardControl) => (
        <span className={cn(
          'rounded-full px-2 py-0.5 text-xs font-medium',
          item.fraudCount > 0 ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'
        )}>
          {item.fraudCount}
        </span>
      ),
    },
    {
      key: 'fraudRate',
      label: 'Taux',
      align: 'right' as const,
      render: (item: OnboardControl) => (
        <span className="font-medium">{item.fraudRate.toFixed(1)}%</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contrôles à bord</h1>
        <p className="text-muted-foreground">Enregistrez et consultez les contrôles effectués dans les trains</p>
      </div>

      <ControlForm type="onboard" onSubmit={handleSubmit} />

      <ControlsTable
        title="Historique des contrôles à bord"
        description={`${controls.length} contrôle${controls.length > 1 ? 's' : ''} enregistré${controls.length > 1 ? 's' : ''}`}
        data={controls}
        columns={columns}
        emptyMessage="Aucun contrôle à bord enregistré"
      />
    </div>
  );
}
