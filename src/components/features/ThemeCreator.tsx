import { useState } from 'react';
import { Plus, Palette, Trash2, Globe, Lock, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCustomThemes, CustomTheme } from '@/hooks/useCustomThemes';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
  // Convert HSL string to hex for the color picker
  const hslToHex = (hsl: string) => {
    const [h, s, l] = hsl.split(' ').map(v => parseFloat(v.replace('%', '')));
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  // Convert hex to HSL string
  const hexToHsl = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return value;
    
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
        case g: h = ((b - r) / d + 2) * 60; break;
        case b: h = ((r - g) / d + 4) * 60; break;
      }
    }

    return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  return (
    <div className="flex items-center gap-3">
      <div 
        className="w-10 h-10 rounded-lg border shadow-sm shrink-0"
        style={{ backgroundColor: `hsl(${value})` }}
      />
      <div className="flex-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={hslToHex(value)}
            onChange={(e) => onChange(hexToHsl(e.target.value))}
            className="w-12 h-8 p-1 cursor-pointer"
          />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 h-8 text-xs font-mono"
            placeholder="0 0% 100%"
          />
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ 
  theme, 
  isActive,
  isOwner,
  onApply, 
  onDelete,
  onDuplicate,
  onTogglePublic,
}: { 
  theme: CustomTheme;
  isActive: boolean;
  isOwner: boolean;
  onApply: () => void;
  onDelete?: () => void;
  onDuplicate: () => void;
  onTogglePublic?: () => void;
}) {
  return (
    <div className={cn(
      "rounded-xl border-2 p-4 transition-all",
      isActive ? "border-primary shadow-lg" : "border-border hover:border-primary/50"
    )}>
      {/* Color Preview */}
      <div className="flex gap-1 mb-3">
        <div 
          className="flex-1 h-8 rounded-l-lg" 
          style={{ backgroundColor: `hsl(${theme.colors.primary})` }} 
        />
        <div 
          className="flex-1 h-8" 
          style={{ backgroundColor: `hsl(${theme.colors.secondary})` }} 
        />
        <div 
          className="flex-1 h-8" 
          style={{ backgroundColor: `hsl(${theme.colors.accent})` }} 
        />
        <div 
          className="flex-1 h-8 rounded-r-lg" 
          style={{ backgroundColor: `hsl(${theme.colors.background})` }} 
        />
      </div>

      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold truncate">{theme.name}</h4>
        <div className="flex gap-1">
          {theme.isPublic ? (
            <Badge variant="secondary" className="gap-1">
              <Globe className="h-3 w-3" />
              Public
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
              Privé
            </Badge>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant={isActive ? "default" : "outline"}
          className="flex-1"
          onClick={onApply}
        >
          {isActive ? <Check className="mr-1 h-3 w-3" /> : null}
          {isActive ? 'Actif' : 'Appliquer'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
        </Button>
        {isOwner && onTogglePublic && (
          <Button size="sm" variant="ghost" onClick={onTogglePublic}>
            {theme.isPublic ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
          </Button>
        )}
        {isOwner && onDelete && (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ThemeCreator() {
  const { 
    themes, 
    publicThemes, 
    loading, 
    activeCustomTheme,
    createTheme, 
    updateTheme,
    deleteTheme, 
    applyTheme,
    duplicateTheme,
    DEFAULT_COLORS,
  } = useCustomThemes();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTheme, setNewTheme] = useState({
    name: '',
    isPublic: false,
    colors: { ...DEFAULT_COLORS },
  });

  const handleCreate = async () => {
    if (!newTheme.name.trim()) {
      toast.error('Veuillez donner un nom au thème');
      return;
    }

    setCreating(true);
    const result = await createTheme(newTheme.name, newTheme.colors, newTheme.isPublic);
    setCreating(false);

    if (result) {
      setDialogOpen(false);
      setNewTheme({ name: '', isPublic: false, colors: { ...DEFAULT_COLORS } });
    }
  };

  const updateColor = (key: keyof typeof DEFAULT_COLORS, value: string) => {
    setNewTheme(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Thèmes personnalisés
            </CardTitle>
            <CardDescription>
              Créez et partagez vos propres thèmes de couleurs
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Créer un thème
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Créer un thème personnalisé</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 p-1">
                  <div className="space-y-2">
                    <Label htmlFor="theme-name">Nom du thème</Label>
                    <Input
                      id="theme-name"
                      value={newTheme.name}
                      onChange={(e) => setNewTheme(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Mon thème personnalisé"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label>Partager publiquement</Label>
                      <p className="text-xs text-muted-foreground">Les autres utilisateurs pourront voir et utiliser ce thème</p>
                    </div>
                    <Switch
                      checked={newTheme.isPublic}
                      onCheckedChange={(checked) => setNewTheme(prev => ({ ...prev, isPublic: checked }))}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Couleurs</Label>
                    <ColorInput 
                      label="Arrière-plan" 
                      value={newTheme.colors.background} 
                      onChange={(v) => updateColor('background', v)} 
                    />
                    <ColorInput 
                      label="Texte principal" 
                      value={newTheme.colors.foreground} 
                      onChange={(v) => updateColor('foreground', v)} 
                    />
                    <ColorInput 
                      label="Couleur primaire" 
                      value={newTheme.colors.primary} 
                      onChange={(v) => updateColor('primary', v)} 
                    />
                    <ColorInput 
                      label="Texte sur primaire" 
                      value={newTheme.colors.primaryForeground} 
                      onChange={(v) => updateColor('primaryForeground', v)} 
                    />
                    <ColorInput 
                      label="Secondaire" 
                      value={newTheme.colors.secondary} 
                      onChange={(v) => updateColor('secondary', v)} 
                    />
                    <ColorInput 
                      label="Accent" 
                      value={newTheme.colors.accent} 
                      onChange={(v) => updateColor('accent', v)} 
                    />
                    <ColorInput 
                      label="Muted" 
                      value={newTheme.colors.muted} 
                      onChange={(v) => updateColor('muted', v)} 
                    />
                    <ColorInput 
                      label="Carte" 
                      value={newTheme.colors.card} 
                      onChange={(v) => updateColor('card', v)} 
                    />
                    <ColorInput 
                      label="Bordure" 
                      value={newTheme.colors.border} 
                      onChange={(v) => updateColor('border', v)} 
                    />
                  </div>

                  {/* Preview */}
                  <div className="rounded-lg border p-4" style={{ 
                    backgroundColor: `hsl(${newTheme.colors.background})`,
                    color: `hsl(${newTheme.colors.foreground})`,
                  }}>
                    <p className="text-sm font-medium mb-2">Aperçu</p>
                    <div className="flex gap-2">
                      <div 
                        className="px-3 py-1 rounded text-sm"
                        style={{ 
                          backgroundColor: `hsl(${newTheme.colors.primary})`,
                          color: `hsl(${newTheme.colors.primaryForeground})`,
                        }}
                      >
                        Bouton primaire
                      </div>
                      <div 
                        className="px-3 py-1 rounded text-sm"
                        style={{ 
                          backgroundColor: `hsl(${newTheme.colors.secondary})`,
                        }}
                      >
                        Secondaire
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Annuler</Button>
                </DialogClose>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer le thème
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="mine">
          <TabsList className="mb-4">
            <TabsTrigger value="mine">Mes thèmes ({themes.length})</TabsTrigger>
            <TabsTrigger value="community">Communauté ({publicThemes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="mine">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : themes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Palette className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun thème personnalisé</p>
                <p className="text-sm">Cliquez sur "Créer un thème" pour commencer</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {themes.map(theme => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    isActive={activeCustomTheme === theme.id}
                    isOwner={true}
                    onApply={() => applyTheme(activeCustomTheme === theme.id ? null : theme)}
                    onDelete={() => deleteTheme(theme.id)}
                    onDuplicate={() => duplicateTheme(theme)}
                    onTogglePublic={() => updateTheme(theme.id, { isPublic: !theme.isPublic })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="community">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : publicThemes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun thème partagé pour l'instant</p>
                <p className="text-sm">Partagez vos thèmes pour les voir ici</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {publicThemes.map(theme => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    isActive={activeCustomTheme === theme.id}
                    isOwner={false}
                    onApply={() => applyTheme(activeCustomTheme === theme.id ? null : theme)}
                    onDuplicate={() => duplicateTheme(theme)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {activeCustomTheme && (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={() => applyTheme(null)}>
              Réinitialiser au thème par défaut
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
