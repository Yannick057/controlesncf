import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseOnboardControls, useSupabaseStationControls } from '@/hooks/useSupabaseControls';
import { useAdminFeatures } from '@/hooks/useAdminFeatures';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  UserCog, Users, RefreshCw, User as UserIcon, 
  Search, Filter, History, Key, X, BarChart3, Download, FileText, MessageSquare, TrendingUp
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { TeamNotesPanel } from '@/components/features/TeamNotesPanel';
import { AgentPerformanceCharts } from '@/components/dashboard/AgentPerformanceCharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

type AppRole = 'admin' | 'manager' | 'agent';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  created_at: string;
}

interface RoleHistoryEntry {
  id: string;
  user_id: string;
  changed_by: string;
  old_role: AppRole | null;
  new_role: AppRole;
  created_at: string;
  user_email?: string;
  user_name?: string;
  changer_email?: string;
  changer_name?: string;
}

const ROLE_CONFIG: Record<'manager' | 'agent', { label: string; icon: React.ComponentType<{ className?: string }>; variant: 'default' | 'secondary' | 'outline' }> = {
  manager: { label: 'Manager', icon: UserCog, variant: 'secondary' },
  agent: { label: 'Agent', icon: UserIcon, variant: 'outline' },
};

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--destructive))', 'hsl(var(--muted))'];

export default function Manager() {
  const { user } = useAuth();
  const { controls: onboardControls } = useSupabaseOnboardControls();
  const { controls: stationControls } = useSupabaseStationControls();
  const { settings: featureSettings } = useAdminFeatures();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [roleHistory, setRoleHistory] = useState<RoleHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'manager' | 'agent' | 'all'>('all');
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user?.role === 'manager') {
      fetchUsers();
      fetchRoleHistory();
    }
  }, [user?.role]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Filter out admins - managers can only see managers and agents
      const usersWithRoles: UserWithRole[] = (profiles || [])
        .map((profile) => {
          const userRole = roles?.find((r) => r.user_id === profile.id);
          return {
            id: profile.id,
            email: profile.email || '',
            full_name: profile.full_name,
            role: (userRole?.role as AppRole) || 'agent',
            created_at: profile.created_at,
          };
        })
        .filter(u => u.role !== 'admin');

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleHistory = async () => {
    try {
      const { data: history, error } = await supabase
        .from('role_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const { data: profiles } = await supabase.from('profiles').select('id, email, full_name');
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enrichedHistory: RoleHistoryEntry[] = (history || []).map(h => ({
        ...h,
        user_email: profileMap.get(h.user_id)?.email,
        user_name: profileMap.get(h.user_id)?.full_name,
        changer_email: profileMap.get(h.changed_by)?.email,
        changer_name: profileMap.get(h.changed_by)?.full_name,
      }));

      setRoleHistory(enrichedHistory);
    } catch (error) {
      console.error('Error fetching role history:', error);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'manager' | 'agent') => {
    if (userId === user?.id) {
      toast.error('Vous ne pouvez pas modifier votre propre rôle');
      return;
    }

    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.role === 'admin') {
      toast.error('Vous ne pouvez pas modifier le rôle d\'un administrateur');
      return;
    }

    const oldRole = targetUser?.role;

    setUpdating(userId);
    try {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      // Log role change
      await supabase.from('role_history').insert({
        user_id: userId,
        changed_by: user?.id,
        old_role: oldRole,
        new_role: newRole,
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      toast.success(`Rôle mis à jour: ${ROLE_CONFIG[newRole].label}`);
      fetchRoleHistory();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erreur lors de la mise à jour du rôle');
    } finally {
      setUpdating(null);
    }
  };

  const handlePasswordChange = async () => {
    if (!selectedUser || !newPassword) return;

    if (selectedUser.role === 'admin') {
      toast.error('Vous ne pouvez pas changer le mot de passe d\'un administrateur');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await supabase.functions.invoke('update-user-password', {
        body: { targetUserId: selectedUser.id, newPassword },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors du changement de mot de passe');
      }

      toast.success('Mot de passe modifié avec succès');
      setPasswordDialogOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setChangingPassword(false);
    }
  };

  // Stats for charts
  const roleDistribution = [
    { name: 'Managers', value: users.filter(u => u.role === 'manager').length },
    { name: 'Agents', value: users.filter(u => u.role === 'agent').length },
  ];

  // Registration by month (last 6 months)
  const getRegistrationsByMonth = () => {
    const months: { [key: string]: number } = {};
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }

    users.forEach(u => {
      const date = new Date(u.created_at);
      const key = date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      if (months[key] !== undefined) {
        months[key]++;
      }
    });

    return Object.entries(months).map(([month, count]) => ({ month, count }));
  };

  const exportAgentReport = () => {
    const reportContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport d'activité des agents - ${new Date().toLocaleDateString('fr-FR')}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #f5f5f5; font-weight: bold; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat-card { background: #f9f9f9; padding: 20px; border-radius: 8px; flex: 1; }
    .stat-value { font-size: 2em; font-weight: bold; color: #0066cc; }
    .stat-label { color: #666; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Rapport d'activité des agents</h1>
  <p>Généré le ${new Date().toLocaleString('fr-FR')}</p>
  
  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${users.length}</div>
      <div class="stat-label">Total membres</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${users.filter(u => u.role === 'manager').length}</div>
      <div class="stat-label">Managers</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${users.filter(u => u.role === 'agent').length}</div>
      <div class="stat-label">Agents</div>
    </div>
  </div>

  <h2>Liste des membres de l'équipe</h2>
  <table>
    <thead>
      <tr>
        <th>Nom</th>
        <th>Email</th>
        <th>Rôle</th>
        <th>Date d'inscription</th>
      </tr>
    </thead>
    <tbody>
      ${users.map(u => `
        <tr>
          <td>${u.full_name || 'Sans nom'}</td>
          <td>${u.email}</td>
          <td>${ROLE_CONFIG[u.role as 'manager' | 'agent']?.label || u.role}</td>
          <td>${new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Historique récent des modifications de rôles</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Utilisateur</th>
        <th>Ancien rôle</th>
        <th>Nouveau rôle</th>
      </tr>
    </thead>
    <tbody>
      ${roleHistory.slice(0, 10).map(h => `
        <tr>
          <td>${new Date(h.created_at).toLocaleDateString('fr-FR')}</td>
          <td>${h.user_name || h.user_email || '-'}</td>
          <td>${h.old_role ? ROLE_CONFIG[h.old_role as 'manager' | 'agent']?.label || h.old_role : '-'}</td>
          <td>${ROLE_CONFIG[h.new_role as 'manager' | 'agent']?.label || h.new_role}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Ce rapport a été généré automatiquement par l'application SNCF Contrôle.</p>
  </div>
</body>
</html>
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    toast.success('Rapport PDF généré');
  };

  // Redirect non-managers
  if (user && user.role !== 'manager') {
    return <Navigate to="/" replace />;
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleStats = {
    manager: users.filter((u) => u.role === 'manager').length,
    agent: users.filter((u) => u.role === 'agent').length,
  };

  const chartConfig = {
    count: { label: 'Inscriptions', color: 'hsl(var(--primary))' },
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" />
            Gestion d'équipe
          </h1>
          <p className="text-muted-foreground">Gérez les agents et managers de votre équipe</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportAgentReport}>
            <FileText className="mr-2 h-4 w-4" />
            Rapport PDF
          </Button>
          <Button variant="outline" onClick={() => { fetchUsers(); fetchRoleHistory(); }} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {(Object.entries(ROLE_CONFIG) as ['manager' | 'agent', typeof ROLE_CONFIG['manager']][]).map(([role, config]) => {
          const Icon = config.icon;
          return (
            <Card key={role} className="animate-slide-up">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roleStats[role]}</p>
                  <p className="text-sm text-muted-foreground">{config.label}s</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Membres de l'équipe
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistiques
          </TabsTrigger>
          {featureSettings.agent_performance_charts && (
            <TabsTrigger value="performance" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance agents
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Historique des rôles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Membres ({filteredUsers.length})
              </CardTitle>
              <CardDescription>
                Modifiez les rôles des membres de votre équipe (sauf administrateurs)
              </CardDescription>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-3 pt-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as 'manager' | 'agent' | 'all')}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filtrer par rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    <SelectItem value="manager">Managers</SelectItem>
                    <SelectItem value="agent">Agents</SelectItem>
                  </SelectContent>
                </Select>
                {(searchQuery || roleFilter !== 'all') && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => { setSearchQuery(''); setRoleFilter('all'); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mb-4" />
                  <p>Aucun membre trouvé</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Membre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rôle actuel</TableHead>
                        <TableHead>Inscription</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => {
                        const config = ROLE_CONFIG[u.role as 'manager' | 'agent'];
                        const RoleIcon = config?.icon || UserIcon;
                        const isCurrentUser = u.id === user?.id;
                        return (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {u.full_name || 'Sans nom'}
                                {isCurrentUser && (
                                  <Badge variant="outline" className="text-xs">Vous</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                            <TableCell>
                              <Badge variant={config?.variant || 'outline'} className="gap-1">
                                <RoleIcon className="h-3 w-3" />
                                {config?.label || u.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString('fr-FR')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Select
                                  value={u.role}
                                  onValueChange={(value: 'manager' | 'agent') => updateUserRole(u.id, value)}
                                  disabled={isCurrentUser || updating === u.id}
                                >
                                  <SelectTrigger className="w-[130px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="manager">
                                      <div className="flex items-center gap-2">
                                        <UserCog className="h-4 w-4" />
                                        Manager
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="agent">
                                      <div className="flex items-center gap-2">
                                        <UserIcon className="h-4 w-4" />
                                        Agent
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <Dialog open={passwordDialogOpen && selectedUser?.id === u.id} onOpenChange={(open) => {
                                  setPasswordDialogOpen(open);
                                  if (!open) {
                                    setSelectedUser(null);
                                    setNewPassword('');
                                  }
                                }}>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="icon"
                                      disabled={isCurrentUser}
                                      onClick={() => setSelectedUser(u)}
                                    >
                                      <Key className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Changer le mot de passe</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <p className="text-sm text-muted-foreground">
                                        Nouveau mot de passe pour <strong>{u.full_name || u.email}</strong>
                                      </p>
                                      <Input
                                        type="password"
                                        placeholder="Nouveau mot de passe (min. 6 caractères)"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                      />
                                    </div>
                                    <DialogFooter>
                                      <DialogClose asChild>
                                        <Button variant="outline">Annuler</Button>
                                      </DialogClose>
                                      <Button 
                                        onClick={handlePasswordChange} 
                                        disabled={newPassword.length < 6 || changingPassword}
                                      >
                                        {changingPassword ? 'Modification...' : 'Changer le mot de passe'}
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <TeamNotesPanel />
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Répartition des rôles</CardTitle>
                <CardDescription>Distribution des membres par rôle</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {roleDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inscriptions par mois</CardTitle>
                <CardDescription>Nouveaux membres sur les 6 derniers mois</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px]">
                  <BarChart data={getRegistrationsByMonth()}>
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Historique des modifications
              </CardTitle>
              <CardDescription>
                Consultez l'historique des changements de rôles (non-admin uniquement)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roleHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mb-4" />
                  <p>Aucun historique disponible</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Ancien rôle</TableHead>
                        <TableHead>Nouveau rôle</TableHead>
                        <TableHead>Modifié par</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roleHistory.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {entry.user_name || entry.user_email || entry.user_id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            {entry.old_role && ROLE_CONFIG[entry.old_role as 'manager' | 'agent'] ? (
                              <Badge variant={ROLE_CONFIG[entry.old_role as 'manager' | 'agent'].variant}>
                                {ROLE_CONFIG[entry.old_role as 'manager' | 'agent'].label}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {ROLE_CONFIG[entry.new_role as 'manager' | 'agent'] ? (
                              <Badge variant={ROLE_CONFIG[entry.new_role as 'manager' | 'agent'].variant}>
                                {ROLE_CONFIG[entry.new_role as 'manager' | 'agent'].label}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">{entry.new_role}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {entry.changer_name || entry.changer_email || entry.changed_by.slice(0, 8)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {featureSettings.agent_performance_charts && (
          <TabsContent value="performance">
            <AgentPerformanceCharts 
              onboardControls={onboardControls}
              stationControls={stationControls}
              profiles={users.map(u => ({ id: u.id, full_name: u.full_name, email: u.email }))}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}