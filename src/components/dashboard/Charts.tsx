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
    const html = generateTrainStatsHTML(trainStats, monthlyStats, weeklyFraudData, barData, pieData);
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
  weeklyFraudData: { label: string; passengers: number; frauds: number; rate: number }[],
  barData: { date: string; 'À bord': number; 'En gare': number }[],
  pieData: { name: string; value: number; color: string }[]
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

  // Generate SVG charts
  const fraudRateChartSVG = generateFraudRateChart(weeklyFraudData);
  const barChartSVG = generateBarChart(barData);
  const pieChartSVG = generatePieChart(pieData);
  const trainChartSVG = generateTrainChart(trainStats);

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Statistiques SNCF - Rapport complet</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #333; font-size: 11px; }
    h1 { color: #0066cc; border-bottom: 3px solid #0066cc; padding-bottom: 10px; margin-bottom: 20px; }
    h2 { color: #0066cc; margin-top: 30px; padding: 10px; background: #f0f7ff; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
    th { background: #0066cc; color: white; font-weight: 600; }
    tr:nth-child(even) { background: #f8f9fa; }
    .right { text-align: right; }
    .font-medium { font-weight: 500; }
    .font-bold { font-weight: 700; }
    .text-red { color: #dc2626; }
    .chart-container { margin: 20px 0; display: flex; justify-content: center; }
    .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 20px 0; }
    .chart-box { border: 1px solid #e5e5e5; border-radius: 12px; padding: 15px; background: #fafafa; }
    .chart-title { font-weight: 600; color: #0066cc; margin-bottom: 10px; text-align: center; }
    @media print { 
      body { margin: 10px; font-size: 9px; } 
      .charts-grid { grid-template-columns: 1fr 1fr; }
      .chart-box { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>📊 Rapport Statistiques SNCF</h1>
  <p>Exporté le ${new Date().toLocaleString('fr-FR')}</p>

  <h2>📈 Graphiques</h2>
  <div class="charts-grid">
    <div class="chart-box">
      <div class="chart-title">Évolution du taux de fraude</div>
      ${fraudRateChartSVG}
    </div>
    <div class="chart-box">
      <div class="chart-title">Contrôles par jour (7 derniers jours)</div>
      ${barChartSVG}
    </div>
    <div class="chart-box">
      <div class="chart-title">Répartition des contrôles</div>
      ${pieChartSVG}
    </div>
    <div class="chart-box">
      <div class="chart-title">Top 10 trains - Passagers vs Fraudes</div>
      ${trainChartSVG}
    </div>
  </div>

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

function generateFraudRateChart(data: { label: string; rate: number }[]): string {
  const width = 300;
  const height = 150;
  const padding = 30;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  const maxRate = Math.max(...data.map(d => d.rate), 1);
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
    const y = height - padding - (d.rate / maxRate) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const area = `M${padding},${height - padding} ` + 
    data.map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
      const y = height - padding - (d.rate / maxRate) * chartHeight;
      return `L${x},${y}`;
    }).join(' ') + 
    ` L${width - padding},${height - padding} Z`;

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%;max-width:300px">
      <defs>
        <linearGradient id="fraudGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#dc2626" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#dc2626" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#fraudGrad)"/>
      <polyline points="${points}" fill="none" stroke="#dc2626" stroke-width="2"/>
      ${data.map((d, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
        return `<text x="${x}" y="${height - 10}" text-anchor="middle" font-size="8" fill="#666">${d.label}</text>`;
      }).join('')}
      <text x="${padding - 5}" y="${height - padding}" text-anchor="end" font-size="8" fill="#666">0%</text>
      <text x="${padding - 5}" y="${padding + 5}" text-anchor="end" font-size="8" fill="#666">${maxRate.toFixed(1)}%</text>
    </svg>
  `;
}

function generateBarChart(data: { date: string; 'À bord': number; 'En gare': number }[]): string {
  const width = 300;
  const height = 150;
  const padding = 30;
  const chartHeight = height - padding * 2;
  
  const maxVal = Math.max(...data.flatMap(d => [d['À bord'], d['En gare']]), 1);
  const barWidth = (width - padding * 2) / data.length / 2.5;

  const bars = data.map((d, i) => {
    const x = padding + (i + 0.5) * ((width - padding * 2) / data.length);
    const h1 = (d['À bord'] / maxVal) * chartHeight;
    const h2 = (d['En gare'] / maxVal) * chartHeight;
    return `
      <rect x="${x - barWidth}" y="${height - padding - h1}" width="${barWidth - 2}" height="${h1}" fill="#0066cc" rx="2"/>
      <rect x="${x}" y="${height - padding - h2}" width="${barWidth - 2}" height="${h2}" fill="#22c55e" rx="2"/>
      <text x="${x}" y="${height - 10}" text-anchor="middle" font-size="7" fill="#666">${d.date.split(' ')[0]}</text>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%;max-width:300px">
      ${bars}
      <rect x="${width - 80}" y="10" width="10" height="10" fill="#0066cc" rx="2"/>
      <text x="${width - 65}" y="18" font-size="8" fill="#666">À bord</text>
      <rect x="${width - 80}" y="25" width="10" height="10" fill="#22c55e" rx="2"/>
      <text x="${width - 65}" y="33" font-size="8" fill="#666">En gare</text>
    </svg>
  `;
}

function generatePieChart(data: { name: string; value: number; color: string }[]): string {
  const width = 200;
  const height = 150;
  const cx = 80;
  const cy = 75;
  const r = 50;
  
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return '<svg viewBox="0 0 200 150"><text x="100" y="75" text-anchor="middle" fill="#999">Aucune donnée</text></svg>';
  
  let currentAngle = -90;
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;
    
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    const color = d.color.replace('hsl(var(--success))', '#22c55e')
                         .replace('hsl(var(--destructive))', '#dc2626')
                         .replace('hsl(var(--warning))', '#f59e0b');
    
    return `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z" fill="${color}"/>`;
  }).join('');

  const legend = data.map((d, i) => {
    const color = d.color.replace('hsl(var(--success))', '#22c55e')
                         .replace('hsl(var(--destructive))', '#dc2626')
                         .replace('hsl(var(--warning))', '#f59e0b');
    return `
      <rect x="145" y="${20 + i * 18}" width="10" height="10" fill="${color}" rx="2"/>
      <text x="160" y="${28 + i * 18}" font-size="8" fill="#666">${d.name}</text>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%;max-width:200px">
      ${slices}
      ${legend}
    </svg>
  `;
}

function generateTrainChart(data: { trainNumber: string; passengers: number; frauds: number }[]): string {
  const width = 300;
  const height = 200;
  const padding = 50;
  const chartWidth = width - padding - 10;
  const barHeight = (height - 20) / data.length - 4;
  
  const maxVal = Math.max(...data.map(d => d.passengers), 1);

  const bars = data.slice(0, 8).map((d, i) => {
    const y = 10 + i * (barHeight + 4);
    const w1 = (d.passengers / maxVal) * (chartWidth - padding);
    const w2 = (d.frauds / maxVal) * (chartWidth - padding);
    
    return `
      <text x="${padding - 5}" y="${y + barHeight / 2 + 3}" text-anchor="end" font-size="7" fill="#666">${d.trainNumber.slice(0, 8)}</text>
      <rect x="${padding}" y="${y}" width="${w1}" height="${barHeight / 2 - 1}" fill="#0066cc" rx="2"/>
      <rect x="${padding}" y="${y + barHeight / 2}" width="${w2}" height="${barHeight / 2 - 1}" fill="#dc2626" rx="2"/>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%;max-width:300px">
      ${bars}
      <rect x="${width - 70}" y="10" width="10" height="10" fill="#0066cc" rx="2"/>
      <text x="${width - 55}" y="18" font-size="8" fill="#666">Passagers</text>
      <rect x="${width - 70}" y="25" width="10" height="10" fill="#dc2626" rx="2"/>
      <text x="${width - 55}" y="33" font-size="8" fill="#666">Fraudes</text>
    </svg>
  `;
}
