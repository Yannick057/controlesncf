import { useState, useEffect } from 'react';
import { Eye, EyeOff, Globe, Users, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDataVisibility } from '@/hooks/useDataVisibility';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface UserWithVisibility {
  id: string;
  email: string;
  fullName: string | null;
  canViewAllData: boolean;
}

export function DataVisibilityCard() {
  const { 
    globalVisibility, 
    toggleGlobalVisibility, 
    grantUserVisibility,
    getUserVisibility,
    loading,
    refetch,
  } = useDataVisibility();

  const [users, setUsers] = useState<UserWithVisibility[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email');

      const { data: visibilitySettings } = await supabase
        .from('data_visibility_settings')
        .select('user_id, can_view_all_data');

      const visibilityMap = new Map(
        (visibilitySettings || []).map(s => [s.user_id, s.can_view_all_data])
      );

      setUsers((profiles || []).map(p => ({
        id: p.id,
        email: p.email || '',
        fullName: p.full_name,
        canViewAllData: visibilityMap.get(p.id) || false,
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleToggleUser = async (userId: string, currentValue: boolean) => {
    setUpdatingUser(userId);
    await grantUserVisibility(userId, !currentValue);
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, canViewAllData: !currentValue } : u
    ));
    setUpdatingUser(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          Visibilité des données
        </CardTitle>
        <CardDescription>
          Contrôlez qui peut voir les données de tous les utilisateurs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global Toggle */}
        <div className={cn(
          "flex items-center justify-between rounded-lg border p-4 transition-colors",
          globalVisibility ? "border-primary bg-primary/5" : "border-border"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              globalVisibility ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <Label className="text-base font-medium">Visibilité globale</Label>
              <p className="text-sm text-muted-foreground">
                {globalVisibility 
                  ? "Tous les utilisateurs peuvent voir toutes les données" 
                  : "Chaque utilisateur ne voit que ses propres données"}
              </p>
            </div>
          </div>
          <Switch
            checked={globalVisibility}
            onCheckedChange={toggleGlobalVisibility}
            disabled={loading}
          />
        </div>

        {/* Individual Users */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label>Permissions individuelles</Label>
            </div>
            <Badge variant={globalVisibility ? "secondary" : "outline"}>
              {globalVisibility ? "Désactivé (mode global)" : "Actif"}
            </Badge>
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Voir toutes les données</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.fullName || 'Sans nom'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {globalVisibility ? (
                            <Badge variant="secondary" className="gap-1">
                              <Check className="h-3 w-3" />
                              Via global
                            </Badge>
                          ) : (
                            <Switch
                              checked={user.canViewAllData}
                              onCheckedChange={() => handleToggleUser(user.id, user.canViewAllData)}
                              disabled={updatingUser === user.id}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-1">ℹ️ Comment ça fonctionne :</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Visibilité globale activée</strong> : Tous les utilisateurs voient toutes les données</li>
            <li><strong>Visibilité globale désactivée</strong> : Seuls les utilisateurs avec permission individuelle voient tout</li>
            <li>Les managers et admins ont toujours accès à toutes les données</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
