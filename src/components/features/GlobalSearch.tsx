import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Train, Building2, User, FileText, X, History, Loader2 } from 'lucide-react';
import { useSupabaseOnboardControls, useSupabaseStationControls } from '@/hooks/useSupabaseControls';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'onboard' | 'station' | 'user' | 'release';
  title: string;
  subtitle: string;
  date?: string;
  path?: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { controls: onboardControls } = useSupabaseOnboardControls();
  const { controls: stationControls } = useSupabaseStationControls();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('global_search_recent');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('global_search_recent', JSON.stringify(updated));
  };

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchResults: SearchResult[] = [];
    const lowerQuery = searchQuery.toLowerCase();

    // Search onboard controls
    onboardControls.forEach(control => {
      if (
        control.trainNumber.toLowerCase().includes(lowerQuery) ||
        control.origin.toLowerCase().includes(lowerQuery) ||
        control.destination.toLowerCase().includes(lowerQuery) ||
        control.commentaire?.toLowerCase().includes(lowerQuery)
      ) {
        searchResults.push({
          id: control.id,
          type: 'onboard',
          title: `Train ${control.trainNumber}`,
          subtitle: `${control.origin} → ${control.destination} • ${control.passengers} passagers`,
          date: control.date,
          path: '/history',
          icon: Train,
        });
      }
    });

    // Search station controls
    stationControls.forEach(control => {
      if (
        control.stationName.toLowerCase().includes(lowerQuery) ||
        control.origin.toLowerCase().includes(lowerQuery) ||
        control.destination.toLowerCase().includes(lowerQuery) ||
        control.commentaire?.toLowerCase().includes(lowerQuery)
      ) {
        searchResults.push({
          id: control.id,
          type: 'station',
          title: `Gare ${control.stationName}`,
          subtitle: `${control.origin} → ${control.destination} • ${control.passengers} passagers`,
          date: control.date,
          path: '/history',
          icon: Building2,
        });
      }
    });

    // Search users (manager/admin only)
    if (user?.role === 'manager' || user?.role === 'admin') {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
          .limit(5);

        profiles?.forEach(profile => {
          searchResults.push({
            id: profile.id,
            type: 'user',
            title: profile.full_name || profile.email?.split('@')[0] || 'Utilisateur',
            subtitle: profile.email || '',
            path: user?.role === 'admin' ? '/admin' : '/manager',
            icon: User,
          });
        });
      } catch (error) {
        console.error('Error searching users:', error);
      }
    }

    // Search release notes
    try {
      const { data: releases } = await supabase
        .from('release_notes')
        .select('id, version, title, content, release_date')
        .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%,version.ilike.%${searchQuery}%`)
        .limit(3);

      releases?.forEach(release => {
        searchResults.push({
          id: release.id,
          type: 'release',
          title: `v${release.version} - ${release.title}`,
          subtitle: release.content.substring(0, 100) + '...',
          date: release.release_date,
          path: '/changelog',
          icon: FileText,
        });
      });
    } catch (error) {
      console.error('Error searching releases:', error);
    }

    setResults(searchResults.slice(0, 15));
    setLoading(false);
  }, [onboardControls, stationControls, user?.role]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, performSearch]);

  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(query);
    onOpenChange(false);
    setQuery('');
    if (result.path) {
      navigate(result.path);
    }
  };

  const handleRecentSearch = (term: string) => {
    setQuery(term);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('global_search_recent');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Recherche globale
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher contrôles, utilisateurs, versions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="px-4 pb-4">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {!loading && !query && recentSearches.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Recherches récentes
                  </p>
                  <Button variant="ghost" size="sm" onClick={clearRecentSearches}>
                    Effacer
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80"
                      onClick={() => handleRecentSearch(term)}
                    >
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {!loading && query && results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun résultat pour "{query}"</p>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-1">
                {results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className={cn(
                      'w-full flex items-start gap-3 rounded-lg p-3 text-left transition-colors',
                      'hover:bg-secondary/50 focus:bg-secondary/50 focus:outline-none'
                    )}
                  >
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                      result.type === 'onboard' && 'bg-primary/10 text-primary',
                      result.type === 'station' && 'bg-accent/10 text-accent-foreground',
                      result.type === 'user' && 'bg-secondary text-secondary-foreground',
                      result.type === 'release' && 'bg-muted text-muted-foreground'
                    )}>
                      <result.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{result.title}</p>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {result.type === 'onboard' ? 'À bord' : 
                           result.type === 'station' ? 'En gare' : 
                           result.type === 'user' ? 'Utilisateur' : 'Version'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                      {result.date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(result.date).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-3 text-xs text-muted-foreground flex items-center justify-between">
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↵</kbd> pour sélectionner
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Échap</kbd> pour fermer
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
