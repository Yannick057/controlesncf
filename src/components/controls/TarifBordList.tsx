import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TarifBordItem } from '@/hooks/useControls';
import { cn } from '@/lib/utils';

interface TarifBordListProps {
  items: TarifBordItem[];
  onRemove: (id: number) => void;
  total: number;
}

export function TarifBordList({ items, onRemove, total }: TarifBordListProps) {
  if (items.length === 0 && total === 0) {
    return null;
  }

  const bordItems = items.filter(i => i.tarifType === 'bord' || !i.tarifType);
  const exceptionnelItems = items.filter(i => i.tarifType === 'exceptionnel');
  const bordTotal = bordItems.reduce((sum, t) => sum + t.montant, 0);
  const exceptionnelTotal = exceptionnelItems.reduce((sum, t) => sum + t.montant, 0);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Tarifs à bord / exceptionnel (hors fraude)</h4>
      
      {bordItems.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Bord ({bordItems.length})</span>
          {bordItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-1.5 text-sm',
                'bg-accent/10 text-accent-foreground'
              )}
            >
              <span>
                {item.description || 'Tarif à bord'}: {item.montant.toFixed(2)}€
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-accent/20"
                onClick={() => onRemove(item.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {exceptionnelItems.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Exceptionnel ({exceptionnelItems.length})</span>
          {exceptionnelItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-1.5 text-sm',
                'bg-warning/10 text-warning-foreground'
              )}
            >
              <span>
                {item.description || 'Tarif exceptionnel'}: {item.montant.toFixed(2)}€
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-warning/20"
                onClick={() => onRemove(item.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        {bordItems.length > 0 && (
          <div className={cn(
            'flex justify-between rounded-lg px-3 py-1.5 text-sm',
            'bg-accent/15 text-accent-foreground'
          )}>
            <span>Bord ({bordItems.length}x)</span>
            <span>{bordTotal.toFixed(2)}€</span>
          </div>
        )}
        {exceptionnelItems.length > 0 && (
          <div className={cn(
            'flex justify-between rounded-lg px-3 py-1.5 text-sm',
            'bg-warning/15 text-warning-foreground'
          )}>
            <span>Exceptionnel ({exceptionnelItems.length}x)</span>
            <span>{exceptionnelTotal.toFixed(2)}€</span>
          </div>
        )}
        <div className={cn(
          'flex justify-between rounded-lg px-3 py-2 font-medium',
          'bg-accent/20 text-accent-foreground'
        )}>
          <span>Total tarifs</span>
          <span>{total.toFixed(2)}€</span>
        </div>
      </div>
    </div>
  );
}
