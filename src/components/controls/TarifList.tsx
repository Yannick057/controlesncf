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
  stt50Count?: number;
  stt100Count?: number;
}

function formatDetailedItems(items: TarifItem[], stt50Count?: number, stt100Count?: number): string[] {
  const parts: string[] = [];
  
  if (stt50Count && stt50Count > 0) {
    parts.push(`${stt50Count}x STT 50 = ${(stt50Count * 50).toFixed(2)}€`);
  }
  if (stt100Count && stt100Count > 0) {
    parts.push(`${stt100Count}x STT 100 = ${(stt100Count * 100).toFixed(2)}€`);
  }
  
  // Group by type
  const grouped: Record<string, number[]> = {};
  items.forEach((item) => {
    if (!grouped[item.type]) grouped[item.type] = [];
    grouped[item.type].push(item.montant);
  });
  
  Object.entries(grouped).forEach(([type, amounts]) => {
    if (amounts.length === 1) {
      parts.push(`1x ${type} à ${amounts[0].toFixed(2)}€`);
    } else {
      const total = amounts.reduce((s, a) => s + a, 0);
      parts.push(`${amounts.length}x ${type} (${amounts.map(a => `${a.toFixed(2)}€`).join(', ')}) = ${total.toFixed(2)}€`);
    }
  });
  
  return parts;
}

export function TarifList({ title, items, onRemove, total, variant = 'primary', stt50Count, stt100Count }: TarifListProps) {
  const bgColor = variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10';
  const textColor = variant === 'destructive' ? 'text-destructive' : 'text-primary';
  
  const detailParts = formatDetailedItems(items, stt50Count, stt100Count);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      {items.length === 0 && !stt50Count && !stt100Count ? (
        <p className="text-xs text-muted-foreground/60 italic">Aucun élément</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">{item.type}</span>
                  <span className="font-medium">{item.montant.toFixed(2)}€</span>
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
          
          {/* Detailed summary */}
          {detailParts.length > 0 && (
            <div className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-2 space-y-0.5">
              {detailParts.map((part, i) => (
                <div key={i}>{part}</div>
              ))}
            </div>
          )}
        </>
      )}
      <div className={cn('flex items-center justify-between rounded-lg px-3 py-2', bgColor)}>
        <span className="text-sm font-medium">Total</span>
        <span className={cn('text-lg font-bold', textColor)}>{total.toLocaleString()}€</span>
      </div>
    </div>
  );
}
