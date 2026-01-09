import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ControlData {
  origin?: string;
  destination?: string;
  station_name?: string;
  fraudRate: number;
  fraudCount: number;
  passengers: number;
}

interface FraudHeatmapProps {
  onboardControls: ControlData[];
  stationControls: ControlData[];
}

interface LocationStats {
  name: string;
  totalControls: number;
  totalPassengers: number;
  totalFraud: number;
  avgFraudRate: number;
}

export function FraudHeatmap({ onboardControls, stationControls }: FraudHeatmapProps) {
  // Calculate fraud stats per location
  const locationStats = useMemo(() => {
    const stats = new Map<string, LocationStats>();

    // Process onboard controls (origins and destinations)
    onboardControls.forEach(control => {
      [control.origin, control.destination].forEach(location => {
        if (!location) return;
        
        const existing = stats.get(location) || {
          name: location,
          totalControls: 0,
          totalPassengers: 0,
          totalFraud: 0,
          avgFraudRate: 0,
        };

        existing.totalControls++;
        existing.totalPassengers += control.passengers || 0;
        existing.totalFraud += control.fraudCount || 0;

        stats.set(location, existing);
      });
    });

    // Process station controls
    stationControls.forEach(control => {
      const location = control.station_name;
      if (!location) return;

      const existing = stats.get(location) || {
        name: location,
        totalControls: 0,
        totalPassengers: 0,
        totalFraud: 0,
        avgFraudRate: 0,
      };

      existing.totalControls++;
      existing.totalPassengers += control.passengers || 0;
      existing.totalFraud += control.fraudCount || 0;

      stats.set(location, existing);
    });

    // Calculate average fraud rates
    stats.forEach((stat, key) => {
      stat.avgFraudRate = stat.totalPassengers > 0 
        ? (stat.totalFraud / stat.totalPassengers) * 100 
        : 0;
      stats.set(key, stat);
    });

    // Sort by fraud rate descending
    return Array.from(stats.values())
      .filter(s => s.totalControls >= 1)
      .sort((a, b) => b.avgFraudRate - a.avgFraudRate);
  }, [onboardControls, stationControls]);

  // Get top routes with high fraud
  const topRoutes = useMemo(() => {
    const routes = new Map<string, LocationStats>();

    onboardControls.forEach(control => {
      if (!control.origin || !control.destination) return;
      
      const routeKey = `${control.origin} → ${control.destination}`;
      const existing = routes.get(routeKey) || {
        name: routeKey,
        totalControls: 0,
        totalPassengers: 0,
        totalFraud: 0,
        avgFraudRate: 0,
      };

      existing.totalControls++;
      existing.totalPassengers += control.passengers || 0;
      existing.totalFraud += control.fraudCount || 0;

      routes.set(routeKey, existing);
    });

    routes.forEach((stat, key) => {
      stat.avgFraudRate = stat.totalPassengers > 0 
        ? (stat.totalFraud / stat.totalPassengers) * 100 
        : 0;
      routes.set(key, stat);
    });

    return Array.from(routes.values())
      .filter(r => r.totalControls >= 1)
      .sort((a, b) => b.avgFraudRate - a.avgFraudRate)
      .slice(0, 5);
  }, [onboardControls]);

  const getHeatColor = (rate: number) => {
    if (rate >= 10) return 'bg-red-500/20 border-red-500/50 text-red-500';
    if (rate >= 5) return 'bg-orange-500/20 border-orange-500/50 text-orange-500';
    if (rate >= 2) return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500';
    return 'bg-green-500/20 border-green-500/50 text-green-500';
  };

  const getHeatIntensity = (rate: number, maxRate: number) => {
    const normalized = Math.min(rate / Math.max(maxRate, 1), 1);
    return normalized;
  };

  const maxRate = Math.max(...locationStats.map(s => s.avgFraudRate), 1);

  if (locationStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Carte de densité fraude
          </CardTitle>
          <CardDescription>
            Aucune donnée disponible
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Stations / Villes avec le plus de fraude */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Gares à risque
          </CardTitle>
          <CardDescription>
            Taux de fraude moyen par gare/ville
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {locationStats.slice(0, 8).map((stat, index) => {
            const intensity = getHeatIntensity(stat.avgFraudRate, maxRate);
            
            return (
              <div
                key={stat.name}
                className={cn(
                  'relative flex items-center justify-between rounded-lg border p-3 transition-all',
                  getHeatColor(stat.avgFraudRate)
                )}
              >
                {/* Background heat bar */}
                <div
                  className="absolute inset-0 rounded-lg bg-current opacity-10"
                  style={{ width: `${intensity * 100}%` }}
                />
                
                <div className="relative z-10 flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{stat.name}</p>
                    <p className="text-xs opacity-70">
                      {stat.totalControls} contrôle{stat.totalControls > 1 ? 's' : ''} · {stat.totalPassengers} passagers
                    </p>
                  </div>
                </div>
                
                <div className="relative z-10 flex items-center gap-2">
                  {stat.avgFraudRate >= 5 && (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <Badge variant="outline" className="bg-background font-bold">
                    {stat.avgFraudRate.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Routes à risque */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Lignes à risque
          </CardTitle>
          <CardDescription>
            Trajets avec les taux de fraude les plus élevés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {topRoutes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Pas assez de données de trajets
            </p>
          ) : (
            topRoutes.map((route, index) => (
              <div
                key={route.name}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-3',
                  getHeatColor(route.avgFraudRate)
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{route.name}</p>
                    <p className="text-xs opacity-70">
                      {route.totalControls} contrôle{route.totalControls > 1 ? 's' : ''} · {route.totalFraud} fraude{route.totalFraud > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                <Badge variant="outline" className="bg-background font-bold">
                  {route.avgFraudRate.toFixed(1)}%
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
