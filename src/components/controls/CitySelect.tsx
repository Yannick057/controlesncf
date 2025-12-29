import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCities = CITIES.filter(city =>
    city.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleSelectCity = (city: string) => {
    setInputValue(city);
    onChange(city);
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || 'Saisir ou sélectionner...'}
          className={cn(
            'flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 pr-16 text-base transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            className
          )}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
          {filteredCities.length > 0 ? (
            filteredCities.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => handleSelectCity(city)}
                className={cn(
                  'flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary',
                  value === city && 'bg-primary/10 text-primary font-medium'
                )}
              >
                {city}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Ville personnalisée : "{inputValue}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { CITIES };
