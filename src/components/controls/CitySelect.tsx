import { cn } from '@/lib/utils';

const CITIES = [
  'Metz',
  'Nancy',
  'Thionville',
  'Hagondange',
  'Bettembourg',
  'Epinal',
  'Luxembourg',
  'St Dié',
  'Strasbourg',
  'Pont Mousson',
  'Luneville',
  'Conflans Jarny',
  'Verdun',
  'Bar-le-Duc',
  'Longwy',
];

interface CitySelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CitySelect({ id, value, onChange, placeholder, className }: CitySelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-base transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className
      )}
    >
      <option value="">{placeholder || 'Sélectionner...'}</option>
      {CITIES.map((city) => (
        <option key={city} value={city}>
          {city}
        </option>
      ))}
    </select>
  );
}

export { CITIES };
