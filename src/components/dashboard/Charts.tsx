import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { OnboardControl, StationControl } from '@/hooks/useControls';
import { useMemo } from 'react';

interface ChartsProps {
  onboardControls: OnboardControl[];
  stationControls: StationControl[];
}

export function Charts({ onboardControls, stationControls }: ChartsProps) {
  // Group by date for bar chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const barData = last7Days.map((date) => {
    const onboard = onboardControls.filter((c) => c.date === date).length;
    const station = stationControls.filter((c) => c.date === date).length;
    return {
      date: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
      'À bord': onboard,
      'En gare': station,
    };
  });

  // Fraud data for pie chart
  const totalOnboardFrauds = onboardControls.reduce((sum, c) => sum + c.fraudCount, 0);
  const totalStationFrauds = stationControls.reduce((sum, c) => sum + c.fraudCount, 0);
  const totalPassengers = 
    onboardControls.reduce((sum, c) => sum + c.passengers, 0) +
    stationControls.reduce((sum, c) => sum + c.passengers, 0);
  const validPassengers = totalPassengers - totalOnboardFrauds - totalStationFrauds;

  const pieData = [
    { name: 'Valides', value: Math.max(0, validPassengers), color: 'hsl(var(--success))' },
    { name: 'Fraudes à bord', value: totalOnboardFrauds, color: 'hsl(var(--destructive))' },
    { name: 'Fraudes en gare', value: totalStationFrauds, color: 'hsl(var(--warning))' },
  ].filter((d) => d.value > 0);

  // Stats by train
  const trainStats = useMemo(() => {
    const stats: Record<string, { 
      trainNumber: string; 
      controls: number; 
      passengers: number; 
      frauds: number; 
      fraudRate: number;
      tarifsControle: number;
      pv: number;
    }> = {};
    
    onboardControls.forEach((c) => {
      if (!stats[c.trainNumber]) {
        stats[c.trainNumber] = {
          trainNumber: c.trainNumber,
          controls: 0,
          passengers: 0,
          frauds: 0,
          fraudRate: 0,
          tarifsControle: 0,
          pv: 0,
        };
      }
      stats[c.trainNumber].controls++;
      stats[c.trainNumber].passengers += c.passengers;
      stats[c.trainNumber].frauds += c.fraudCount;
      stats[c.trainNumber].tarifsControle += c.tarifsControle.reduce((s, t) => s + t.montant, 0) + c.stt50Count * 50;
      stats[c.trainNumber].pv += c.pvList.reduce((s, t) => s + t.montant, 0) + c.stt100Count * 100;
    });

    // Calculate fraud rates
    Object.values(stats).forEach((s) => {
      s.fraudRate = s.passengers > 0 ? (s.frauds / s.passengers) * 100 : 0;
    });

    return Object.values(stats)
      .sort((a, b) => b.controls - a.controls)
      .slice(0, 10);
  }, [onboardControls]);

  const trainChartData = trainStats.map((s) => ({
    train: s.trainNumber,
    'Passagers': s.passengers,
    'Fraudes': s.frauds,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle>Contrôles par jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-card)',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="À bord" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="En gare" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <CardTitle>Répartition des contrôles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {pieData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Aucune donnée disponible
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-card)',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats by Train */}
      {trainStats.length > 0 && (
        <Card className="animate-slide-up" style={{ animationDelay: '400ms' }}>
          <CardHeader>
            <CardTitle>Statistiques par train (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trainChartData} layout="vertical">
                    <XAxis 
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      type="category"
                      dataKey="train"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-card)',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="Passagers" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Fraudes" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2 overflow-auto max-h-[300px]">
                <div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                  <span>Train</span>
                  <span className="text-right">Ctrl</span>
                  <span className="text-right">Pass.</span>
                  <span className="text-right">Fraudes</span>
                  <span className="text-right">Taux</span>
                  <span className="text-right">Tarifs</span>
                </div>
                {trainStats.map((stat) => (
                  <div key={stat.trainNumber} className="grid grid-cols-6 gap-2 text-sm py-1 border-b border-border/50">
                    <span className="font-medium truncate">{stat.trainNumber}</span>
                    <span className="text-right">{stat.controls}</span>
                    <span className="text-right">{stat.passengers}</span>
                    <span className="text-right text-destructive">{stat.frauds}</span>
                    <span className={`text-right ${stat.fraudRate > 5 ? 'text-destructive' : stat.fraudRate > 2 ? 'text-warning' : 'text-success'}`}>
                      {stat.fraudRate.toFixed(1)}%
                    </span>
                    <span className="text-right">{(stat.tarifsControle + stat.pv).toFixed(0)}€</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
