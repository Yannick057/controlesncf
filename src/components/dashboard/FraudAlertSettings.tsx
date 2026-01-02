import { Bell, BellOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useFraudNotifications } from '@/hooks/useFraudNotifications';

export function FraudAlertSettings() {
  const { settings, hasPermission, requestPermission, updateSettings } = useFraudNotifications();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {settings.notificationsEnabled ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          Alertes de fraude
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="notifications-toggle">Activer les alertes</Label>
          <Switch
            id="notifications-toggle"
            checked={settings.notificationsEnabled}
            onCheckedChange={(checked) => updateSettings({ notificationsEnabled: checked })}
          />
        </div>

        {settings.notificationsEnabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="fraud-threshold">Seuil d'alerte (%)</Label>
              <div className="flex gap-2">
                <Input
                  id="fraud-threshold"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={settings.fraudThreshold}
                  onChange={(e) => updateSettings({ fraudThreshold: parseFloat(e.target.value) || 5 })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground self-center">
                  Alerte si taux &gt; {settings.fraudThreshold}%
                </span>
              </div>
            </div>

            {!hasPermission && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={requestPermission}
                className="w-full"
              >
                <Bell className="mr-2 h-4 w-4" />
                Activer les notifications système
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
