import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TarifItem } from '@/hooks/useControls';
import { cn } from '@/lib/utils';

interface TarifListProps {
  title: string;
  items: TarifItem[];
  onRemove: (id: number) => void;
  total: number;
  variant?: 'primary' | 'destructive';
}

export function TarifList({ title, items, onRemove, total, variant = 'primary' }: TarifListProps) {
  const bgColor = variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10';
  const textColor = variant === 'destructive' ? 'text-destructive' : 'text-primary';

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 italic">Aucun élément</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">{item.type}</span>
                <span className="font-medium">{item.montant}€</span>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(item.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className={cn('flex items-center justify-between rounded-lg px-3 py-2', bgColor)}>
        <span className="text-sm font-medium">Total</span>
        <span className={cn('text-lg font-bold', textColor)}>{total.toLocaleString()}€</span>
      </div>
    </div>
  );
}
