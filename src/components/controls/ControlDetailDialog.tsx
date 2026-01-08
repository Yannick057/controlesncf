import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Train, Building2, Users, AlertTriangle, FileText, User, Calendar, Clock, MapPin, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TarifItem {
  id: number;
  type: string;
  montant: number;
}

interface TarifBordItem {
  id: number;
  montant: number;
  description?: string;
  tarifType: 'bord' | 'exceptionnel';
}

interface ControlData {
  id: string | number;
  _type: 'onboard' | 'station';
  trainNumber?: string;
  stationName?: string;
  platform?: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  passengers: number;
  tarifsBord: TarifBordItem[];
  tarifsControle: TarifItem[];
  stt50Count: number;
  pvList: TarifItem[];
  stt100Count: number;
  riPositif: number;
  riNegatif: number;
  fraudCount: number;
  fraudRate: number;
  commentaire: string;
}

interface ControlDetailDialogProps {
  control: ControlData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTarifDetailList(items: TarifItem[], sttCount: number, sttAmount: number): { label: string; count: number; total: number }[] {
  const result: { label: string; count: number; total: number }[] = [];
  
  if (sttCount > 0) {
    result.push({ label: `STT ${sttAmount}€`, count: sttCount, total: sttCount * sttAmount });
  }
  
  const grouped: Record<string, { count: number; total: number }> = {};
  items.forEach((item) => {
    if (!grouped[item.type]) {
      grouped[item.type] = { count: 0, total: 0 };
    }
    grouped[item.type].count++;
    grouped[item.type].total += item.montant;
  });
  
  Object.entries(grouped).forEach(([type, data]) => {
    result.push({ label: type, count: data.count, total: data.total });
  });
  
  return result;
}

export function ControlDetailDialog({ control, open, onOpenChange }: ControlDetailDialogProps) {
  if (!control) return null;

  const isOnboard = control._type === 'onboard';
  const tarifsBordTotal = control.tarifsBord.reduce((s, t) => s + t.montant, 0);
  const tarifsControleTotal = control.tarifsControle.reduce((s, t) => s + t.montant, 0) + control.stt50Count * 50;
  const pvTotal = control.pvList.reduce((s, t) => s + t.montant, 0) + control.stt100Count * 100;

  const tarifsControleDetail = formatTarifDetailList(control.tarifsControle, control.stt50Count, 50);
  const pvDetail = formatTarifDetailList(control.pvList, control.stt100Count, 100);

  // Détail des tarifs à bord par type
  const tarifsBordByType = control.tarifsBord.reduce((acc, t) => {
    const key = t.tarifType === 'exceptionnel' ? 'Exceptionnel' : 'Bord';
    if (!acc[key]) acc[key] = { count: 0, total: 0 };
    acc[key].count++;
    acc[key].total += t.montant;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              isOnboard ? 'bg-primary/20 text-primary' : 'bg-success/20 text-success'
            )}>
              {isOnboard ? <Train className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-lg font-bold">
                {isOnboard ? control.trainNumber : control.stationName}
              </div>
              <div className="text-sm font-normal text-muted-foreground">
                {control.origin} → {control.destination}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Infos générales */}
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{new Date(control.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{control.time}</span>
            </div>
            {!isOnboard && control.platform && (
              <div className="flex items-center gap-2 text-sm col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>Quai {control.platform}</span>
              </div>
            )}
          </div>

          {/* Stats principales */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-secondary/50 p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold">{control.passengers}</div>
              <div className="text-xs text-muted-foreground">Passagers</div>
            </div>
            <div className="rounded-lg bg-destructive/10 p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-destructive mb-1">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold text-destructive">{control.fraudCount}</div>
              <div className="text-xs text-muted-foreground">Fraudes</div>
            </div>
            <div className={cn(
              'rounded-lg p-3 text-center',
              control.fraudRate > 10 ? 'bg-destructive/20' : control.fraudRate > 5 ? 'bg-warning/20' : 'bg-success/20'
            )}>
              <div className="text-2xl font-bold">{control.fraudRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Taux</div>
            </div>
          </div>

          {/* Détail des tarifs à bord */}
          {control.tarifsBord.length > 0 && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <Ticket className="h-4 w-4 text-accent" />
                Tarifs à bord / exceptionnel
              </h4>
              <div className="rounded-lg border p-3 space-y-2">
                {Object.entries(tarifsBordByType).map(([type, data]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={type === 'Exceptionnel' ? 'outline' : 'secondary'} className="text-xs">
                        {type}
                      </Badge>
                      <span className="text-muted-foreground">×{data.count}</span>
                    </div>
                    <span className="font-medium">{data.total.toFixed(2)}€</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{tarifsBordTotal.toFixed(2)}€</span>
                </div>
              </div>
            </div>
          )}

          {/* Détail des tarifs contrôle */}
          {(tarifsControleDetail.length > 0 || control.stt50Count > 0 || control.tarifsControle.length > 0) && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-primary" />
                Tarifs contrôle
              </h4>
              <div className="rounded-lg border p-3 space-y-2">
                {tarifsControleDetail.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{item.label}</Badge>
                      <span className="text-muted-foreground">×{item.count}</span>
                    </div>
                    <span className="font-medium">{item.total.toFixed(2)}€</span>
                  </div>
                ))}
                {tarifsControleDetail.length > 0 && (
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{tarifsControleTotal.toFixed(2)}€</span>
                  </div>
                )}
                {tarifsControleDetail.length === 0 && (
                  <div className="text-sm text-muted-foreground">Aucun tarif contrôle</div>
                )}
              </div>
            </div>
          )}

          {/* Détail des PV */}
          {(pvDetail.length > 0 || control.stt100Count > 0 || control.pvList.length > 0) && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Procès-verbaux
              </h4>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                {pvDetail.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">{item.label}</Badge>
                      <span className="text-muted-foreground">×{item.count}</span>
                    </div>
                    <span className="font-medium">{item.total.toFixed(2)}€</span>
                  </div>
                ))}
                {pvDetail.length > 0 && (
                  <div className="border-t border-destructive/30 pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-destructive">{pvTotal.toFixed(2)}€</span>
                  </div>
                )}
                {pvDetail.length === 0 && (
                  <div className="text-sm text-muted-foreground">Aucun PV</div>
                )}
              </div>
            </div>
          )}

          {/* RI */}
          {(control.riPositif > 0 || control.riNegatif > 0) && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <User className="h-4 w-4 text-primary" />
                Relevés d'identité
              </h4>
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg border border-success/30 bg-success/10 p-3 text-center">
                  <div className="text-xl font-bold text-success">{control.riPositif}</div>
                  <div className="text-xs text-muted-foreground">RI positifs</div>
                </div>
                <div className="flex-1 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-center">
                  <div className="text-xl font-bold text-destructive">{control.riNegatif}</div>
                  <div className="text-xs text-muted-foreground">RI négatifs</div>
                </div>
              </div>
            </div>
          )}

          {/* Commentaire */}
          {control.commentaire && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Commentaire</h4>
              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                {control.commentaire}
              </div>
            </div>
          )}

          {/* Récapitulatif financier */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <h4 className="text-sm font-semibold mb-2">Récapitulatif financier</h4>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <div className="font-semibold text-primary">{tarifsBordTotal.toFixed(2)}€</div>
                <div className="text-xs text-muted-foreground">Bord</div>
              </div>
              <div>
                <div className="font-semibold">{tarifsControleTotal.toFixed(2)}€</div>
                <div className="text-xs text-muted-foreground">Contrôle</div>
              </div>
              <div>
                <div className="font-semibold text-destructive">{pvTotal.toFixed(2)}€</div>
                <div className="text-xs text-muted-foreground">PV</div>
              </div>
            </div>
            <div className="border-t mt-2 pt-2 text-center">
              <span className="text-lg font-bold">{(tarifsBordTotal + tarifsControleTotal + pvTotal).toFixed(2)}€</span>
              <span className="text-sm text-muted-foreground ml-2">Total</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
