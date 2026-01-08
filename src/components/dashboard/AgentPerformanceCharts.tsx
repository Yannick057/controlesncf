import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Users, TrendingUp } from 'lucide-react';
import type { OnboardControl, StationControl } from '@/hooks/useSupabaseControls';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface AgentPerformanceChartsProps {
  onboardControls: OnboardControl[];
  stationControls: StationControl[];
  profiles: Profile[];
}

export function AgentPerformanceCharts({ onboardControls, stationControls, profiles }: AgentPerformanceChartsProps) {
  const allControls = [...onboardControls.map(c => ({ ...c, user_id: c.userId || '', fraud_rate: c.fraudRate, control_date: c.date })), 
                       ...stationControls.map(c => ({ ...c, user_id: c.userId || '', fraud_rate: c.fraudRate, control_date: c.date }))];

  const agentStats = useMemo(() => {
    const stats = new Map<string, { totalControls: number; totalPassengers: number; totalFraudRate: number; controlCount: number }>();

    allControls.forEach(control => {
      const current = stats.get(control.user_id) || { totalControls: 0, totalPassengers: 0, totalFraudRate: 0, controlCount: 0 };
      stats.set(control.user_id, {
        totalControls: current.totalControls + 1,
        totalPassengers: current.totalPassengers + control.passengers,
        totalFraudRate: current.totalFraudRate + control.fraud_rate,
        controlCount: current.controlCount + 1,
      });
    });

    return Array.from(stats.entries()).map(([userId, data]) => {
      const profile = profiles.find(p => p.id === userId);
      return {
        name: profile?.full_name || profile?.email?.split('@')[0] || 'Agent inconnu',
        controles: data.totalControls,
        passagers: data.totalPassengers,
        tauxFraude: data.controlCount > 0 ? (data.totalFraudRate / data.controlCount).toFixed(1) : '0',
      };
    }).sort((a, b) => b.controles - a.controles).slice(0, 10);
  }, [allControls, profiles]);

  const weeklyTrend = useMemo(() => {
    const weeks = new Map<string, { controls: number; passengers: number }>();
    const now = new Date();

    // Initialize last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - (i * 7));
      const weekKey = `S${getWeekNumber(date)}`;
      weeks.set(weekKey, { controls: 0, passengers: 0 });
    }

    allControls.forEach(control => {
      const date = new Date(control.control_date);
      const weekKey = `S${getWeekNumber(date)}`;
      if (weeks.has(weekKey)) {
        const current = weeks.get(weekKey)!;
        weeks.set(weekKey, {
          controls: current.controls + 1,
          passengers: current.passengers + control.passengers,
        });
      }
    });

    return Array.from(weeks.entries()).map(([week, data]) => ({
      semaine: week,
      controles: data.controls,
      passagers: data.passengers,
    }));
  }, [allControls]);

  if (agentStats.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucune donnée de performance disponible</p>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    controles: { label: 'Contrôles', color: 'hsl(var(--primary))' },
    passagers: { label: 'Passagers', color: 'hsl(var(--accent))' },
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Performance par agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentStats} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="controles" fill="hsl(var(--primary))" radius={4} name="Contrôles" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Tendance hebdomadaire
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrend}>
                <XAxis dataKey="semaine" fontSize={12} />
                <YAxis fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="controles" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Contrôles" />
                <Line type="monotone" dataKey="passagers" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} name="Passagers" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
