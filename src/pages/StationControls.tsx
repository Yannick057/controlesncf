import { ControlForm } from '@/components/controls/ControlForm';
import { ControlsTable } from '@/components/controls/ControlsTable';
import { useStationControls, StationControl } from '@/hooks/useControls';
import { cn } from '@/lib/utils';

export default function StationControls() {
  const { controls, addControl } = useStationControls();

  const handleSubmit = (data: Record<string, string | number>) => {
    addControl({
      stationName: data.stationName as string,
      platform: data.platform as string,
      origin: data.origin as string,
      destination: data.destination as string,
      date: data.date as string,
      time: data.time as string,
      passengers: data.passengers as number,
      fraudCount: data.fraudCount as number,
    });
  };

  const columns = [
    {
      key: 'stationName',
      label: 'Gare',
      render: (item: StationControl) => (
        <span className="font-medium">{item.stationName}</span>
      ),
    },
    {
      key: 'platform',
      label: 'Quai',
      render: (item: StationControl) => (
        <span className="rounded-md bg-secondary px-2 py-0.5 text-sm">{item.platform}</span>
      ),
    },
    {
      key: 'datetime',
      label: 'Date/Heure',
      render: (item: StationControl) => (
        <span className="text-muted-foreground">
          {new Date(item.date).toLocaleDateString('fr-FR')} {item.time}
        </span>
      ),
    },
    {
      key: 'passengers',
      label: 'Passagers',
      align: 'right' as const,
      render: (item: StationControl) => (
        <span className="font-medium">{item.passengers}</span>
      ),
    },
    {
      key: 'fraudCount',
      label: 'Fraudes',
      align: 'right' as const,
      render: (item: StationControl) => (
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
      render: (item: StationControl) => (
        <span className="font-medium">{item.fraudRate.toFixed(1)}%</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contrôles en gare</h1>
        <p className="text-muted-foreground">Enregistrez et consultez les contrôles effectués dans les gares</p>
      </div>

      <ControlForm type="station" onSubmit={handleSubmit} />

      <ControlsTable
        title="Historique des contrôles en gare"
        description={`${controls.length} contrôle${controls.length > 1 ? 's' : ''} enregistré${controls.length > 1 ? 's' : ''}`}
        data={controls}
        columns={columns}
        emptyMessage="Aucun contrôle en gare enregistré"
      />
    </div>
  );
}
