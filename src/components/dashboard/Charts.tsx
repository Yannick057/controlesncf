import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { OnboardControl, StationControl } from '@/hooks/useControls';

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

  return (
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
  );
}
