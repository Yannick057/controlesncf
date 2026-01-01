import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { OnboardControl, StationControl } from '@/hooks/useControls';
import { useMemo } from 'react';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

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

  // Weekly fraud rate evolution (last 8 weeks)
  const weeklyFraudData = useMemo(() => {
    const weeks: { weekStart: Date; label: string; passengers: number; frauds: number; rate: number }[] = [];
    
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];
      
      const onboardInWeek = onboardControls.filter((c) => c.date >= weekStartStr && c.date < weekEndStr);
      const stationInWeek = stationControls.filter((c) => c.date >= weekStartStr && c.date < weekEndStr);
      
      const passengers = onboardInWeek.reduce((s, c) => s + c.passengers, 0) + stationInWeek.reduce((s, c) => s + c.passengers, 0);
      const frauds = onboardInWeek.reduce((s, c) => s + c.fraudCount, 0) + stationInWeek.reduce((s, c) => s + c.fraudCount, 0);
      
      weeks.push({
        weekStart,
        label: `S${getWeekNumber(weekStart)}`,
        passengers,
        frauds,
        rate: passengers > 0 ? (frauds / passengers) * 100 : 0
      });
    }
    
    return weeks;
  }, [onboardControls, stationControls]);

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
      tarifsBord: number;
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
          tarifsBord: 0,
          pv: 0,
        };
      }
      stats[c.trainNumber].controls++;
      stats[c.trainNumber].passengers += c.passengers;
      stats[c.trainNumber].frauds += c.fraudCount;
      stats[c.trainNumber].tarifsControle += c.tarifsControle.reduce((s, t) => s + t.montant, 0) + c.stt50Count * 50;
      stats[c.trainNumber].tarifsBord += c.tarifsBord.reduce((s, t) => s + t.montant, 0);
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

  // Monthly stats for export
  const monthlyStats = useMemo(() => {
    const months: Record<string, { 
      month: string;
      trainStats: typeof trainStats;
      totalControls: number;
      totalPassengers: number;
      totalFrauds: number;
      totalTarifsControle: number;
      totalPV: number;
    }> = {};

    onboardControls.forEach((c) => {
      const monthKey = c.date.substring(0, 7);
      if (!months[monthKey]) {
        months[monthKey] = {
          month: monthKey,
          trainStats: [],
          totalControls: 0,
          totalPassengers: 0,
          totalFrauds: 0,
          totalTarifsControle: 0,
          totalPV: 0,
        };
      }
      months[monthKey].totalControls++;
      months[monthKey].totalPassengers += c.passengers;
      months[monthKey].totalFrauds += c.fraudCount;
      months[monthKey].totalTarifsControle += c.tarifsControle.reduce((s, t) => s + t.montant, 0) + c.stt50Count * 50;
      months[monthKey].totalPV += c.pvList.reduce((s, t) => s + t.montant, 0) + c.stt100Count * 100;
    });

    return Object.values(months).sort((a, b) => b.month.localeCompare(a.month));
  }, [onboardControls]);

  const trainChartData = trainStats.map((s) => ({
    train: s.trainNumber,
    'Passagers': s.passengers,
    'Fraudes': s.frauds,
  }));

  const exportTrainStatsPDF = () => {
    const html = generateTrainStatsHTML(trainStats, monthlyStats, weeklyFraudData);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
    toast.success('Export PDF ouvert');
  };

  return (
    <div className="space-y-6">
      {/* Weekly Fraud Rate Evolution */}
      <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        <CardHeader>
          <CardTitle>Évolution du taux de fraude par semaine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            {weeklyFraudData.some(w => w.passengers > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyFraudData}>
                  <defs>
                    <linearGradient id="fraudGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="label" 
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
                    tickFormatter={(v) => `${v.toFixed(1)}%`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-card)',
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Taux de fraude']}
                    labelFormatter={(label) => `Semaine ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    fill="url(#fraudGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Statistiques par train (Top 10)</CardTitle>
            <Button variant="outline" size="sm" onClick={exportTrainStatsPDF}>
              <Download className="mr-1 h-4 w-4" />
              Export PDF
            </Button>
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

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
}

function generateTrainStatsHTML(
  trainStats: { trainNumber: string; controls: number; passengers: number; frauds: number; fraudRate: number; tarifsControle: number; tarifsBord: number; pv: number }[],
  monthlyStats: { month: string; totalControls: number; totalPassengers: number; totalFrauds: number; totalTarifsControle: number; totalPV: number }[],
  weeklyFraudData: { label: string; passengers: number; frauds: number; rate: number }[]
): string {
  const trainRows = trainStats.map(s => `
    <tr>
      <td class="font-medium">${s.trainNumber}</td>
      <td class="right">${s.controls}</td>
      <td class="right">${s.passengers}</td>
      <td class="right">${s.frauds}</td>
      <td class="right ${s.fraudRate > 5 ? 'text-red' : ''}">${s.fraudRate.toFixed(1)}%</td>
      <td class="right">${s.tarifsBord.toFixed(2)}€</td>
      <td class="right">${s.tarifsControle.toFixed(2)}€</td>
      <td class="right">${s.pv.toFixed(2)}€</td>
      <td class="right font-bold">${(s.tarifsBord + s.tarifsControle + s.pv).toFixed(2)}€</td>
    </tr>
  `).join('');

  const monthRows = monthlyStats.map(m => {
    const rate = m.totalPassengers > 0 ? (m.totalFrauds / m.totalPassengers) * 100 : 0;
    return `
    <tr>
      <td class="font-medium">${new Date(m.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</td>
      <td class="right">${m.totalControls}</td>
      <td class="right">${m.totalPassengers}</td>
      <td class="right">${m.totalFrauds}</td>
      <td class="right ${rate > 5 ? 'text-red' : ''}">${rate.toFixed(1)}%</td>
      <td class="right">${m.totalTarifsControle.toFixed(2)}€</td>
      <td class="right">${m.totalPV.toFixed(2)}€</td>
    </tr>
  `;
  }).join('');

  const weekRows = weeklyFraudData.filter(w => w.passengers > 0).map(w => `
    <tr>
      <td>${w.label}</td>
      <td class="right">${w.passengers}</td>
      <td class="right">${w.frauds}</td>
      <td class="right ${w.rate > 5 ? 'text-red' : ''}">${w.rate.toFixed(2)}%</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Statistiques par train - SNCF</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #333; font-size: 11px; }
    h1 { color: #0066cc; border-bottom: 3px solid #0066cc; padding-bottom: 10px; }
    h2 { color: #0066cc; margin-top: 30px; padding: 10px; background: #f0f7ff; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
    th { background: #0066cc; color: white; font-weight: 600; }
    tr:nth-child(even) { background: #f8f9fa; }
    .right { text-align: right; }
    .font-medium { font-weight: 500; }
    .font-bold { font-weight: 700; }
    .text-red { color: #dc2626; }
    .summary { margin: 20px 0; padding: 15px; background: #f0f7ff; border-radius: 8px; }
    @media print { body { margin: 0; font-size: 9px; } }
  </style>
</head>
<body>
  <h1>📊 Statistiques par train - SNCF</h1>
  <p>Exporté le ${new Date().toLocaleString('fr-FR')}</p>

  <h2>📈 Évolution du taux de fraude par semaine</h2>
  <table>
    <thead>
      <tr>
        <th>Semaine</th>
        <th class="right">Passagers</th>
        <th class="right">Fraudes</th>
        <th class="right">Taux</th>
      </tr>
    </thead>
    <tbody>${weekRows}</tbody>
  </table>

  <h2>🚂 Statistiques par train (Top 10)</h2>
  <table>
    <thead>
      <tr>
        <th>Train</th>
        <th class="right">Contrôles</th>
        <th class="right">Passagers</th>
        <th class="right">Fraudes</th>
        <th class="right">Taux</th>
        <th class="right">Tarifs bord</th>
        <th class="right">Tarifs contrôle</th>
        <th class="right">PV</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>${trainRows}</tbody>
  </table>

  <h2>📅 Récapitulatif mensuel</h2>
  <table>
    <thead>
      <tr>
        <th>Mois</th>
        <th class="right">Contrôles</th>
        <th class="right">Passagers</th>
        <th class="right">Fraudes</th>
        <th class="right">Taux</th>
        <th class="right">Tarifs contrôle</th>
        <th class="right">PV</th>
      </tr>
    </thead>
    <tbody>${monthRows}</tbody>
  </table>
</body>
</html>`;
}
