import { useState, useMemo } from 'react';
import { Train, Building2, Calendar, Filter, Download, FileCode, Search, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useOnboardControls, useStationControls, OnboardControl, StationControl, TarifItem } from '@/hooks/useControls';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type SortBy = 'date' | 'train' | 'station' | 'fraudRate';
type SortOrder = 'asc' | 'desc';

// Helper to format tarif detail
function formatTarifDetail(items: TarifItem[], sttCount: number, sttAmount: number): string {
  const sttTotal = sttCount * sttAmount;
  const parts: string[] = [];
  
  if (sttCount > 0) {
    parts.push(`STT ${sttAmount}: ${sttCount}x = ${sttTotal.toFixed(2)}€`);
  }
  
  // Group RNV and others with detail
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
      // STT with individual amounts
      parts.push(`${type}: ${data.count}x (${data.amounts.map(a => `${a.toFixed(2)}€`).join(', ')})`);
    } else {
      // RNV, etc. with full detail
      parts.push(`${type}: ${data.amounts.map(a => `${a.toFixed(2)}€`).join(' + ')} = ${data.amounts.reduce((s, a) => s + a, 0).toFixed(2)}€`);
    }
  });
  
  return parts.join(' | ') || '-';
}

export default function ControlHistory() {
  const { controls: onboardControls, deleteControl: deleteOnboard } = useOnboardControls();
  const { controls: stationControls, deleteControl: deleteStation } = useStationControls();
  
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterType, setFilterType] = useState<'all' | 'onboard' | 'station'>('all');
  const [searchTrain, setSearchTrain] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Export selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportType, setExportType] = useState<'html' | 'pdf'>('html');
  
  // Expanded rows for detail
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Combine and sort controls
  const combinedControls = useMemo(() => {
    const combined: Array<(OnboardControl & { _type: 'onboard' }) | (StationControl & { _type: 'station' })> = [];
    
    if (filterType === 'all' || filterType === 'onboard') {
      onboardControls.forEach((c) => combined.push({ ...c, _type: 'onboard' as const }));
    }
    if (filterType === 'all' || filterType === 'station') {
      stationControls.forEach((c) => combined.push({ ...c, _type: 'station' as const }));
    }
    
    // Apply search filter
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
    
    // Apply date filter
    if (dateFrom) {
      filtered = filtered.filter((c) => c.date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((c) => c.date <= dateTo);
    }
    
    // Sort
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

  // Group by date for day view
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

  // Group by train for train view
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

  const handleDelete = (type: 'onboard' | 'station', id: number) => {
    if (confirm('Supprimer ce contrôle ?')) {
      if (type === 'onboard') {
        deleteOnboard(id);
      } else {
        deleteStation(id);
      }
      toast.success('Contrôle supprimé');
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

  const handleExport = () => {
    const selectedControls = combinedControls.filter((c) => 
      selectedIds.has(`${c._type}-${c.id}`)
    );
    
    if (selectedControls.length === 0) {
      toast.error('Aucun contrôle sélectionné');
      return;
    }

    const html = generateExportHTML(selectedControls);
    
    if (exportType === 'html') {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historique des contrôles</h1>
          <p className="text-muted-foreground">
            {combinedControls.length} contrôle{combinedControls.length > 1 ? 's' : ''} • 
            {selectedIds.size > 0 && ` ${selectedIds.size} sélectionné${selectedIds.size > 1 ? 's' : ''}`}
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
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAllVisible}>
              Tout sélectionner
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Désélectionner
            </Button>
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
                      <div className="flex items-center gap-2">
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
                        {/* Tarifs à bord */}
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
                        
                        {/* Tarifs contrôle avec détail */}
                        <div>
                          <h4 className="text-sm font-medium mb-1">Tarifs contrôle (détail)</h4>
                          <div className="text-sm text-muted-foreground">
                            {formatTarifDetail(control.tarifsControle, control.stt50Count, 50)}
                          </div>
                        </div>
                        
                        {/* PV avec détail */}
                        <div>
                          <h4 className="text-sm font-medium mb-1">Procès-verbaux (détail)</h4>
                          <div className="text-sm text-muted-foreground">
                            {formatTarifDetail(control.pvList, control.stt100Count, 100)}
                          </div>
                        </div>
                        
                        {/* RI */}
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

      {combinedControls.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun contrôle trouvé
          </CardContent>
        </Card>
      )}

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
              <Select value={exportType} onValueChange={(v) => setExportType(v as 'html' | 'pdf')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="html">HTML (téléchargement)</SelectItem>
                  <SelectItem value="pdf">PDF (impression)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Generate detailed HTML export
function generateExportHTML(controls: Array<(OnboardControl & { _type: 'onboard' }) | (StationControl & { _type: 'station' })>): string {
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

  const rows = controls.map((c) => {
    const label = c._type === 'onboard' 
      ? `${c.trainNumber} (${c.origin} → ${c.destination})`
      : `${c.stationName} - Quai ${c.platform}`;
    
    const tarifsBordTotal = c.tarifsBord.reduce((s, t) => s + t.montant, 0);
    const tarifsBordDetail = c.tarifsBord.length > 0 
      ? c.tarifsBord.map(t => `${t.description ? t.description + ': ' : ''}${t.montant.toFixed(2)}€`).join(', ')
      : '-';
    
    return `
      <tr>
        <td>${c._type === 'onboard' ? '🚂' : '🚉'}</td>
        <td>${label}</td>
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

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Export Contrôles SNCF</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #333; font-size: 11px; }
    h1 { color: #0066cc; border-bottom: 3px solid #0066cc; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 6px; text-align: left; vertical-align: top; }
    th { background: #0066cc; color: white; font-weight: 600; }
    tr:nth-child(even) { background: #f8f9fa; }
    .right { text-align: right; }
    .summary { margin: 20px 0; padding: 15px; background: #f0f7ff; border-radius: 8px; }
    .stats { display: flex; gap: 20px; flex-wrap: wrap; }
    .stat { text-align: center; padding: 10px; }
    .stat-value { font-size: 20px; font-weight: bold; color: #0066cc; }
    .stat-label { font-size: 11px; color: #666; }
    @media print { body { margin: 0; font-size: 9px; } th, td { padding: 4px; } }
  </style>
</head>
<body>
  <h1>📋 Export Contrôles SNCF</h1>
  <p>Exporté le ${new Date().toLocaleString('fr-FR')} • ${controls.length} contrôle(s)</p>
  
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

  <table>
    <thead>
      <tr>
        <th>Type</th>
        <th>Train/Gare</th>
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
</body>
</html>`;
}
