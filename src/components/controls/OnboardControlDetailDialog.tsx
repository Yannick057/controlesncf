import { useState } from 'react';
import { Eye, Pencil, Trash2, X, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OnboardControl, TarifItem, TarifBordItem } from '@/hooks/useSupabaseControls';
import { CitySelect } from './CitySelect';
import { TrainNumberInput } from './TrainNumberInput';
import { cn } from '@/lib/utils';

interface OnboardControlDetailDialogProps {
  control: OnboardControl;
  onUpdate?: (control: OnboardControl) => void;
  onDelete?: (id: string) => void;
  trigger?: React.ReactNode;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  } catch {
    return dateStr;
  }
}

function safeArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? val : [];
}

function safeNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  return fallback;
}

export function OnboardControlDetailDialog({
  control,
  onUpdate,
  onDelete,
  trigger,
}: OnboardControlDetailDialogProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedControl, setEditedControl] = useState<OnboardControl>(control);

  const tarifsBord = safeArray<TarifBordItem>(control.tarifsBord);
  const tarifsControle = safeArray<TarifItem>(control.tarifsControle);
  const pvList = safeArray<TarifItem>(control.pvList);

  const totalTarifsBord = tarifsBord.reduce((s, t) => s + safeNumber(t?.montant), 0);
  const totalTarifsControle = tarifsControle.reduce((s, t) => s + safeNumber(t?.montant), 0) + safeNumber(control.stt50Count) * 50;
  const totalPV = pvList.reduce((s, t) => s + safeNumber(t?.montant), 0) + safeNumber(control.stt100Count) * 100;

  const handleSave = () => {
    if (onUpdate) {
      // Recalculate fraud rate
      const passengers = safeNumber(editedControl.passengers);
      const fraudCount = 
        safeArray<TarifItem>(editedControl.tarifsControle).length +
        safeArray<TarifItem>(editedControl.pvList).length +
        safeNumber(editedControl.stt50Count) +
        safeNumber(editedControl.stt100Count);
      const fraudRate = passengers > 0 ? (fraudCount / passengers) * 100 : 0;
      
      onUpdate({
        ...editedControl,
        fraudCount,
        fraudRate,
      });
    }
    setIsEditing(false);
    setOpen(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(control.id);
    }
    setOpen(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    setEditedControl(control);
    setOpen(false);
  };

  const renderTarifTypeLabel = (type: string) => {
    const colors: Record<string, string> = {
      'STT': 'bg-primary/20 text-primary',
      'RNV': 'bg-accent/20 text-accent-foreground',
      'Titre tiers': 'bg-warning/20 text-warning-foreground',
      'D. naissance': 'bg-success/20 text-success',
      'Autre': 'bg-secondary text-secondary-foreground',
    };
    return (
      <Badge className={cn('text-xs', colors[type] || colors['Autre'])}>
        {type}
      </Badge>
    );
  };

  const renderTarifBordTypeLabel = (type: string) => {
    return (
      <Badge className={cn(
        'text-xs',
        type === 'bord' ? 'bg-accent/20 text-accent-foreground' : 'bg-warning/20 text-warning-foreground'
      )}>
        {type === 'bord' ? 'Bord' : 'Exceptionnel'}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) handleClose();
      else setOpen(o);
    }}>
      {trigger ? (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Eye className="h-4 w-4" />
        </Button>
      )}
      
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {isEditing ? 'Modifier le contrôle' : 'Détail du contrôle'} - {control.trainNumber}
            </span>
          </DialogTitle>
          <DialogDescription>
            {formatDate(control.date)} à {control.time} • {control.origin} → {control.destination}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Numéro de train</Label>
                <TrainNumberInput
                  value={editedControl.trainNumber}
                  onChange={(v) => setEditedControl({ ...editedControl, trainNumber: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Passagers</Label>
                <Input
                  type="number"
                  value={editedControl.passengers}
                  onChange={(e) => setEditedControl({ ...editedControl, passengers: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Origine</Label>
                <CitySelect
                  id="edit-origin"
                  value={editedControl.origin}
                  onChange={(v) => setEditedControl({ ...editedControl, origin: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <CitySelect
                  id="edit-destination"
                  value={editedControl.destination}
                  onChange={(v) => setEditedControl({ ...editedControl, destination: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editedControl.date}
                  onChange={(e) => setEditedControl({ ...editedControl, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Heure</Label>
                <Input
                  type="time"
                  value={editedControl.time}
                  onChange={(e) => setEditedControl({ ...editedControl, time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Commentaire</Label>
              <Textarea
                value={editedControl.commentaire || ''}
                onChange={(e) => setEditedControl({ ...editedControl, commentaire: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{control.passengers}</p>
                  <p className="text-xs text-muted-foreground">Passagers</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className={cn(
                    'text-2xl font-bold',
                    control.fraudRate > 5 ? 'text-destructive' : control.fraudRate > 2 ? 'text-warning' : 'text-success'
                  )}>
                    {control.fraudRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Taux fraude</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{control.fraudCount}</p>
                  <p className="text-xs text-muted-foreground">Fraudes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-accent-foreground">
                    {(totalTarifsBord + totalTarifsControle + totalPV).toFixed(0)}€
                  </p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
            </div>

            {/* Tarifs à bord details */}
            {tarifsBord.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Tarifs à bord / exceptionnels</span>
                    <span className="text-accent-foreground">{totalTarifsBord.toFixed(2)}€</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {tarifsBord.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        {renderTarifBordTypeLabel(t.tarifType || 'bord')}
                        {t.description && <span className="text-muted-foreground">{t.description}</span>}
                      </div>
                      <span className="font-medium">{safeNumber(t.montant).toFixed(2)}€</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Tarifs contrôle details */}
            {(tarifsControle.length > 0 || safeNumber(control.stt50Count) > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Tarifs contrôle</span>
                    <span className="text-primary">{totalTarifsControle.toFixed(2)}€</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {tarifsControle.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                      {renderTarifTypeLabel(t.type)}
                      <span className="font-medium">{safeNumber(t.montant).toFixed(2)}€</span>
                    </div>
                  ))}
                  {safeNumber(control.stt50Count) > 0 && (
                    <div className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/20 text-primary text-xs">STT 50</Badge>
                        <span className="text-muted-foreground">×{control.stt50Count}</span>
                      </div>
                      <span className="font-medium">{(safeNumber(control.stt50Count) * 50).toFixed(2)}€</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* PV details */}
            {(pvList.length > 0 || safeNumber(control.stt100Count) > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Procès-verbaux (PV)</span>
                    <span className="text-destructive">{totalPV.toFixed(2)}€</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {pvList.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                      {renderTarifTypeLabel(t.type)}
                      <span className="font-medium">{safeNumber(t.montant).toFixed(2)}€</span>
                    </div>
                  ))}
                  {safeNumber(control.stt100Count) > 0 && (
                    <div className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-destructive/20 text-destructive text-xs">STT 100</Badge>
                        <span className="text-muted-foreground">×{control.stt100Count}</span>
                      </div>
                      <span className="font-medium">{(safeNumber(control.stt100Count) * 100).toFixed(2)}€</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* RI */}
            {(safeNumber(control.riPositif) > 0 || safeNumber(control.riNegatif) > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Relevés d'identité (RI)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="flex-1 rounded-lg bg-success/10 p-2 text-center">
                      <p className="text-lg font-bold text-success">{control.riPositif}</p>
                      <p className="text-xs text-muted-foreground">Positifs</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-destructive/10 p-2 text-center">
                      <p className="text-lg font-bold text-destructive">{control.riNegatif}</p>
                      <p className="text-xs text-muted-foreground">Négatifs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Commentaire */}
            {control.commentaire && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Commentaire</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{control.commentaire}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                setEditedControl(control);
              }}>
                <X className="mr-1 h-4 w-4" />
                Annuler
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-1 h-4 w-4" />
                Enregistrer
              </Button>
            </>
          ) : (
            <>
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-1 h-4 w-4" />
                      Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce contrôle ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Le contrôle du train {control.trainNumber} sera définitivement supprimé.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {onUpdate && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-1 h-4 w-4" />
                  Modifier
                </Button>
              )}
              <Button variant="secondary" onClick={handleClose}>
                Fermer
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
