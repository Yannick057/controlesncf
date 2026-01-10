import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Save, Info } from 'lucide-react';
import { useEmailSettings } from '@/hooks/useEmailSettings';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function EmailSettingsCard() {
  const { settings, loading, updateSetting } = useEmailSettings();
  const [senderDomain, setSenderDomain] = useState(settings.sender_domain);
  const [saving, setSaving] = useState(false);

  // Update local state when settings load
  useState(() => {
    setSenderDomain(settings.sender_domain);
  });

  const handleSave = async () => {
    setSaving(true);
    await updateSetting('sender_domain', senderDomain);
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chargement...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Paramètres Email
        </CardTitle>
        <CardDescription>
          Configurez l'adresse d'envoi des notifications email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Pour utiliser un domaine personnalisé, vous devez d'abord le vérifier sur{' '}
            <a 
              href="https://resend.com/domains" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-medium underline hover:text-primary"
            >
              resend.com/domains
            </a>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="sender-domain">Adresse d'expéditeur</Label>
          <div className="flex gap-2">
            <Input
              id="sender-domain"
              value={senderDomain}
              onChange={(e) => setSenderDomain(e.target.value)}
              placeholder="notifications@votredomaine.com"
              className="flex-1"
            />
            <Button 
              onClick={handleSave} 
              disabled={saving || senderDomain === settings.sender_domain}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Format: email@domaine.com (ex: notifications@votreentreprise.com)
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-sm font-medium">Domaine actuel :</p>
          <p className="text-sm text-muted-foreground">{settings.sender_domain}</p>
        </div>
      </CardContent>
    </Card>
  );
}
