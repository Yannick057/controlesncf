import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseOnboardControls, useSupabaseStationControls } from '@/hooks/useSupabaseControls';
import { useBugReports } from '@/hooks/useBugReports';
import { useReleaseNotes } from '@/hooks/useReleaseNotes';
import { useAdminFeatures } from '@/hooks/useAdminFeatures';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Shield, Users, RefreshCw, Crown, UserCog, User as UserIcon, 
  Download, Search, Filter, History, Key, X, Database, Upload, Trash2, Bug, Sparkles, Plus, Settings2, FileText, UserX, Ban, RotateCcw, ShieldAlert
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { AuditLogsTab } from '@/components/admin/AuditLogsTab';
import { SecurityDashboard } from '@/components/admin/SecurityDashboard';
import { EmailSettingsCard } from '@/components/admin/EmailSettingsCard';
import { DataVisibilityCard } from '@/components/admin/DataVisibilityCard';
import { ReleaseNoteForm } from '@/components/features/ReleaseNoteForm';

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

const ROLE_CONFIG: Record<AppRole, { label: string; icon: React.ComponentType<{ className?: string }>; variant: 'default' | 'secondary' | 'outline' }> = {
  admin: { label: 'Administrateur', icon: Crown, variant: 'default' },
  manager: { label: 'Manager', icon: UserCog, variant: 'secondary' },
  agent: { label: 'Agent', icon: UserIcon, variant: 'outline' },
};

export default function Admin() {
  const { user } = useAuth();
  const { controls: onboardControls, clearControls: clearOnboard, setControls: setOnboard } = useSupabaseOnboardControls();
  const { controls: stationControls, clearControls: clearStation, setControls: setStation } = useSupabaseStationControls();
  const { reports: bugReports, updateStatus: updateBugStatus, refetch: refetchBugs } = useBugReports();
  const { releaseNotes, addReleaseNote, refetch: refetchReleaseNotes } = useReleaseNotes();
  const { settings: featureSettings, toggleFeature, FEATURE_LABELS } = useAdminFeatures();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [roleHistory, setRoleHistory] = useState<RoleHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [managingUser, setManagingUser] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
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

      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email || '',
          full_name: profile.full_name,
          role: (userRole?.role as AppRole) || 'agent',
          created_at: profile.created_at,
        };
      });

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

      // Fetch profiles for user names
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

  const notifyAdmins = async (action: 'suspension' | 'deletion' | 'role_change', targetUser: UserWithRole, details?: string) => {
    try {
      await supabase.functions.invoke('notify-admins', {
        body: {
          action,
          targetUserEmail: targetUser.email,
          targetUserName: targetUser.full_name,
          performedByEmail: user?.email,
          performedByName: user?.email?.split('@')[0],
          details,
        },
      });
      console.log('Admin notification sent');
    } catch (error) {
      console.error('Error sending admin notification:', error);
      // Don't throw - notification failure shouldn't block the action
    }
  };

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    if (userId === user?.id) {
      toast.error('Vous ne pouvez pas modifier votre propre rôle');
      return;
    }

    const targetUser = users.find(u => u.id === userId);
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

      // Log role change in history
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

      // Send admin notification for role change to admin
      if (newRole === 'admin' && targetUser) {
        await notifyAdmins('role_change', targetUser, `Nouveau rôle: ${ROLE_CONFIG[newRole].label} (ancien: ${oldRole ? ROLE_CONFIG[oldRole].label : 'Aucun'})`);
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erreur lors de la mise à jour du rôle');
    } finally {
      setUpdating(null);
    }
  };

  const handlePasswordChange = async () => {
    if (!selectedUser || !newPassword) return;

    // Validate password - must match server-side requirements
    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      toast.error('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre');
      return;
    }

    setChangingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
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

  const handleUserAction = async (userId: string, action: 'delete' | 'suspend' | 'reactivate') => {
    const targetUser = users.find(u => u.id === userId);
    
    setManagingUser(userId);
    try {
      const response = await supabase.functions.invoke('manage-user', {
        body: { targetUserId: userId, action },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de l\'action');
      }

      const actionLabels = {
        delete: 'supprimé',
        suspend: 'suspendu',
        reactivate: 'réactivé',
      };

      toast.success(`Compte ${actionLabels[action]} avec succès`);
      
      // Send admin notification for sensitive actions
      if (targetUser && (action === 'delete' || action === 'suspend')) {
        const notifyAction = action === 'delete' ? 'deletion' : 'suspension';
        await notifyAdmins(notifyAction, targetUser);
      }
      
      if (action === 'delete') {
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error managing user:', error);
      toast.error(error.message || 'Erreur lors de l\'action');
    } finally {
      setManagingUser(null);
    }
  };

  const exportUsersCSV = () => {
    const headers = ['Nom', 'Email', 'Rôle', 'Date d\'inscription'];
    const rows = filteredUsers.map(u => [
      u.full_name || 'Sans nom',
      u.email,
      ROLE_CONFIG[u.role].label,
      new Date(u.created_at).toLocaleDateString('fr-FR'),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utilisateurs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  // Data management functions
  const handleExport = () => {
    const data = {
      onboardControls,
      stationControls,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sncf-controles-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Données exportées avec succès');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            if (data.onboardControls) {
              const merged = [...data.onboardControls, ...onboardControls];
              setOnboard(merged);
              localStorage.setItem('sncf-controls-onboard', JSON.stringify(merged));
            }
            if (data.stationControls) {
              const merged = [...data.stationControls, ...stationControls];
              setStation(merged);
              localStorage.setItem('sncf-controls-station', JSON.stringify(merged));
            }
            toast.success('Données importées avec succès');
          } catch {
            toast.error('Fichier invalide');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer toutes les données ? Cette action est irréversible.')) {
      clearOnboard();
      clearStation();
      toast.success('Toutes les données ont été supprimées');
    }
  };

  if (user && user.role !== 'admin') {
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
    admin: users.filter((u) => u.role === 'admin').length,
    manager: users.filter((u) => u.role === 'manager').length,
    agent: users.filter((u) => u.role === 'agent').length,
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Administration
          </h1>
          <p className="text-muted-foreground">Gérez les utilisateurs et leurs rôles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportUsersCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => { fetchUsers(); fetchRoleHistory(); }} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.entries(ROLE_CONFIG) as [AppRole, typeof ROLE_CONFIG[AppRole]][]).map(([role, config]) => {
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
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Historique des rôles
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <FileText className="h-4 w-4" />
            Logs d'audit
          </TabsTrigger>
          <TabsTrigger value="bugs" className="gap-2">
            <Bug className="h-4 w-4" />
            Bugs signalés
          </TabsTrigger>
          <TabsTrigger value="releases" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Notes de version
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="h-4 w-4" />
            Gestion des données
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Fonctionnalités
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Utilisateurs ({filteredUsers.length})
              </CardTitle>
              <CardDescription>
                Modifiez les rôles des utilisateurs pour contrôler leurs permissions
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
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as AppRole | 'all')}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filtrer par rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    <SelectItem value="admin">Administrateurs</SelectItem>
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
                  <p>Aucun utilisateur trouvé</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rôle actuel</TableHead>
                        <TableHead>Inscription</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => {
                        const RoleIcon = ROLE_CONFIG[u.role].icon;
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
                              <Badge variant={ROLE_CONFIG[u.role].variant} className="gap-1">
                                <RoleIcon className="h-3 w-3" />
                                {ROLE_CONFIG[u.role].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString('fr-FR')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Select
                                  value={u.role}
                                  onValueChange={(value: AppRole) => updateUserRole(u.id, value)}
                                  disabled={isCurrentUser || updating === u.id}
                                >
                                  <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">
                                      <div className="flex items-center gap-2">
                                        <Crown className="h-4 w-4" />
                                        Administrateur
                                      </div>
                                    </SelectItem>
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
                                        disabled={newPassword.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword) || changingPassword}
                                      >
                                        {changingPassword ? 'Modification...' : 'Changer le mot de passe'}
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                                
                                {/* Suspend Button */}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="icon"
                                      disabled={isCurrentUser || managingUser === u.id}
                                      title="Suspendre le compte"
                                    >
                                      <Ban className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Suspendre ce compte ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        L'utilisateur <strong>{u.full_name || u.email}</strong> ne pourra plus se connecter.
                                        Cette action est réversible.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleUserAction(u.id, 'suspend')}>
                                        Suspendre
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>

                                {/* Reactivate Button */}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="icon"
                                      disabled={isCurrentUser || managingUser === u.id}
                                      title="Réactiver le compte"
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Réactiver ce compte ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        L'utilisateur <strong>{u.full_name || u.email}</strong> pourra à nouveau se connecter.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleUserAction(u.id, 'reactivate')}
                                        className="bg-green-600 text-white hover:bg-green-700"
                                      >
                                        Réactiver
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>

                                {/* Delete Button */}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="destructive" 
                                      size="icon"
                                      disabled={isCurrentUser || managingUser === u.id}
                                      title="Supprimer le compte"
                                    >
                                      <UserX className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        L'utilisateur <strong>{u.full_name || u.email}</strong> sera définitivement supprimé.
                                        Cette action est irréversible et supprimera toutes les données associées.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleUserAction(u.id, 'delete')}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Supprimer définitivement
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
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

        <TabsContent value="security">
          <SecurityDashboard />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Historique des modifications
              </CardTitle>
              <CardDescription>
                Consultez l'historique des changements de rôles
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
                            {entry.old_role ? (
                              <Badge variant={ROLE_CONFIG[entry.old_role].variant}>
                                {ROLE_CONFIG[entry.old_role].label}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={ROLE_CONFIG[entry.new_role].variant}>
                              {ROLE_CONFIG[entry.new_role].label}
                            </Badge>
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

        <TabsContent value="audit">
          <AuditLogsTab />
        </TabsContent>

        <TabsContent value="bugs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bug className="h-5 w-5 text-primary" />
                    Bugs signalés ({bugReports.length})
                  </CardTitle>
                  <CardDescription>
                    Gérez les signalements de bugs des utilisateurs
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={refetchBugs}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualiser
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {bugReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bug className="h-12 w-12 mb-4" />
                  <p>Aucun bug signalé</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Titre</TableHead>
                        <TableHead>Priorité</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Signalé par</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bugReports.map((bug) => (
                        <TableRow key={bug.id}>
                          <TableCell className="text-muted-foreground">
                            {new Date(bug.createdAt).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{bug.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{bug.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={bug.priority === 'high' ? 'destructive' : bug.priority === 'medium' ? 'default' : 'secondary'}>
                              {bug.priority === 'high' ? 'Haute' : bug.priority === 'medium' ? 'Moyenne' : 'Faible'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={bug.status === 'resolved' ? 'default' : bug.status === 'in_progress' ? 'secondary' : 'outline'}>
                              {bug.status === 'open' ? 'Ouvert' : bug.status === 'in_progress' ? 'En cours' : bug.status === 'resolved' ? 'Résolu' : 'Fermé'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {bug.userName || bug.userEmail || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Select 
                              value={bug.status} 
                              onValueChange={(v) => updateBugStatus(bug.id, v as 'open' | 'in_progress' | 'resolved' | 'closed')}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Ouvert</SelectItem>
                                <SelectItem value="in_progress">En cours</SelectItem>
                                <SelectItem value="resolved">Résolu</SelectItem>
                                <SelectItem value="closed">Fermé</SelectItem>
                              </SelectContent>
                            </Select>
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

        <TabsContent value="releases">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Notes de version ({releaseNotes.length})
                  </CardTitle>
                  <CardDescription>
                    Gérez les notes de version de l'application
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <ReleaseNoteForm />
                  <Button variant="outline" onClick={refetchReleaseNotes}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Actualiser
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {releaseNotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucune note de version</p>
                  <p className="text-sm">Cliquez sur "Nouvelle version" pour en créer une</p>
                </div>
              ) : (
                releaseNotes.map((note) => (
                  <div key={note.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge>v{note.version}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(note.releaseDate).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <h4 className="font-semibold">{note.title}</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{note.content}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Gestion des données
              </CardTitle>
              <CardDescription>
                {onboardControls.length + stationControls.length} contrôles enregistrés au total
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Contrôles à bord</p>
                  <p className="text-2xl font-bold">{onboardControls.length}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Contrôles en gare</p>
                  <p className="text-2xl font-bold">{stationControls.length}</p>
                </div>
              </div>
              <div className="space-y-3 pt-4">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={handleExport}>
                  <Download className="h-4 w-4" />
                  Exporter tous les contrôles (JSON)
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={handleImport}>
                  <Upload className="h-4 w-4" />
                  Importer des contrôles
                </Button>
                <Button variant="destructive" className="w-full justify-start gap-2" onClick={handleReset}>
                  <Trash2 className="h-4 w-4" />
                  Réinitialiser toutes les données
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  Fonctionnalités du site
                </CardTitle>
                <CardDescription>
                  Activez ou désactivez les fonctionnalités pour tous les utilisateurs du site
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(FEATURE_LABELS).map(([key, { name, description }]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor={key} className="text-base font-medium">
                        {name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {description}
                      </p>
                    </div>
                    <Switch
                      id={key}
                      checked={featureSettings[key as keyof typeof featureSettings]}
                      onCheckedChange={(checked) => toggleFeature(key as keyof typeof featureSettings, checked)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <DataVisibilityCard />

            <EmailSettingsCard />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}