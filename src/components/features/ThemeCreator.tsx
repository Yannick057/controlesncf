import { useState, useRef } from 'react';
import { Plus, Palette, Trash2, Globe, Lock, Copy, Check, Loader2, Pencil, Download, Upload, Eye } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Theme export format
interface ThemeExport {
  version: string;
  name: string;
  colors: CustomTheme['colors'];
  exportedAt: string;
}

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
  onEdit,
  onExport,
}: { 
  theme: CustomTheme;
  isActive: boolean;
  isOwner: boolean;
  onApply: () => void;
  onDelete?: () => void;
  onDuplicate: () => void;
  onTogglePublic?: () => void;
  onEdit?: () => void;
  onExport?: () => void;
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

      <div className="flex gap-2 flex-wrap">
        <Button 
          size="sm" 
          variant={isActive ? "default" : "outline"}
          className="flex-1"
          onClick={onApply}
        >
          {isActive ? <Check className="mr-1 h-3 w-3" /> : null}
          {isActive ? 'Actif' : 'Appliquer'}
        </Button>
        {isOwner && onEdit && (
          <Button size="sm" variant="ghost" onClick={onEdit} title="Modifier">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onDuplicate} title="Dupliquer">
          <Copy className="h-4 w-4" />
        </Button>
        {onExport && (
          <Button size="sm" variant="ghost" onClick={onExport} title="Exporter">
            <Download className="h-4 w-4" />
          </Button>
        )}
        {isOwner && onTogglePublic && (
          <Button size="sm" variant="ghost" onClick={onTogglePublic} title={theme.isPublic ? 'Rendre privé' : 'Partager'}>
            {theme.isPublic ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
          </Button>
        )}
        {isOwner && onDelete && (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete} title="Supprimer">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ThemeCreator() {
  const { user } = useAuth();
  const { 
    themes, 
    publicThemes, 
    loading, 
    activeCustomTheme,
    createTheme, 
    updateTheme,
    deleteTheme, 
    applyTheme,
    previewTheme,
    duplicateTheme,
    duplicateAndEdit,
    DEFAULT_COLORS,
  } = useCustomThemes();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [newTheme, setNewTheme] = useState({
    name: '',
    isPublic: false,
    colors: { ...DEFAULT_COLORS },
  });
  const [editTheme, setEditTheme] = useState({
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

  const handleOpenEdit = (theme: CustomTheme) => {
    setEditingTheme(theme);
    setEditTheme({
      name: theme.name,
      isPublic: theme.isPublic,
      colors: { ...theme.colors },
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTheme) return;
    
    if (!editTheme.name.trim()) {
      toast.error('Veuillez donner un nom au thème');
      return;
    }

    setCreating(true);
    
    // Check if user owns this theme
    if (editingTheme.userId === user?.id) {
      // Update existing theme
      await updateTheme(editingTheme.id, {
        name: editTheme.name,
        isPublic: editTheme.isPublic,
        colors: editTheme.colors,
      });
    } else {
      // Duplicate and create new theme for community themes
      await duplicateAndEdit(editingTheme, {
        name: editTheme.name,
        colors: editTheme.colors,
      });
    }
    
    setCreating(false);
    setEditDialogOpen(false);
    setEditingTheme(null);
  };

  const updateColor = (key: keyof typeof DEFAULT_COLORS, value: string) => {
    const newColors = { ...newTheme.colors, [key]: value };
    setNewTheme(prev => ({
      ...prev,
      colors: newColors,
    }));
    // Live preview
    if (isPreviewActive) {
      previewTheme(newColors);
    }
  };

  const updateEditColor = (key: keyof typeof DEFAULT_COLORS, value: string) => {
    const newColors = { ...editTheme.colors, [key]: value };
    setEditTheme(prev => ({
      ...prev,
      colors: newColors,
    }));
    // Live preview during edit
    if (isPreviewActive) {
      previewTheme(newColors);
    }
  };

  // Toggle live preview mode
  const togglePreview = (colors: typeof DEFAULT_COLORS) => {
    if (isPreviewActive) {
      // Stop preview - revert to current theme
      previewTheme(null);
      setIsPreviewActive(false);
    } else {
      // Start preview
      previewTheme(colors);
      setIsPreviewActive(true);
    }
  };

  // Cancel preview when closing dialogs
  const handleCloseDialog = (open: boolean) => {
    if (!open && isPreviewActive) {
      previewTheme(null);
      setIsPreviewActive(false);
    }
    setDialogOpen(open);
    if (!open) {
      setNewTheme({ name: '', isPublic: false, colors: { ...DEFAULT_COLORS } });
    }
  };

  const handleCloseEditDialog = (open: boolean) => {
    if (!open && isPreviewActive) {
      previewTheme(null);
      setIsPreviewActive(false);
    }
    setEditDialogOpen(open);
    if (!open) {
      setEditingTheme(null);
    }
  };

  // Export theme to JSON file
  const handleExportTheme = (theme: CustomTheme) => {
    const exportData: ThemeExport = {
      version: '1.0',
      name: theme.name,
      colors: theme.colors,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${theme.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Thème "${theme.name}" exporté`);
  };

  // Import theme from JSON file
  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content) as ThemeExport;

        // Validate the imported data
        if (!importedData.name || !importedData.colors) {
          throw new Error('Format de fichier invalide');
        }

        // Validate colors
        const requiredColors = ['background', 'foreground', 'primary', 'primaryForeground', 'secondary', 'accent', 'muted', 'card', 'border'];
        const hasAllColors = requiredColors.every(color => color in importedData.colors);
        
        if (!hasAllColors) {
          throw new Error('Le thème importé ne contient pas toutes les couleurs requises');
        }

        // Create the theme
        const result = await createTheme(
          `${importedData.name} (importé)`,
          { ...DEFAULT_COLORS, ...importedData.colors },
          false
        );

        if (result) {
          toast.success(`Thème "${importedData.name}" importé avec succès`);
        }
      } catch (error) {
        console.error('Import error:', error);
        toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'import du thème');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Thèmes personnalisés
            </CardTitle>
            <CardDescription>
              Créez et partagez vos propres thèmes de couleurs
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Hidden file input for import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportTheme}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </Button>
            <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un thème
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Créer un thème personnalisé</span>
                  <Button 
                    variant={isPreviewActive ? "default" : "outline"} 
                    size="sm"
                    onClick={() => togglePreview(newTheme.colors)}
                    className="gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    {isPreviewActive ? 'Arrêter' : 'Prévisualiser'}
                  </Button>
                </DialogTitle>
                {isPreviewActive && (
                  <p className="text-sm text-muted-foreground bg-primary/10 rounded-md p-2 mt-2">
                    🎨 Mode prévisualisation actif - Les changements sont visibles en temps réel
                  </p>
                )}
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
                    onEdit={() => handleOpenEdit(theme)}
                    onExport={() => handleExportTheme(theme)}
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
                    onExport={() => handleExportTheme(theme)}
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

      {/* Edit Theme Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={handleCloseEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{editingTheme?.userId === user?.id ? 'Modifier le thème' : 'Personnaliser ce thème'}</span>
              <Button 
                variant={isPreviewActive ? "default" : "outline"} 
                size="sm"
                onClick={() => togglePreview(editTheme.colors)}
                className="gap-1"
              >
                <Eye className="h-4 w-4" />
                {isPreviewActive ? 'Arrêter' : 'Prévisualiser'}
              </Button>
            </DialogTitle>
            {isPreviewActive && (
              <p className="text-sm text-muted-foreground bg-primary/10 rounded-md p-2 mt-2">
                🎨 Mode prévisualisation actif - Les changements sont visibles en temps réel
              </p>
            )}
            {editingTheme?.userId !== user?.id && !isPreviewActive && (
              <p className="text-sm text-muted-foreground">
                Une copie personnelle sera créée avec vos modifications.
              </p>
            )}
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              <div className="space-y-2">
                <Label htmlFor="edit-theme-name">Nom du thème</Label>
                <Input
                  id="edit-theme-name"
                  value={editTheme.name}
                  onChange={(e) => setEditTheme(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Mon thème personnalisé"
                />
              </div>

              {editingTheme?.userId === user?.id && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label>Partager publiquement</Label>
                    <p className="text-xs text-muted-foreground">Les autres utilisateurs pourront voir et utiliser ce thème</p>
                  </div>
                  <Switch
                    checked={editTheme.isPublic}
                    onCheckedChange={(checked) => setEditTheme(prev => ({ ...prev, isPublic: checked }))}
                  />
                </div>
              )}

              <div className="space-y-3">
                <Label>Couleurs</Label>
                <ColorInput 
                  label="Arrière-plan" 
                  value={editTheme.colors.background} 
                  onChange={(v) => updateEditColor('background', v)} 
                />
                <ColorInput 
                  label="Texte principal" 
                  value={editTheme.colors.foreground} 
                  onChange={(v) => updateEditColor('foreground', v)} 
                />
                <ColorInput 
                  label="Couleur primaire" 
                  value={editTheme.colors.primary} 
                  onChange={(v) => updateEditColor('primary', v)} 
                />
                <ColorInput 
                  label="Texte sur primaire" 
                  value={editTheme.colors.primaryForeground} 
                  onChange={(v) => updateEditColor('primaryForeground', v)} 
                />
                <ColorInput 
                  label="Secondaire" 
                  value={editTheme.colors.secondary} 
                  onChange={(v) => updateEditColor('secondary', v)} 
                />
                <ColorInput 
                  label="Accent" 
                  value={editTheme.colors.accent} 
                  onChange={(v) => updateEditColor('accent', v)} 
                />
                <ColorInput 
                  label="Muted" 
                  value={editTheme.colors.muted} 
                  onChange={(v) => updateEditColor('muted', v)} 
                />
                <ColorInput 
                  label="Carte" 
                  value={editTheme.colors.card} 
                  onChange={(v) => updateEditColor('card', v)} 
                />
                <ColorInput 
                  label="Bordure" 
                  value={editTheme.colors.border} 
                  onChange={(v) => updateEditColor('border', v)} 
                />
              </div>

              {/* Preview */}
              <div className="rounded-lg border p-4" style={{ 
                backgroundColor: `hsl(${editTheme.colors.background})`,
                color: `hsl(${editTheme.colors.foreground})`,
              }}>
                <p className="text-sm font-medium mb-2">Aperçu</p>
                <div className="flex gap-2">
                  <div 
                    className="px-3 py-1 rounded text-sm"
                    style={{ 
                      backgroundColor: `hsl(${editTheme.colors.primary})`,
                      color: `hsl(${editTheme.colors.primaryForeground})`,
                    }}
                  >
                    Bouton primaire
                  </div>
                  <div 
                    className="px-3 py-1 rounded text-sm"
                    style={{ 
                      backgroundColor: `hsl(${editTheme.colors.secondary})`,
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
            <Button onClick={handleSaveEdit} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTheme?.userId === user?.id ? 'Enregistrer' : 'Créer ma version'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
