import { cn } from '@/lib/utils';

export type TarifType = 'STT' | 'RNV' | 'Titre tiers' | 'D. naissance' | 'Autre';

interface TypeToggleProps {
  value: TarifType;
  onChange: (value: TarifType) => void;
}

const types: TarifType[] = ['STT', 'RNV', 'Titre tiers', 'D. naissance', 'Autre'];

export function TypeToggle({ value, onChange }: TypeToggleProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
            value === type
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          )}
        >
          {type}
        </button>
      ))}
    </div>
  );
}
