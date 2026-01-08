import { useState, useMemo } from 'react';
import { Train, Building2, Calendar, Filter, Download, Search, Edit, Trash2, ChevronDown, ChevronUp, Mail, X, Plus, Eye, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useSupabaseOnboardControls, useSupabaseStationControls, OnboardControl, StationControl, TarifItem, TarifBordItem, TarifBordType } from '@/hooks/useSupabaseControls';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { TarifList } from '@/components/controls/TarifList';
import { TarifBordList } from '@/components/controls/TarifBordList';
import { Counter } from '@/components/controls/Counter';
import { TypeToggle, TarifType } from '@/components/controls/TypeToggle';
import { ControlDetailDialog } from '@/components/controls/ControlDetailDialog';

type SortBy = 'date' | 'train' | 'fraudRate';
type SortOrder = 'asc' | 'desc';

function formatTarifDetail(items: TarifItem[], sttCount: number, sttAmount: number): string {
  const parts: string[] = [];
  
  if (sttCount > 0) {
    parts.push(`STT ${sttAmount}: ${sttCount}x = ${(sttCount * sttAmount).toFixed(2)}€`);
  }
  
  const grouped: Record<string, { count: number; amounts: number[] }> = {};
  items.forEach((item) => {
    if (!grouped[item.type]) {
      grouped[item.type] = { count: 0, amounts: [] };
    }
    grouped[item.type].count++;
    grouped[item.type].amounts.push(item.montant);
  });
  
  Object.entries(grouped).forEach(([type, data]) => {
    if (type === 'STT') {
      parts.push(`${type}: ${data.count}x (${data.amounts.map(a => `${a.toFixed(2)}€`).join(', ')})`);
    } else {
      parts.push(`${type}: ${data.amounts.map(a => `${a.toFixed(2)}€`).join(' + ')} = ${data.amounts.reduce((s, a) => s + a, 0).toFixed(2)}€`);
    }
  });
  
  return parts.join(' | ') || '-';
}

export default function ControlHistory() {
  const { controls: onboardControls, loading: loadingOnboard, deleteControl: deleteOnboard, updateControl: updateOnboard } = useSupabaseOnboardControls();
  const { controls: stationControls, loading: loadingStation, deleteControl: deleteStation, updateControl: updateStation } = useSupabaseStationControls();
  
  // Selected control for detail popup
  const [selectedControl, setSelectedControl] = useState<(OnboardControl & { _type: 'onboard' }) | (StationControl & { _type: 'station' }) | null>(null);
  
  const loading = loadingOnboard || loadingStation;
  
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterType, setFilterType] = useState<'all' | 'onboard' | 'station'>('all');
  const [searchTrain, setSearchTrain] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportType, setExportType] = useState<'html' | 'pdf' | 'email'>('html');
  const [emailAddress, setEmailAddress] = useState('');
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Edit state
  const [editingControl, setEditingControl] = useState<(OnboardControl & { _type: 'onboard' }) | (StationControl & { _type: 'station' }) | null>(null);
  const [editForm, setEditForm] = useState<{
    passengers: number;
    tarifsBord: TarifBordItem[];
    tarifsControle: TarifItem[];
    stt50Count: number;
    pvList: TarifItem[];
    stt100Count: number;
    riPositif: number;
    riNegatif: number;
    commentaire: string;
  } | null>(null);
  
  // New tarif form state for edit dialog
  const [newTarifBordMontant, setNewTarifBordMontant] = useState('');
  const [newTarifBordDesc, setNewTarifBordDesc] = useState('');
  const [newTarifBordType, setNewTarifBordType] = useState<TarifBordType>('bord');
  const [newTarifControleType, setNewTarifControleType] = useState<TarifType>('STT');
  const [newTarifControleMontant, setNewTarifControleMontant] = useState('');
  const [newPvType, setNewPvType] = useState<TarifType>('STT');
  const [newPvMontant, setNewPvMontant] = useState('');

  const combinedControls = useMemo(() => {
    const combined: Array<(OnboardControl & { _type: 'onboard' }) | (StationControl & { _type: 'station' })> = [];
    
    if (filterType === 'all' || filterType === 'onboard') {
      onboardControls.forEach((c) => combined.push({ ...c, _type: 'onboard' as const }));
    }
    if (filterType === 'all' || filterType === 'station') {
      stationControls.forEach((c) => combined.push({ ...c, _type: 'station' as const }));
    }
    
    let filtered = combined;
    if (searchTrain) {
      const search = searchTrain.toLowerCase();
      filtered = combined.filter((c) => {
        if (c._type === 'onboard') {
          return c.trainNumber.toLowerCase().includes(search);
        }
        return c.stationName.toLowerCase().includes(search);
      });
    }
    
    if (dateFrom) {
      filtered = filtered.filter((c) => c.date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((c) => c.date <= dateTo);
    }
    
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'train':
          const aLabel = a._type === 'onboard' ? a.trainNumber : a.stationName;
          const bLabel = b._type === 'onboard' ? b.trainNumber : b.stationName;
          comparison = aLabel.localeCompare(bLabel);
          break;
        case 'fraudRate':
          comparison = a.fraudRate - b.fraudRate;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [onboardControls, stationControls, filterType, searchTrain, dateFrom, dateTo, sortBy, sortOrder]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof combinedControls> = {};
    combinedControls.forEach((c) => {
      if (!groups[c.date]) {
        groups[c.date] = [];
      }
      groups[c.date].push(c);
    });
    return groups;
  }, [combinedControls]);

  const groupedByTrain = useMemo(() => {
    const groups: Record<string, typeof combinedControls> = {};
    combinedControls.forEach((c) => {
      const key = c._type === 'onboard' ? c.trainNumber : c.stationName;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(c);
    });
    return groups;
  }, [combinedControls]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAllVisible = () => {
    const newSet = new Set<string>();
    combinedControls.forEach((c) => newSet.add(`${c._type}-${c.id}`));
    setSelectedIds(newSet);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const selectByDate = (date: string) => {
    const newSet = new Set(selectedIds);
    combinedControls.filter((c) => c.date === date).forEach((c) => {
      newSet.add(`${c._type}-${c.id}`);
    });
    setSelectedIds(newSet);
  };

  const selectByTrain = (trainKey: string) => {
    const newSet = new Set(selectedIds);
    combinedControls.filter((c) => {
      const key = c._type === 'onboard' ? c.trainNumber : c.stationName;
      return key === trainKey;
    }).forEach((c) => {
      newSet.add(`${c._type}-${c.id}`);
    });
    setSelectedIds(newSet);
  };

  const handleDelete = async (type: 'onboard' | 'station', id: string) => {
    if (confirm('Supprimer ce contrôle ?')) {
      if (type === 'onboard') {
        await deleteOnboard(id);
      } else {
        await deleteStation(id);
      }
    }
  };

  const toggleRowExpand = (key: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedRows(newSet);
  };

  const startEdit = (control: (OnboardControl & { _type: 'onboard' }) | (StationControl & { _type: 'station' })) => {
    setEditingControl(control);
    setEditForm({
      passengers: control.passengers,
      tarifsBord: [...control.tarifsBord],
      tarifsControle: [...control.tarifsControle],
      stt50Count: control.stt50Count,
      pvList: [...control.pvList],
      stt100Count: control.stt100Count,
      riPositif: control.riPositif,
      riNegatif: control.riNegatif,
      commentaire: control.commentaire,
    });
  };

  const saveEdit = async () => {
    if (!editingControl || !editForm) return;
    
    // Calculate new fraud count and rate
    const newFraudCount = editForm.tarifsControle.length + editForm.pvList.length + editForm.stt50Count + editForm.stt100Count;
    
    const updates = {
      passengers: editForm.passengers,
      tarifsBord: editForm.tarifsBord,
      tarifsControle: editForm.tarifsControle,
      stt50Count: editForm.stt50Count,
      pvList: editForm.pvList,
      stt100Count: editForm.stt100Count,
      riPositif: editForm.riPositif,
      riNegatif: editForm.riNegatif,
      commentaire: editForm.commentaire,
      fraudCount: newFraudCount,
    };
    
    if (editingControl._type === 'onboard') {
      await updateOnboard(editingControl.id, updates);
    } else {
      await updateStation(editingControl.id, updates);
    }
    
    setEditingControl(null);
    setEditForm(null);
  };

  const handleExport = () => {
    const selectedControls = combinedControls.filter((c) => 
      selectedIds.has(`${c._type}-${c.id}`)
    );
    
    if (selectedControls.length === 0) {
      toast.error('Aucun contrôle sélectionné');
      return;
    }

    const html = generateExportHTML(selectedControls, groupedByTrain);

    if (exportType === 'email') {
      if (!emailAddress) {
        toast.error('Veuillez entrer une adresse email');
        return;
      }
      // Create mailto link with HTML as body (simplified)
      const subject = encodeURIComponent(`Export Contrôles SNCF - ${new Date().toLocaleDateString('fr-FR')}`);
      const body = encodeURIComponent(`Veuillez trouver ci-joint l'export des ${selectedControls.length} contrôle(s) sélectionné(s).\n\nNote: Pour un export complet avec mise en forme, veuillez utiliser l'export HTML et joindre le fichier à votre email.`);
      window.open(`mailto:${emailAddress}?subject=${subject}&body=${body}`);
      toast.success('Client email ouvert');
    } else if (exportType === 'html') {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sncf-controles-export-${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export HTML téléchargé');
    } else {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 250);
      }
    }
    
    setShowExportDialog(false);
  };

  const uniqueDates = [...new Set(combinedControls.map((c) => c.date))].sort().reverse();
  const uniqueTrains = [...new Set(combinedControls.map((c) => c._type === 'onboard' ? c.trainNumber : c.stationName))].sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historique des contrôles</h1>
          <p className="text-muted-foreground">
            {combinedControls.length} contrôle{combinedControls.length > 1 ? 's' : ''}
            {selectedIds.size > 0 && ` • ${selectedIds.size} sélectionné${selectedIds.size > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
              <Download className="mr-1 h-4 w-4" />
              Exporter ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            Filtres & Tri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Recherche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Train ou gare..."
                  value={searchTrain}
                  onChange={(e) => setSearchTrain(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="onboard">À bord</SelectItem>
                  <SelectItem value="station">En gare</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date début</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date fin</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Trier par</Label>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="train">Train/Gare</SelectItem>
                    <SelectItem value="fraudRate">Taux fraude</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Quick selection buttons */}
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={selectAllVisible}>
                Tout sélectionner
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Désélectionner
              </Button>
            </div>
            
            {/* Select by date */}
            {uniqueDates.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sélectionner par jour:</Label>
                <div className="flex flex-wrap gap-1">
                  {uniqueDates.slice(0, 7).map((date) => (
                    <Button key={date} variant="ghost" size="sm" className="h-7 text-xs" onClick={() => selectByDate(date)}>
                      {new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Select by train */}
            {uniqueTrains.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sélectionner par train:</Label>
                <div className="flex flex-wrap gap-1">
                  {uniqueTrains.slice(0, 10).map((train) => (
                    <Button key={train} variant="ghost" size="sm" className="h-7 text-xs" onClick={() => selectByTrain(train)}>
                      {train}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results grouped by date */}
      {Object.entries(groupedByDate).map(([date, controls]) => (
        <Card key={date}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" />
              {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              <span className="text-sm font-normal text-muted-foreground">
                ({controls.length} contrôle{controls.length > 1 ? 's' : ''})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {controls.map((control) => {
                const key = `${control._type}-${control.id}`;
                const isSelected = selectedIds.has(key);
                const isExpanded = expandedRows.has(key);
                
                return (
                  <div key={key} className={cn(
                    'rounded-lg border transition-all',
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  )}>
                    <div className="flex items-center gap-3 p-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(key)}
                      />
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg',
                        control._type === 'onboard' ? 'bg-primary/20 text-primary' : 'bg-success/20 text-success'
                      )}>
                        {control._type === 'onboard' ? <Train className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {control._type === 'onboard' 
                            ? `${control.trainNumber} - ${control.origin} → ${control.destination}`
                            : `${control.stationName} - Quai ${control.platform}`
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {control.time} • {control.passengers} passagers • {control.fraudCount} fraudes ({control.fraudRate.toFixed(1)}%)
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedControl(control)}
                          title="Voir le détail"
                        >
                          <Eye className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleRowExpand(key)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(control._type, control.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="border-t bg-secondary/30 p-4 space-y-3">
                        {control.tarifsBord.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-1">Tarifs à bord</h4>
                            <div className="text-sm text-muted-foreground">
                              {control.tarifsBord.map((t) => (
                                <span key={t.id} className="inline-block mr-2">
                                  {t.description ? `${t.description}: ` : ''}{t.montant.toFixed(2)}€
                                </span>
                              ))}
                              <span className="font-medium text-foreground ml-2">
                                Total: {control.tarifsBord.reduce((s, t) => s + t.montant, 0).toFixed(2)}€
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div>
                          <h4 className="text-sm font-medium mb-1">Tarifs contrôle (détail)</h4>
                          <div className="text-sm text-muted-foreground">
                            {formatTarifDetail(control.tarifsControle, control.stt50Count, 50)}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-1">Procès-verbaux (détail)</h4>
                          <div className="text-sm text-muted-foreground">
                            {formatTarifDetail(control.pvList, control.stt100Count, 100)}
                          </div>
                        </div>
                        
                        <div className="flex gap-4">
                          <div>
                            <span className="text-sm text-muted-foreground">RI positifs: </span>
                            <span className="font-medium text-success">{control.riPositif}</span>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">RI négatifs: </span>
                            <span className="font-medium text-destructive">{control.riNegatif}</span>
                          </div>
                        </div>
                        
                        {control.commentaire && (
                          <div>
                            <h4 className="text-sm font-medium mb-1">Commentaire</h4>
                            <p className="text-sm text-muted-foreground">{control.commentaire}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {combinedControls.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun contrôle trouvé
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Chargement...
          </CardContent>
        </Card>
      )}

      {/* Detail Popup */}
      <ControlDetailDialog
        control={selectedControl}
        open={!!selectedControl}
        onOpenChange={(open) => !open && setSelectedControl(null)}
      />

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exporter les contrôles</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} contrôle{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
            </p>
            <div className="space-y-2">
              <Label>Format d'export</Label>
              <Select value={exportType} onValueChange={(v) => setExportType(v as 'html' | 'pdf' | 'email')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="html">HTML (téléchargement)</SelectItem>
                  <SelectItem value="pdf">PDF (impression)</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {exportType === 'email' && (
              <div className="space-y-2">
                <Label>Adresse email</Label>
                <Input
                  type="email"
                  placeholder="destinataire@email.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleExport}>
              {exportType === 'email' ? <Mail className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
              {exportType === 'email' ? 'Envoyer' : 'Exporter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingControl} onOpenChange={(open) => !open && setEditingControl(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Modifier le contrôle
              {editingControl && (
                <span className="text-muted-foreground font-normal">
                  - {editingControl._type === 'onboard' ? editingControl.trainNumber : editingControl.stationName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {editForm && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Nombre de passagers</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.passengers}
                  onChange={(e) => setEditForm({ ...editForm, passengers: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tarifs à bord / exceptionnel</Label>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setNewTarifBordType('bord')} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium', newTarifBordType === 'bord' ? 'bg-accent text-accent-foreground' : 'bg-secondary')}>Bord</button>
                  <button type="button" onClick={() => setNewTarifBordType('exceptionnel')} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium', newTarifBordType === 'exceptionnel' ? 'bg-warning text-warning-foreground' : 'bg-secondary')}>Exceptionnel</button>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Description" value={newTarifBordDesc} onChange={(e) => setNewTarifBordDesc(e.target.value)} className="flex-1" />
                  <Input type="number" placeholder="€" value={newTarifBordMontant} onChange={(e) => setNewTarifBordMontant(e.target.value)} className="w-20" />
                  <Button type="button" size="sm" onClick={() => {
                    const m = parseFloat(newTarifBordMontant);
                    if (m > 0) {
                      setEditForm({ ...editForm!, tarifsBord: [...editForm!.tarifsBord, { id: Date.now(), montant: m, description: newTarifBordDesc || undefined, tarifType: newTarifBordType }] });
                      setNewTarifBordMontant(''); setNewTarifBordDesc('');
                    }
                  }}><Plus className="h-4 w-4" /></Button>
                </div>
                <TarifBordList items={editForm.tarifsBord} onRemove={(id) => setEditForm({ ...editForm, tarifsBord: editForm.tarifsBord.filter((t) => t.id !== id) })} total={editForm.tarifsBord.reduce((sum, t) => sum + t.montant, 0)} />
              </div>

              <div className="space-y-2">
                <Label>Tarifs contrôle</Label>
                <Counter label="STT 50€" value={editForm.stt50Count} onChange={(v) => setEditForm({ ...editForm, stt50Count: v })} min={0} />
                <div className="flex gap-2 mt-2">
                  <TypeToggle value={newTarifControleType} onChange={setNewTarifControleType} />
                  <Input type="number" placeholder="€" value={newTarifControleMontant} onChange={(e) => setNewTarifControleMontant(e.target.value)} className="w-20" />
                  <Button type="button" size="sm" onClick={() => {
                    const m = parseFloat(newTarifControleMontant);
                    if (m > 0) {
                      setEditForm({ ...editForm!, tarifsControle: [...editForm!.tarifsControle, { id: Date.now(), type: newTarifControleType, montant: m }] });
                      setNewTarifControleMontant('');
                    }
                  }}><Plus className="h-4 w-4" /></Button>
                </div>
                <TarifList title="Tarifs contrôle" items={editForm.tarifsControle} onRemove={(id) => setEditForm({ ...editForm, tarifsControle: editForm.tarifsControle.filter((t) => t.id !== id) })} total={editForm.tarifsControle.reduce((sum, t) => sum + t.montant, 0) + editForm.stt50Count * 50} stt50Count={editForm.stt50Count} />
              </div>

              <div className="space-y-2">
                <Label>Procès-verbaux</Label>
                <Counter label="STT 100€" value={editForm.stt100Count} onChange={(v) => setEditForm({ ...editForm, stt100Count: v })} min={0} variant="destructive" />
                <div className="flex gap-2 mt-2">
                  <TypeToggle value={newPvType} onChange={setNewPvType} />
                  <Input type="number" placeholder="€" value={newPvMontant} onChange={(e) => setNewPvMontant(e.target.value)} className="w-20" />
                  <Button type="button" size="sm" variant="destructive" onClick={() => {
                    const m = parseFloat(newPvMontant);
                    if (m > 0) {
                      setEditForm({ ...editForm!, pvList: [...editForm!.pvList, { id: Date.now(), type: newPvType, montant: m }] });
                      setNewPvMontant('');
                    }
                  }}><Plus className="h-4 w-4" /></Button>
                </div>
                <TarifList title="Procès-verbaux" items={editForm.pvList} onRemove={(id) => setEditForm({ ...editForm, pvList: editForm.pvList.filter((t) => t.id !== id) })} total={editForm.pvList.reduce((sum, t) => sum + t.montant, 0) + editForm.stt100Count * 100} variant="destructive" stt100Count={editForm.stt100Count} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>RI Positifs</Label>
                  <Counter
                    label="RI Positifs"
                    value={editForm.riPositif}
                    onChange={(v) => setEditForm({ ...editForm, riPositif: v })}
                    min={0}
                    variant="success"
                  />
                </div>
                <div className="space-y-2">
                  <Label>RI Négatifs</Label>
                  <Counter
                    label="RI Négatifs"
                    value={editForm.riNegatif}
                    onChange={(v) => setEditForm({ ...editForm, riNegatif: v })}
                    min={0}
                    variant="destructive"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Commentaire</Label>
                <Textarea
                  value={editForm.commentaire}
                  onChange={(e) => setEditForm({ ...editForm, commentaire: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingControl(null)}>
              Annuler
            </Button>
            <Button onClick={saveEdit}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function generateExportHTML(
  controls: Array<(OnboardControl & { _type: 'onboard' }) | (StationControl & { _type: 'station' })>,
  groupedByTrain: Record<string, typeof controls>
): string {
  const formatTarifDetailHTML = (items: TarifItem[], sttCount: number, sttAmount: number): string => {
    const parts: string[] = [];
    
    if (sttCount > 0) {
      parts.push(`<div>STT ${sttAmount}: ${sttCount}x = ${(sttCount * sttAmount).toFixed(2)}€</div>`);
    }
    
    const grouped: Record<string, number[]> = {};
    items.forEach((item) => {
      if (!grouped[item.type]) grouped[item.type] = [];
      grouped[item.type].push(item.montant);
    });
    
    Object.entries(grouped).forEach(([type, amounts]) => {
      if (type === 'STT') {
        parts.push(`<div>${type}: ${amounts.length}x (${amounts.map(a => `${a.toFixed(2)}€`).join(', ')})</div>`);
      } else {
        parts.push(`<div><strong>${type}:</strong> ${amounts.map(a => `${a.toFixed(2)}€`).join(' + ')} = ${amounts.reduce((s, a) => s + a, 0).toFixed(2)}€</div>`);
      }
    });
    
    return parts.join('') || '-';
  };

  // Group selected controls by train for detailed report
  const trainGroups: Record<string, typeof controls> = {};
  controls.forEach((c) => {
    const key = c._type === 'onboard' ? c.trainNumber : c.stationName;
    if (!trainGroups[key]) trainGroups[key] = [];
    trainGroups[key].push(c);
  });

  const trainSections = Object.entries(trainGroups).map(([trainKey, trainControls]) => {
    const rows = trainControls.map((c) => {
      const tarifsBordTotal = c.tarifsBord.reduce((s, t) => s + t.montant, 0);
      const tarifsBordDetail = c.tarifsBord.length > 0 
        ? c.tarifsBord.map(t => `${t.description ? t.description + ': ' : ''}${t.montant.toFixed(2)}€`).join(', ')
        : '-';
      
      return `
        <tr>
          <td>${new Date(c.date).toLocaleDateString('fr-FR')} ${c.time}</td>
          <td class="right">${c.passengers}</td>
          <td class="right">${c.fraudCount}</td>
          <td class="right">${c.fraudRate.toFixed(1)}%</td>
          <td>${tarifsBordDetail}<br><strong>Total: ${tarifsBordTotal.toFixed(2)}€</strong></td>
          <td>${formatTarifDetailHTML(c.tarifsControle, c.stt50Count, 50)}</td>
          <td>${formatTarifDetailHTML(c.pvList, c.stt100Count, 100)}</td>
          <td class="right">${c.riPositif}</td>
          <td class="right">${c.riNegatif}</td>
        </tr>
      `;
    }).join('');

    const trainPassengers = trainControls.reduce((s, c) => s + c.passengers, 0);
    const trainFrauds = trainControls.reduce((s, c) => s + c.fraudCount, 0);
    const trainTarifsBord = trainControls.reduce((s, c) => s + c.tarifsBord.reduce((ss, t) => ss + t.montant, 0), 0);
    const trainTarifsControle = trainControls.reduce((s, c) => s + c.tarifsControle.reduce((ss, t) => ss + t.montant, 0) + c.stt50Count * 50, 0);
    const trainPV = trainControls.reduce((s, c) => s + c.pvList.reduce((ss, t) => ss + t.montant, 0) + c.stt100Count * 100, 0);

    return `
      <div class="train-section">
        <h2>${trainControls[0]._type === 'onboard' ? '🚂' : '🚉'} ${trainKey}</h2>
        <div class="train-summary">
          <span><strong>${trainControls.length}</strong> contrôle(s)</span>
          <span><strong>${trainPassengers}</strong> passagers</span>
          <span><strong>${trainFrauds}</strong> fraudes (${trainPassengers > 0 ? ((trainFrauds / trainPassengers) * 100).toFixed(1) : 0}%)</span>
          <span>Tarifs bord: <strong>${trainTarifsBord.toFixed(2)}€</strong></span>
          <span>Tarifs contrôle: <strong>${trainTarifsControle.toFixed(2)}€</strong></span>
          <span>PV: <strong>${trainPV.toFixed(2)}€</strong></span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date/Heure</th>
              <th class="right">Pass.</th>
              <th class="right">Fraudes</th>
              <th class="right">Taux</th>
              <th>Tarifs à bord</th>
              <th>Tarifs contrôle (détail)</th>
              <th>PV (détail)</th>
              <th class="right">RI+</th>
              <th class="right">RI-</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Export Contrôles SNCF</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #333; font-size: 11px; }
    h1 { color: #0066cc; border-bottom: 3px solid #0066cc; padding-bottom: 10px; }
    h2 { color: #0066cc; margin-top: 30px; padding: 10px; background: #f0f7ff; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 6px; text-align: left; vertical-align: top; }
    th { background: #0066cc; color: white; font-weight: 600; }
    tr:nth-child(even) { background: #f8f9fa; }
    .right { text-align: right; }
    .summary { margin: 20px 0; padding: 15px; background: #f0f7ff; border-radius: 8px; }
    .stats { display: flex; gap: 20px; flex-wrap: wrap; }
    .stat { text-align: center; padding: 10px; }
    .stat-value { font-size: 20px; font-weight: bold; color: #0066cc; }
    .stat-label { font-size: 11px; color: #666; }
    .train-section { margin-bottom: 30px; page-break-inside: avoid; }
    .train-summary { display: flex; gap: 15px; flex-wrap: wrap; padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px; }
    @media print { body { margin: 0; font-size: 9px; } th, td { padding: 4px; } .train-section { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>📋 Export Contrôles SNCF - Détail par train</h1>
  <p>Exporté le ${new Date().toLocaleString('fr-FR')} • ${controls.length} contrôle(s) • ${Object.keys(trainGroups).length} train(s)/gare(s)</p>
  
  <div class="summary">
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${controls.length}</div>
        <div class="stat-label">Contrôles</div>
      </div>
      <div class="stat">
        <div class="stat-value">${controls.reduce((s, c) => s + c.passengers, 0)}</div>
        <div class="stat-label">Passagers</div>
      </div>
      <div class="stat">
        <div class="stat-value">${controls.reduce((s, c) => s + c.fraudCount, 0)}</div>
        <div class="stat-label">Fraudes</div>
      </div>
      <div class="stat">
        <div class="stat-value">${controls.reduce((s, c) => s + c.tarifsBord.reduce((ss, t) => ss + t.montant, 0), 0).toFixed(2)}€</div>
        <div class="stat-label">Tarifs à bord</div>
      </div>
      <div class="stat">
        <div class="stat-value">${controls.reduce((s, c) => s + c.tarifsControle.reduce((ss, t) => ss + t.montant, 0) + c.stt50Count * 50, 0).toFixed(2)}€</div>
        <div class="stat-label">Tarifs contrôle</div>
      </div>
      <div class="stat">
        <div class="stat-value">${controls.reduce((s, c) => s + c.pvList.reduce((ss, t) => ss + t.montant, 0) + c.stt100Count * 100, 0).toFixed(2)}€</div>
        <div class="stat-label">Total PV</div>
      </div>
    </div>
  </div>

  ${trainSections}
</body>
</html>`;
}
