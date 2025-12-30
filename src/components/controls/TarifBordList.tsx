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

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Tarifs à bord (hors fraude)</h4>
      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item) => (
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
      <div className={cn(
        'flex justify-between rounded-lg px-3 py-2 font-medium',
        'bg-accent/20 text-accent-foreground'
      )}>
        <span>Total tarifs à bord</span>
        <span>{total.toFixed(2)}€</span>
      </div>
    </div>
  );
}
