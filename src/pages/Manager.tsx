import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  Search, Filter, History, Key, X
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

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

export default function Manager() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [roleHistory, setRoleHistory] = useState<RoleHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'manager' | 'agent' | 'all'>('all');
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState('');

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

    try {
      toast.info('Fonctionnalité de changement de mot de passe en cours d\'implémentation');
      setPasswordDialogOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error) {
      toast.error('Erreur lors du changement de mot de passe');
    }
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
        <Button variant="outline" onClick={() => { fetchUsers(); fetchRoleHistory(); }} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
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
                                      <Button onClick={handlePasswordChange} disabled={newPassword.length < 6}>
                                        Changer le mot de passe
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

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Historique des modifications de rôles
              </CardTitle>
              <CardDescription>
                Suivi des modifications de rôles (hors administrateurs)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roleHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mb-4" />
                  <p>Aucune modification de rôle enregistrée</p>
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
                      {roleHistory.map((entry) => {
                        const oldConfig = entry.old_role && entry.old_role !== 'admin' ? ROLE_CONFIG[entry.old_role as 'manager' | 'agent'] : null;
                        const newConfig = entry.new_role !== 'admin' ? ROLE_CONFIG[entry.new_role as 'manager' | 'agent'] : null;
                        return (
                          <TableRow key={entry.id}>
                            <TableCell className="text-muted-foreground">
                              {new Date(entry.created_at).toLocaleString('fr-FR')}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{entry.user_name || 'Sans nom'}</p>
                                <p className="text-xs text-muted-foreground">{entry.user_email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {oldConfig ? (
                                <Badge variant={oldConfig.variant}>
                                  {oldConfig.label}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {newConfig ? (
                                <Badge variant={newConfig.variant}>
                                  {newConfig.label}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{entry.changer_name || 'Sans nom'}</p>
                                <p className="text-xs text-muted-foreground">{entry.changer_email}</p>
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
      </Tabs>
    </div>
  );
}