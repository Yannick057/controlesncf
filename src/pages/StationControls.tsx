import { useState, useMemo } from 'react';
import { Plus, Building2, AlertTriangle, FileText, User, Download, Ticket, Loader2, Trash2, Eye } from 'lucide-react';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ControlsTable } from '@/components/controls/ControlsTable';
import { Counter } from '@/components/controls/Counter';
import { TypeToggle, TarifType } from '@/components/controls/TypeToggle';
import { TarifList } from '@/components/controls/TarifList';
import { TarifBordList } from '@/components/controls/TarifBordList';
import { GareSelector } from '@/components/controls/GareSelector';
import { CitySelect } from '@/components/controls/CitySelect';
import { ExportFilterDialog } from '@/components/controls/ExportFilterDialog';
import { StationControlDetailDialog } from '@/components/controls/StationControlDetailDialog';
import { ControlFilters, ControlFiltersState, applyControlFilters, defaultControlFilters } from '@/components/controls/ControlFilters';
import { useSupabaseStationControls, StationControl, TarifItem, TarifBordItem, TarifBordType } from '@/hooks/useSupabaseControls';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StationFormData {
  stationName: string;
  platform: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  passengers: string;
  tarifBordMontant: string;
  tarifBordDescription: string;
  tarifBordType: TarifBordType;
  tarifsBord: TarifBordItem[];
  tarifControleType: TarifType;
  tarifControleMontant: string;
  tarifsControle: TarifItem[];
  stt50Count: number;
  pvType: TarifType;
  pvMontant: string;
  pvList: TarifItem[];
  stt100Count: number;
  riPositif: number;
  riNegatif: number;
  commentaire: string;
}

export default function StationControls() {
  const { controls, loading, addControl, updateControl, deleteControl } = useSupabaseStationControls();
  const [filters, setFilters] = useState<ControlFiltersState>(defaultControlFilters);
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().slice(0, 5);

  const defaultFormValues: StationFormData = {
    stationName: '',
    platform: '',
    origin: '',
    destination: '',
    date: today,
    time: now,
    passengers: '',
    tarifBordMontant: '',
    tarifBordDescription: '',
    tarifBordType: 'bord',
    tarifsBord: [],
    tarifControleType: 'STT',
    tarifControleMontant: '',
    tarifsControle: [],
    stt50Count: 0,
    pvType: 'STT',
    pvMontant: '',
    pvList: [],
    stt100Count: 0,
    riPositif: 0,
    riNegatif: 0,
    commentaire: '',
  };

  const { values, updateField, updateFields, clearPersistedData, isDirty } = useFormPersistence<StationFormData>({
    key: 'station_control',
    defaultValues: defaultFormValues,
    formName: 'Contrôle en gare',
  });

  // Apply filters to controls
  const filteredControls = useMemo(() => {
    return applyControlFilters(controls, filters);
  }, [controls, filters]);

  // Handlers for detail dialog
  const handleUpdateControl = (updatedControl: StationControl) => {
    updateControl(updatedControl.id, updatedControl);
  };

  const handleDeleteControl = (id: string) => {
    deleteControl(id);
  };

  // Calculated values
  const totalTarifsBord = values.tarifsBord.reduce((sum, t) => sum + t.montant, 0);
  const totalTarifsControle = values.tarifsControle.reduce((sum, t) => sum + t.montant, 0) + (values.stt50Count * 50);
  const totalPV = values.pvList.reduce((sum, t) => sum + t.montant, 0) + (values.stt100Count * 100);
  const fraudCount = values.tarifsControle.length + values.pvList.length + values.stt50Count + values.stt100Count;
  const passengersNum = parseInt(values.passengers) || 0;
  const fraudRate = passengersNum > 0 ? (fraudCount / passengersNum) * 100 : 0;

  const addTarifBord = () => {
    const montant = parseFloat(values.tarifBordMontant);
    if (!montant || montant <= 0) {
      toast.error('Montant invalide');
      return;
    }
    updateFields({
      tarifsBord: [...values.tarifsBord, { 
        id: Date.now(), 
        montant, 
        description: values.tarifBordDescription || undefined,
        tarifType: values.tarifBordType
      }],
      tarifBordMontant: '',
      tarifBordDescription: '',
    });
  };

  const removeTarifBord = (id: number) => {
    updateField('tarifsBord', values.tarifsBord.filter((t) => t.id !== id));
  };

  const addTarifControle = () => {
    const montant = parseFloat(values.tarifControleMontant);
    if (!montant || montant <= 0) {
      toast.error('Montant invalide');
      return;
    }
    updateFields({
      tarifsControle: [...values.tarifsControle, { id: Date.now(), type: values.tarifControleType, montant }],
      tarifControleMontant: '',
    });
  };

  const removeTarifControle = (id: number) => {
    updateField('tarifsControle', values.tarifsControle.filter((t) => t.id !== id));
  };

  const addPv = () => {
    const montant = parseFloat(values.pvMontant);
    if (!montant || montant <= 0) {
      toast.error('Montant invalide');
      return;
    }
    updateFields({
      pvList: [...values.pvList, { id: Date.now(), type: values.pvType, montant }],
      pvMontant: '',
    });
  };

  const removePv = (id: number) => {
    updateField('pvList', values.pvList.filter((t) => t.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!values.stationName.trim() || !values.platform.trim() || !values.passengers) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    addControl({
      stationName: values.stationName,
      platform: values.platform,
      origin: values.origin,
      destination: values.destination,
      date: values.date,
      time: values.time,
      passengers: passengersNum,
      tarifsBord: values.tarifsBord,
      tarifsControle: values.tarifsControle,
      stt50Count: values.stt50Count,
      pvList: values.pvList,
      stt100Count: values.stt100Count,
      riPositif: values.riPositif,
      riNegatif: values.riNegatif,
      commentaire: values.commentaire,
      fraudCount,
    });

    toast.success('Contrôle enregistré !', {
      description: `${values.stationName} - ${passengersNum} passagers, ${fraudCount} fraudes`,
    });

    clearPersistedData();
  };

  const columns = [
    {
      key: 'stationName',
      label: 'Gare',
      render: (item: StationControl) => <span className="font-medium">{item.stationName}</span>,
    },
    {
      key: 'platform',
      label: 'Quai',
      render: (item: StationControl) => (
        <span className="rounded-md bg-secondary px-2 py-0.5 text-sm">{item.platform}</span>
      ),
    },
    {
      key: 'trajet',
      label: 'Trajet',
      render: (item: StationControl) => (
        <span className="text-muted-foreground">
          {item.origin && item.destination ? `${item.origin} → ${item.destination}` : '-'}
        </span>
      ),
    },
    {
      key: 'datetime',
      label: 'Date/Heure',
      render: (item: StationControl) => (
        <span className="text-muted-foreground">
          {new Date(item.date).toLocaleDateString('fr-FR')} {item.time}
        </span>
      ),
    },
    {
      key: 'passengers',
      label: 'Passagers',
      align: 'right' as const,
      render: (item: StationControl) => <span className="font-medium">{item.passengers}</span>,
    },
    {
      key: 'fraudCount',
      label: 'Fraudes',
      align: 'right' as const,
      render: (item: StationControl) => (
        <span className={cn(
          'rounded-full px-2 py-0.5 text-xs font-medium',
          item.fraudCount > 0 ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'
        )}>
          {item.fraudCount}
        </span>
      ),
    },
    {
      key: 'fraudRate',
      label: 'Taux',
      align: 'right' as const,
      render: (item: StationControl) => <span className="font-medium">{item.fraudRate.toFixed(1)}%</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center' as const,
      render: (item: StationControl) => (
        <div className="flex items-center justify-center gap-1">
          <StationControlDetailDialog
            control={item}
            onUpdate={handleUpdateControl}
            onDelete={handleDeleteControl}
            trigger={
              <Button variant="ghost" size="sm" title="Voir le détail">
                <Eye className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contrôles en gare</h1>
          <p className="text-muted-foreground">Enregistrez et consultez les contrôles effectués dans les gares</p>
        </div>
        <ExportFilterDialog 
          controls={controls} 
          type="station"
          trigger={
            <Button variant="outline" size="sm" disabled={controls.length === 0}>
              <Download className="mr-1 h-4 w-4" />
              Exporter ({controls.length})
            </Button>
          }
        />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Form */}
          <div className="space-y-4 lg:col-span-2">
            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  Informations du contrôle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="stationName">Gare *</Label>
                    <GareSelector
                      id="stationName"
                      value={values.stationName}
                      onChange={(v) => updateField('stationName', v)}
                      placeholder="Rechercher une gare..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Quai *</Label>
                    <Input
                      id="platform"
                      placeholder="5A"
                      value={values.platform}
                      onChange={(e) => updateField('platform', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="origin">Origine</Label>
                    <CitySelect
                      id="origin"
                      value={values.origin}
                      onChange={(v) => updateField('origin', v)}
                      placeholder="Provenance du train"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination</Label>
                    <CitySelect
                      id="destination"
                      value={values.destination}
                      onChange={(v) => updateField('destination', v)}
                      placeholder="Destination du train"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" value={values.date} onChange={(e) => updateField('date', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Heure</Label>
                    <Input id="time" type="time" value={values.time} onChange={(e) => updateField('time', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passengers">Passagers *</Label>
                    <Input
                      id="passengers"
                      type="number"
                      min="0"
                      placeholder="150"
                      value={values.passengers}
                      onChange={(e) => updateField('passengers', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarif à bord / exceptionnel - SEPARATE SECTION */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Ticket className="h-5 w-5 text-accent" />
                  Tarif à bord / exceptionnel
                </CardTitle>
                <CardDescription>Ces tarifs ne comptent pas dans le taux de fraude</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('tarifBordType', 'bord')}
                    className={cn(
                      'rounded-lg px-4 py-2 text-sm font-medium transition-all',
                      values.tarifBordType === 'bord'
                        ? 'bg-accent text-accent-foreground shadow-md'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    )}
                  >
                    Bord
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('tarifBordType', 'exceptionnel')}
                    className={cn(
                      'rounded-lg px-4 py-2 text-sm font-medium transition-all',
                      values.tarifBordType === 'exceptionnel'
                        ? 'bg-warning text-warning-foreground shadow-md'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    )}
                  >
                    Exceptionnel
                  </button>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Montant (€)"
                    value={values.tarifBordMontant}
                    onChange={(e) => updateField('tarifBordMontant', e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" onClick={addTarifBord} variant="secondary">
                    <Plus className="mr-1 h-4 w-4" />
                    Ajouter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tarif Contrôle */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Tarif contrôle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Type</Label>
                  <TypeToggle value={values.tarifControleType} onChange={(v) => updateField('tarifControleType', v)} />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Montant (€)"
                    value={values.tarifControleMontant}
                    onChange={(e) => updateField('tarifControleMontant', e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" onClick={addTarifControle} variant="secondary">
                    <Plus className="mr-1 h-4 w-4" />
                    Ajouter
                  </Button>
                </div>
                <Counter
                  label="STT 50"
                  value={values.stt50Count}
                  onChange={(v) => updateField('stt50Count', v)}
                  variant="primary"
                  showTotal={{ perUnit: 50, label: 'Total' }}
                />
              </CardContent>
            </Card>

            {/* PV */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Procès-verbaux (PV)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Type</Label>
                  <TypeToggle value={values.pvType} onChange={(v) => updateField('pvType', v)} />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Montant (€)"
                    value={values.pvMontant}
                    onChange={(e) => updateField('pvMontant', e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" onClick={addPv} variant="secondary">
                    <Plus className="mr-1 h-4 w-4" />
                    Ajouter
                  </Button>
                </div>
                <Counter
                  label="STT 100"
                  value={values.stt100Count}
                  onChange={(v) => updateField('stt100Count', v)}
                  variant="destructive"
                  showTotal={{ perUnit: 100, label: 'Total' }}
                />
              </CardContent>
            </Card>

            {/* RI & Commentaire */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  Relevés d'identité (RI)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Counter label="RI positif" value={values.riPositif} onChange={(v) => updateField('riPositif', v)} variant="success" />
                  <Counter label="RI négatif" value={values.riNegatif} onChange={(v) => updateField('riNegatif', v)} variant="destructive" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commentaire">Commentaire</Label>
                  <Textarea
                    id="commentaire"
                    placeholder="Notes supplémentaires..."
                    value={values.commentaire}
                    onChange={(e) => updateField('commentaire', e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Summary */}
          <div className="space-y-4">
            <Card className="sticky top-20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Récapitulatif</CardTitle>
                <CardDescription>Taux de fraude en temps réel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fraud Rate Display */}
                <div className={cn(
                  'rounded-xl p-4 text-center',
                  fraudRate > 5 ? 'bg-destructive/20' : fraudRate > 2 ? 'bg-warning/20' : 'bg-success/20'
                )}>
                  <p className="text-sm text-muted-foreground">Taux de fraude</p>
                  <p className={cn(
                    'text-4xl font-bold',
                    fraudRate > 5 ? 'text-destructive' : fraudRate > 2 ? 'text-warning' : 'text-success'
                  )}>
                    {fraudRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">{fraudCount} fraudes / {passengersNum} passagers</p>
                </div>

                {/* Tarifs à bord List */}
                <TarifBordList
                  items={values.tarifsBord}
                  onRemove={removeTarifBord}
                  total={totalTarifsBord}
                />

                {/* Tarifs Contrôle List */}
                <TarifList
                  title="Tarifs contrôle"
                  items={values.tarifsControle}
                  onRemove={removeTarifControle}
                  total={totalTarifsControle}
                  variant="primary"
                  stt50Count={values.stt50Count}
                />

                {/* PV List */}
                <TarifList
                  title="Procès-verbaux"
                  items={values.pvList}
                  onRemove={removePv}
                  total={totalPV}
                  variant="destructive"
                  stt100Count={values.stt100Count}
                />

                {/* RI Summary */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Relevés d'identité</h4>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg bg-success/10 p-2 text-center">
                      <p className="text-lg font-bold text-success">{values.riPositif}</p>
                      <p className="text-xs text-muted-foreground">Positifs</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-destructive/10 p-2 text-center">
                      <p className="text-lg font-bold text-destructive">{values.riNegatif}</p>
                      <p className="text-xs text-muted-foreground">Négatifs</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" variant="hero" size="lg" className="flex-1">
                    <Plus className="h-4 w-4" />
                    Enregistrer le contrôle
                  </Button>
                  {isDirty && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="lg"
                          title="Effacer le brouillon"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Effacer le brouillon ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action va supprimer toutes les données saisies dans le formulaire. Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              clearPersistedData();
                              toast.success('Brouillon effacé');
                            }}
                          >
                            Effacer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <ControlFilters 
          filters={filters} 
          onFiltersChange={setFilters} 
          type="station" 
        />
        {filteredControls.length !== controls.length && (
          <span className="text-sm text-muted-foreground">
            {filteredControls.length} / {controls.length} contrôles
          </span>
        )}
      </div>

      <ControlsTable
        title="Historique des contrôles en gare"
        description={`${filteredControls.length} contrôle${filteredControls.length > 1 ? 's' : ''} affiché${filteredControls.length > 1 ? 's' : ''}`}
        data={filteredControls}
        columns={columns}
        emptyMessage="Aucun contrôle correspondant aux filtres"
      />
    </div>
  );
}
