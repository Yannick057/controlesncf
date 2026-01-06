import { Train, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardControl, StationControl } from '@/hooks/useSupabaseControls';
import { cn } from '@/lib/utils';

interface RecentControlsTableProps {
  onboardControls: OnboardControl[];
  stationControls: StationControl[];
}

type CombinedControl = {
  type: 'train' | 'station';
  id: string;
  label: string;
  datetime: string;
  passengers: number;
  fraudCount: number;
  fraudRate: number;
  timestamp: string;
};

export function RecentControlsTable({ onboardControls, stationControls }: RecentControlsTableProps) {
  const combined: CombinedControl[] = [
    ...onboardControls.map((c) => ({
      type: 'train' as const,
      id: c.id,
      label: `${c.trainNumber} - ${c.origin} → ${c.destination}`,
      datetime: `${c.date} ${c.time}`,
      passengers: c.passengers,
      fraudCount: c.fraudCount,
      fraudRate: c.fraudRate,
      timestamp: c.timestamp,
    })),
    ...stationControls.map((c) => ({
      type: 'station' as const,
      id: c.id,
      label: `${c.stationName} - Quai ${c.platform}`,
      datetime: `${c.date} ${c.time}`,
      passengers: c.passengers,
      fraudCount: c.fraudCount,
      fraudRate: c.fraudRate,
      timestamp: c.timestamp,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

  return (
    <Card className="animate-slide-up" style={{ animationDelay: '400ms' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Derniers contrôles
        </CardTitle>
      </CardHeader>
      <CardContent>
        {combined.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Aucun contrôle enregistré
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Détails</th>
                  <th className="pb-3 font-medium">Date/Heure</th>
                  <th className="pb-3 font-medium text-right">Passagers</th>
                  <th className="pb-3 font-medium text-right">Fraudes</th>
                  <th className="pb-3 font-medium text-right">Taux</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {combined.map((control) => (
                  <tr key={control.id} className="border-b border-border/50 transition-colors hover:bg-secondary/50">
                    <td className="py-3">
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg',
                        control.type === 'train' ? 'bg-primary/20 text-primary' : 'bg-success/20 text-success'
                      )}>
                        {control.type === 'train' ? <Train className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                      </div>
                    </td>
                    <td className="py-3 font-medium">{control.label}</td>
                    <td className="py-3 text-muted-foreground">{control.datetime}</td>
                    <td className="py-3 text-right font-medium">{control.passengers}</td>
                    <td className="py-3 text-right">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        control.fraudCount > 0 ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'
                      )}>
                        {control.fraudCount}
                      </span>
                    </td>
                    <td className="py-3 text-right font-medium">{control.fraudRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
