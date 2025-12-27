import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CounterProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  showTotal?: { perUnit: number; label: string };
}

const variantStyles = {
  default: 'border-border',
  primary: 'border-primary/30',
  success: 'border-success/30',
  warning: 'border-warning/30',
  destructive: 'border-destructive/30',
};

const buttonVariantStyles = {
  default: 'bg-secondary hover:bg-secondary/80',
  primary: 'bg-primary/20 hover:bg-primary/30 text-primary',
  success: 'bg-success/20 hover:bg-success/30 text-success',
  warning: 'bg-warning/20 hover:bg-warning/30 text-warning',
  destructive: 'bg-destructive/20 hover:bg-destructive/30 text-destructive',
};

export function Counter({ label, value, onChange, min = 0, max = 999, variant = 'default', showTotal }: CounterProps) {
  const decrement = () => {
    if (value > min) onChange(value - 1);
  };

  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className={cn('flex items-center justify-between gap-3 rounded-lg border p-3', variantStyles[variant])}>
      <div className="flex-1">
        <span className="text-sm font-medium">{label}</span>
        {showTotal && value > 0 && (
          <p className="text-xs text-muted-foreground">
            {showTotal.label}: {(value * showTotal.perUnit).toLocaleString()}€
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn('h-8 w-8 rounded-full', buttonVariantStyles[variant])}
          onClick={decrement}
          disabled={value <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center text-lg font-bold">{value}</span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn('h-8 w-8 rounded-full', buttonVariantStyles[variant])}
          onClick={increment}
          disabled={value >= max}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
