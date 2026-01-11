import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVersionNotification } from '@/hooks/useVersionNotification';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Sparkles, 
  Wrench, 
  Bug, 
  Shield, 
  Trash2, 
  FileText,
  Calendar,
  Tag,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Rocket
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';

interface ReleaseNote {
  id: string;
  version: string;
  title: string;
  content: string;
  release_date: string;
  created_at: string;
}

// Parse version string to compare
function parseVersion(version: string): number[] {
  return version.split('.').map(n => parseInt(n, 10) || 0);
}

// Compare versions
function compareVersions(a: string, b: string): number {
  const vA = parseVersion(a);
  const vB = parseVersion(b);
  for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
    const diff = (vB[i] || 0) - (vA[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Get version type badge
function getVersionType(version: string): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  const [major, minor, patch] = parseVersion(version);
  if (patch === 0 && minor === 0) return { label: 'Majeure', variant: 'default' };
  if (patch === 0) return { label: 'Mineure', variant: 'secondary' };
  return { label: 'Patch', variant: 'outline' };
}

// Parse content sections
function parseContent(content: string) {
  const sections: { icon: React.ReactNode; title: string; items: string[]; color: string }[] = [];
  
  const lines = content.split('\n');
  let currentSection: { icon: React.ReactNode; title: string; items: string[]; color: string } | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.includes('**Ajouté**')) {
      currentSection = { icon: <Sparkles className="h-4 w-4" />, title: 'Ajouté', items: [], color: 'text-green-500' };
      sections.push(currentSection);
    } else if (trimmed.includes('**Modifié**')) {
      currentSection = { icon: <Wrench className="h-4 w-4" />, title: 'Modifié', items: [], color: 'text-blue-500' };
      sections.push(currentSection);
    } else if (trimmed.includes('**Corrigé**')) {
      currentSection = { icon: <Bug className="h-4 w-4" />, title: 'Corrigé', items: [], color: 'text-orange-500' };
      sections.push(currentSection);
    } else if (trimmed.includes('**Sécurité**')) {
      currentSection = { icon: <Shield className="h-4 w-4" />, title: 'Sécurité', items: [], color: 'text-red-500' };
      sections.push(currentSection);
    } else if (trimmed.includes('**Supprimé**')) {
      currentSection = { icon: <Trash2 className="h-4 w-4" />, title: 'Supprimé', items: [], color: 'text-gray-500' };
      sections.push(currentSection);
    } else if (trimmed.includes('**Documentation**')) {
      currentSection = { icon: <FileText className="h-4 w-4" />, title: 'Documentation', items: [], color: 'text-purple-500' };
      sections.push(currentSection);
    } else if (trimmed.startsWith('-') && currentSection) {
      currentSection.items.push(trimmed.substring(1).trim());
    }
  }
  
  return sections;
}

export default function Changelog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<string>('all');
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const { markChangelogViewed } = useVersionNotification();
  
  // Mark changelog as viewed when component mounts
  useEffect(() => {
    markChangelogViewed();
  }, [markChangelogViewed]);
  
  const { data: releaseNotes, isLoading } = useQuery({
    queryKey: ['release-notes-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('release_notes')
        .select('*')
        .order('release_date', { ascending: false });
      
      if (error) throw error;
      return (data as ReleaseNote[]).sort((a, b) => compareVersions(a.version, b.version));
    },
  });
  
  // Get unique major versions for filter
  const majorVersions = useMemo(() => {
    if (!releaseNotes) return [];
    const majors = new Set<string>();
    releaseNotes.forEach(note => {
      const [major] = parseVersion(note.version);
      majors.add(`${major}.x`);
    });
    return Array.from(majors).sort((a, b) => parseInt(b) - parseInt(a));
  }, [releaseNotes]);
  
  // Filtered notes
  const filteredNotes = useMemo(() => {
    if (!releaseNotes) return [];
    
    return releaseNotes.filter(note => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !note.version.toLowerCase().includes(query) &&
          !note.title.toLowerCase().includes(query) &&
          !note.content.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      
      // Version filter
      if (selectedVersion !== 'all') {
        const [major] = parseVersion(note.version);
        if (`${major}.x` !== selectedVersion) return false;
      }
      
      return true;
    });
  }, [releaseNotes, searchQuery, selectedVersion]);
  
  // Toggle version expansion
  const toggleVersion = (version: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  };
  
  // Expand all
  const expandAll = () => {
    if (filteredNotes) {
      setExpandedVersions(new Set(filteredNotes.map(n => n.version)));
    }
  };
  
  // Collapse all
  const collapseAll = () => {
    setExpandedVersions(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            Changelog
          </h1>
          <p className="text-muted-foreground">
            Historique des versions et nouveautés de l'application
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            <ChevronDown className="h-4 w-4 mr-1" />
            Tout déplier
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <ChevronUp className="h-4 w-4 mr-1" />
            Tout replier
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans les versions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={selectedVersion} onValueChange={setSelectedVersion}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrer par version" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les versions</SelectItem>
                {majorVersions.map(version => (
                  <SelectItem key={version} value={version}>
                    Version {version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border hidden sm:block" />
        
        <div className="space-y-4">
          {isLoading ? (
            // Skeleton loading
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="sm:ml-10">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))
          ) : filteredNotes.length === 0 ? (
            <Card className="sm:ml-10">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucune version ne correspond à votre recherche</p>
              </CardContent>
            </Card>
          ) : (
            filteredNotes.map((note, index) => {
              const versionType = getVersionType(note.version);
              const sections = parseContent(note.content);
              const isExpanded = expandedVersions.has(note.version);
              const isLatest = index === 0;
              
              return (
                <div key={note.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-6 hidden sm:flex items-center justify-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      isLatest 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted border-2 border-border'
                    }`}>
                      <Tag className="h-4 w-4" />
                    </div>
                  </div>
                  
                  <Card className={`sm:ml-10 transition-all duration-200 ${
                    isLatest ? 'border-primary/50 shadow-lg shadow-primary/10' : ''
                  }`}>
                    <Collapsible open={isExpanded} onOpenChange={() => toggleVersion(note.version)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge variant={versionType.variant} className="text-sm font-mono">
                                v{note.version}
                              </Badge>
                              {isLatest && (
                                <Badge className="bg-green-500 hover:bg-green-600">
                                  Dernière version
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {versionType.label}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(note.release_date), 'd MMMM yyyy', { locale: fr })}
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 ml-2" />
                              ) : (
                                <ChevronDown className="h-4 w-4 ml-2" />
                              )}
                            </div>
                          </div>
                          
                          <CardTitle className="text-lg mt-2">{note.title}</CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          {sections.length > 0 ? (
                            <div className="space-y-4">
                              {sections.map((section, sIdx) => (
                                <div key={sIdx} className="space-y-2">
                                  <div className={`flex items-center gap-2 font-medium ${section.color}`}>
                                    {section.icon}
                                    <span>{section.title}</span>
                                  </div>
                                  <ul className="ml-6 space-y-1">
                                    {section.items.map((item, iIdx) => (
                                      <li key={iIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                                        <span className="text-primary mt-1.5">•</span>
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground whitespace-pre-line">
                              {note.content}
                            </p>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Légende des changements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-green-500">
              <Sparkles className="h-4 w-4" />
              <span>Ajouté</span>
            </div>
            <div className="flex items-center gap-2 text-blue-500">
              <Wrench className="h-4 w-4" />
              <span>Modifié</span>
            </div>
            <div className="flex items-center gap-2 text-orange-500">
              <Bug className="h-4 w-4" />
              <span>Corrigé</span>
            </div>
            <div className="flex items-center gap-2 text-red-500">
              <Shield className="h-4 w-4" />
              <span>Sécurité</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Trash2 className="h-4 w-4" />
              <span>Supprimé</span>
            </div>
            <div className="flex items-center gap-2 text-purple-500">
              <FileText className="h-4 w-4" />
              <span>Documentation</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
