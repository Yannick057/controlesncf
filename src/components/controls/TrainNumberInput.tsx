import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useTrainPrediction, TrainSuggestion } from '@/hooks/useTrainPrediction';
import { cn } from '@/lib/utils';
import { Train, Clock, History } from 'lucide-react';

interface TrainNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  onTrainSelected?: (train: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

export function TrainNumberInput({
  value,
  onChange,
  onTrainSelected,
  placeholder = 'TGV 8541',
  id,
  className,
}: TrainNumberInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const { getSuggestions, addRecentTrain } = useTrainPrediction();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const suggestions = getSuggestions(value);

  const handleSelect = (suggestion: TrainSuggestion) => {
    onChange(suggestion.value);
    addRecentTrain(suggestion.value);
    onTrainSelected?.(suggestion.value);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
          handleSelect(suggestions[focusedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'recent':
        return <History className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'scheduled':
        return <Clock className="h-3.5 w-3.5 text-primary" />;
      default:
        return <Train className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setFocusedIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      
      {isOpen && suggestions.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.value + index}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                focusedIndex === index
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-secondary'
              )}
            >
              {getIcon(suggestion.type)}
              <span className="flex-1">{suggestion.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
