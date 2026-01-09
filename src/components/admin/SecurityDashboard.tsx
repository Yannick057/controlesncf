import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, ShieldAlert, AlertTriangle, UserX, Key, FileText, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SecurityEvent {
  id: string;
  type: 'failed_login' | 'role_change' | 'password_change' | 'user_suspend' | 'user_delete' | 'sensitive_action';
  description: string;
  user_email?: string;
  user_name?: string;
  created_at: string;
  severity: 'low' | 'medium' | 'high';
}

interface SecurityStats {
  failedLogins24h: number;
  roleChanges7d: number;
  sensitiveActions7d: number;
  suspendedUsers: number;
}

export function SecurityDashboard() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    failedLogins24h: 0,
    roleChanges7d: 0,
    sensitiveActions7d: 0,
    suspendedUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      // Fetch recent audit logs for sensitive actions
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (auditError) throw auditError;

      // Fetch role history for role changes
      const { data: roleHistory, error: roleError } = await supabase
        .from('role_history')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (roleError) throw roleError;

      // Fetch profiles for user names
      const { data: profiles } = await supabase.from('profiles').select('id, email, full_name');
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Build security events from audit logs
      const securityEvents: SecurityEvent[] = [];

      // Add role change events
      (roleHistory || []).forEach(rh => {
        const profile = profileMap.get(rh.user_id);
        const changer = profileMap.get(rh.changed_by);
        securityEvents.push({
          id: rh.id,
          type: 'role_change',
          description: `Rôle changé de ${rh.old_role || 'nouveau'} à ${rh.new_role} par ${changer?.full_name || changer?.email || 'inconnu'}`,
          user_email: profile?.email,
          user_name: profile?.full_name,
          created_at: rh.created_at,
          severity: rh.new_role === 'admin' ? 'high' : 'medium',
        });
      });

      // Add sensitive audit log events (user_roles changes, deletions)
      (auditLogs || []).forEach(log => {
        const profile = profileMap.get(log.user_id);
        
        if (log.table_name === 'user_roles' && log.action === 'UPDATE') {
          // Already covered by role_history
          return;
        }

        if (log.action === 'DELETE') {
          securityEvents.push({
            id: log.id,
            type: 'sensitive_action',
            description: `Suppression dans ${log.table_name}`,
            user_email: profile?.email,
            user_name: profile?.full_name,
            created_at: log.created_at,
            severity: log.table_name === 'user_roles' ? 'high' : 'low',
          });
        }
      });

      // Sort by date
      securityEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setEvents(securityEvents.slice(0, 50));

      // Calculate stats
      const roleChanges7d = roleHistory?.length || 0;
      const sensitiveActions7d = auditLogs?.filter(l => 
        l.action === 'DELETE' || 
        (l.table_name === 'user_roles' && l.action !== 'SELECT')
      ).length || 0;

      setStats({
        failedLogins24h: 0, // Would need auth logs access
        roleChanges7d,
        sensitiveActions7d,
        suspendedUsers: 0, // Would need auth admin access
      });

    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">Critique</Badge>;
      case 'medium':
        return <Badge variant="default">Moyen</Badge>;
      case 'low':
        return <Badge variant="secondary">Faible</Badge>;
    }
  };

  const getEventIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'failed_login':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'role_change':
        return <Key className="h-4 w-4 text-blue-500" />;
      case 'password_change':
        return <Key className="h-4 w-4 text-green-500" />;
      case 'user_suspend':
        return <UserX className="h-4 w-4 text-orange-500" />;
      case 'user_delete':
        return <UserX className="h-4 w-4 text-red-500" />;
      case 'sensitive_action':
        return <FileText className="h-4 w-4 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.failedLogins24h}</p>
              <p className="text-sm text-muted-foreground">Connexions échouées (24h)</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <Key className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.roleChanges7d}</p>
              <p className="text-sm text-muted-foreground">Changements de rôle (7j)</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
              <FileText className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.sensitiveActions7d}</p>
              <p className="text-sm text-muted-foreground">Actions sensibles (7j)</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
              <UserX className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.suspendedUsers}</p>
              <p className="text-sm text-muted-foreground">Comptes suspendus</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                Événements de sécurité récents
              </CardTitle>
              <CardDescription>
                Activités sensibles des 7 derniers jours
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchSecurityData} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mb-4" />
              <p>Aucun événement de sécurité récent</p>
              <p className="text-sm">Tout semble normal</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Sévérité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(event.created_at), 'dd MMM HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getEventIcon(event.type)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {event.user_name || event.user_email || '-'}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {event.description}
                      </TableCell>
                      <TableCell>
                        {getSeverityBadge(event.severity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
