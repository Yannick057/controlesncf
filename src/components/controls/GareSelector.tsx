import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, MapPin, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// GARES DATA - Easy to replace with API call later
// Structure: { name, code?, region? } for future API compatibility
// =============================================================================

export interface Gare {
  name: string;
  code?: string; // UIC code for Navitia/SNCF API
  region?: string;
}

// 20 principales gares de la région Lorraine
const GARES_LORRAINE: Gare[] = [
  { name: 'Metz-Ville', code: '87192039', region: 'Moselle' },
  { name: 'Nancy-Ville', code: '87141002', region: 'Meurthe-et-Moselle' },
  { name: 'Thionville', code: '87192104', region: 'Moselle' },
  { name: 'Épinal', code: '87144006', region: 'Vosges' },
  { name: 'Hagondange', code: '87192153', region: 'Moselle' },
  { name: 'Forbach', code: '87193029', region: 'Moselle' },
  { name: 'Sarrebourg', code: '87193003', region: 'Moselle' },
  { name: 'Sarreguemines', code: '87193227', region: 'Moselle' },
  { name: 'Lunéville', code: '87141176', region: 'Meurthe-et-Moselle' },
  { name: 'Pont-à-Mousson', code: '87141184', region: 'Meurthe-et-Moselle' },
  { name: 'Bar-le-Duc', code: '87175000', region: 'Meuse' },
  { name: 'Verdun', code: '87175208', region: 'Meuse' },
  { name: 'Saint-Dié-des-Vosges', code: '87144139', region: 'Vosges' },
  { name: 'Remiremont', code: '87144147', region: 'Vosges' },
  { name: 'Conflans-Jarny', code: '87192427', region: 'Meurthe-et-Moselle' },
  { name: 'Longwy', code: '87192484', region: 'Meurthe-et-Moselle' },
  { name: 'Toul', code: '87141044', region: 'Meurthe-et-Moselle' },
  { name: 'Commercy', code: '87175109', region: 'Meuse' },
  { name: 'Frouard', code: '87141200', region: 'Meurthe-et-Moselle' },
  { name: 'Woippy', code: '87192054', region: 'Moselle' },
];

// =============================================================================
// FUTURE API INTEGRATION POINT
// Replace this function to fetch from Navitia/SNCF API
// =============================================================================

export async function fetchGares(_searchTerm: string): Promise<Gare[]> {
  // TODO: Replace with actual API call
  // Example Navitia API:
  // const response = await fetch(
  //   `https://api.navitia.io/v1/coverage/sncf/places?q=${searchTerm}&type[]=stop_area`,
  //   { headers: { Authorization: `Bearer ${API_KEY}` } }
  // );
  // const data = await response.json();
  // return data.places.map(p => ({ name: p.name, code: p.id }));
  
  return GARES_LORRAINE;
}

// =============================================================================
// COMPONENT
// =============================================================================

interface GareSelectorProps {
  id?: string;
  value: string;
  onChange: (value: string, gare?: Gare) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Custom gares list - overrides default GARES_LORRAINE */
  gares?: Gare[];
}

export function GareSelector({ 
  id, 
  value, 
  onChange, 
  placeholder = 'Rechercher une gare...', 
  className,
  disabled = false,
  gares = GARES_LORRAINE,
}: GareSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync input with external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter gares based on input
  const filteredGares = useMemo(() => {
    if (!inputValue.trim()) return gares;
    
    const searchTerms = inputValue.toLowerCase().split(/\s+/);
    return gares.filter(gare => {
      const gareName = gare.name.toLowerCase();
      const gareRegion = gare.region?.toLowerCase() || '';
      return searchTerms.every(term => 
        gareName.includes(term) || gareRegion.includes(term)
      );
    });
  }, [inputValue, gares]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredGares.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredGares.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredGares[highlightedIndex]) {
          handleSelectGare(filteredGares[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleSelectGare = (gare: Gare) => {
    setInputValue(gare.name);
    onChange(gare.name, gare);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            'flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-16 py-2 text-base transition-all duration-200',
            'placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20',
            'disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            className
          )}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {inputValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label="Effacer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label={isOpen ? 'Fermer' : 'Ouvrir'}
            disabled={disabled}
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div 
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
        >
          {filteredGares.length > 0 ? (
            filteredGares.map((gare, index) => (
              <button
                key={gare.code || gare.name}
                type="button"
                role="option"
                aria-selected={value === gare.name}
                onClick={() => handleSelectGare(gare)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                  'hover:bg-secondary focus:bg-secondary focus:outline-none',
                  value === gare.name && 'bg-primary/10 text-primary font-medium',
                  highlightedIndex === index && 'bg-secondary'
                )}
              >
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex flex-col items-start text-left">
                  <span className="font-medium">{gare.name}</span>
                  {gare.region && (
                    <span className="text-xs text-muted-foreground">{gare.region}</span>
                  )}
                </div>
              </button>
            ))
          ) : inputValue.trim() ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Gare personnalisée : "{inputValue}"</span>
            </div>
          ) : (
            <div className="px-3 py-3 text-sm text-muted-foreground text-center">
              Aucune gare trouvée
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { GARES_LORRAINE };
