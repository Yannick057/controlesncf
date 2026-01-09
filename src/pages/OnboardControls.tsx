import { useEffect } from 'react';
import { Plus, Train, AlertTriangle, FileText, User, Download, Ticket, Loader2, Trash2 } from 'lucide-react';
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
import { CitySelect } from '@/components/controls/CitySelect';
import { TrainNumberInput } from '@/components/controls/TrainNumberInput';
import { ExportFilterDialog } from '@/components/controls/ExportFilterDialog';
import { useSupabaseOnboardControls, OnboardControl, TarifItem, TarifBordItem, TarifBordType } from '@/hooks/useSupabaseControls';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useTrainPrediction } from '@/hooks/useTrainPrediction';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OnboardFormValues {
  trainNumber: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  passengers: string;
  tarifsBord: TarifBordItem[];
  tarifBordMontant: string;
  tarifBordDescription: string;
  tarifBordType: TarifBordType;
  tarifsControle: TarifItem[];
  tarifControleType: 'STT' | 'RNV' | 'Titre tiers' | 'D. naissance' | 'Autre';
  tarifControleMontant: string;
  stt50Count: number;
  pvList: TarifItem[];
  pvType: 'STT' | 'RNV' | 'Titre tiers' | 'D. naissance' | 'Autre';
  pvMontant: string;
  stt100Count: number;
  riPositif: number;
  riNegatif: number;
  commentaire: string;
}

const getDefaultFormValues = (): OnboardFormValues => ({
  trainNumber: '',
  origin: '',
  destination: '',
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  passengers: '',
  tarifsBord: [],
  tarifBordMontant: '',
  tarifBordDescription: '',
  tarifBordType: 'bord',
  tarifsControle: [],
  tarifControleType: 'STT',
  tarifControleMontant: '',
  stt50Count: 0,
  pvList: [],
  pvType: 'STT',
  pvMontant: '',
  stt100Count: 0,
  riPositif: 0,
  riNegatif: 0,
  commentaire: '',
});

export default function OnboardControls() {
  const { controls, loading, addControl } = useSupabaseOnboardControls();
  const { vibrateSuccess, vibrateError } = useHapticFeedback();
  const { addRecentTrain } = useTrainPrediction();
  
  // Use form persistence hook to save form data when changing tabs
  const { values: formValues, updateField, updateFields, clearPersistedData, isDirty } = useFormPersistence<OnboardFormValues>({
    key: 'onboard_control_form',
    defaultValues: getDefaultFormValues(),
    formName: 'Contrôle à bord',
  });

  // Destructure for easier access
  const {
    trainNumber, origin, destination, date, time, passengers,
    tarifsBord, tarifBordMontant, tarifBordDescription, tarifBordType,
    tarifsControle, tarifControleType, tarifControleMontant, stt50Count,
    pvList, pvType, pvMontant, stt100Count,
    riPositif, riNegatif, commentaire
  } = formValues;

  // Calculated values
  const totalTarifsBord = tarifsBord.reduce((sum, t) => sum + t.montant, 0);
  const totalTarifsControle = tarifsControle.reduce((sum, t) => sum + t.montant, 0) + (stt50Count * 50);
  const totalPV = pvList.reduce((sum, t) => sum + t.montant, 0) + (stt100Count * 100);
  // Tarif à bord ne compte PAS pour la fraude
  const fraudCount = tarifsControle.length + pvList.length + stt50Count + stt100Count;
  const passengersNum = parseInt(passengers) || 0;
  const fraudRate = passengersNum > 0 ? (fraudCount / passengersNum) * 100 : 0;

  const addTarifBord = () => {
    const montant = parseFloat(tarifBordMontant);
    if (!montant || montant <= 0) {
      toast.error('Montant invalide');
      return;
    }
    updateField('tarifsBord', [...tarifsBord, { 
      id: Date.now(), 
      montant, 
      description: tarifBordDescription || undefined,
      tarifType: tarifBordType
    }]);
    updateFields({ tarifBordMontant: '', tarifBordDescription: '' });
  };

  const removeTarifBord = (id: number) => {
    updateField('tarifsBord', tarifsBord.filter((t) => t.id !== id));
  };

  const addTarifControle = () => {
    const montant = parseFloat(tarifControleMontant);
    if (!montant || montant <= 0) {
      toast.error('Montant invalide');
      return;
    }
    updateField('tarifsControle', [...tarifsControle, { id: Date.now(), type: tarifControleType, montant }]);
    updateField('tarifControleMontant', '');
  };

  const removeTarifControle = (id: number) => {
    updateField('tarifsControle', tarifsControle.filter((t) => t.id !== id));
  };

  const addPv = () => {
    const montant = parseFloat(pvMontant);
    if (!montant || montant <= 0) {
      toast.error('Montant invalide');
      return;
    }
    updateField('pvList', [...pvList, { id: Date.now(), type: pvType, montant }]);
    updateField('pvMontant', '');
  };

  const removePv = (id: number) => {
    updateField('pvList', pvList.filter((t) => t.id !== id));
  };

  const resetForm = () => {
    clearPersistedData();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!trainNumber.trim() || !origin || !destination || !passengers) {
      toast.error('Veuillez remplir les champs obligatoires');
      vibrateError();
      return;
    }

    addControl({
      trainNumber,
      origin,
      destination,
      date,
      time,
      passengers: passengersNum,
      tarifsBord,
      tarifsControle,
      stt50Count,
      pvList,
      stt100Count,
      riPositif,
      riNegatif,
      commentaire,
      fraudCount,
    });

    // Add train to recent list
    addRecentTrain(trainNumber);
    
    // Haptic feedback on success
    vibrateSuccess();

    toast.success('Contrôle enregistré !', {
      description: `Train ${trainNumber} - ${passengersNum} passagers, ${fraudCount} fraudes`,
    });

    resetForm();
  };
  const columns = [
    {
      key: 'trainNumber',
      label: 'Train',
      render: (item: OnboardControl) => <span className="font-medium">{item.trainNumber}</span>,
    },
    {
      key: 'trajet',
      label: 'Trajet',
      render: (item: OnboardControl) => (
        <span className="text-muted-foreground">{item.origin} → {item.destination}</span>
      ),
    },
    {
      key: 'datetime',
      label: 'Date/Heure',
      render: (item: OnboardControl) => (
        <span className="text-muted-foreground">
          {new Date(item.date).toLocaleDateString('fr-FR')} {item.time}
        </span>
      ),
    },
    {
      key: 'passengers',
      label: 'Passagers',
      align: 'right' as const,
      render: (item: OnboardControl) => <span className="font-medium">{item.passengers}</span>,
    },
    {
      key: 'fraudCount',
      label: 'Fraudes',
      align: 'right' as const,
      render: (item: OnboardControl) => (
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
      render: (item: OnboardControl) => <span className="font-medium">{item.fraudRate.toFixed(1)}%</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contrôles à bord</h1>
          <p className="text-muted-foreground">Enregistrez et consultez les contrôles effectués dans les trains</p>
        </div>
        <ExportFilterDialog 
          controls={controls} 
          type="onboard"
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
                  <Train className="h-5 w-5 text-primary" />
                  Informations du contrôle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="trainNumber">Numéro de train *</Label>
                    <TrainNumberInput
                      id="trainNumber"
                      value={trainNumber}
                      onChange={(v) => updateField('trainNumber', v)}
                      placeholder="TGV 8541"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="origin">Origine *</Label>
                    <CitySelect
                      id="origin"
                      value={origin}
                      onChange={(v) => updateField('origin', v)}
                      placeholder="Ville de départ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination *</Label>
                    <CitySelect
                      id="destination"
                      value={destination}
                      onChange={(v) => updateField('destination', v)}
                      placeholder="Ville d'arrivée"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" value={date} onChange={(e) => updateField('date', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Heure</Label>
                    <Input id="time" type="time" value={time} onChange={(e) => updateField('time', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passengers">Passagers *</Label>
                    <Input
                      id="passengers"
                      type="number"
                      min="0"
                      placeholder="150"
                      value={passengers}
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
                      tarifBordType === 'bord'
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
                      tarifBordType === 'exceptionnel'
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
                    value={tarifBordMontant}
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
                  <TypeToggle value={tarifControleType} onChange={(v) => updateField('tarifControleType', v)} />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Montant (€)"
                    value={tarifControleMontant}
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
                  value={stt50Count}
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
                  <TypeToggle value={pvType} onChange={(v) => updateField('pvType', v)} />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Montant (€)"
                    value={pvMontant}
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
                  value={stt100Count}
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
                  <Counter label="RI positif" value={riPositif} onChange={(v) => updateField('riPositif', v)} variant="success" />
                  <Counter label="RI négatif" value={riNegatif} onChange={(v) => updateField('riNegatif', v)} variant="destructive" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commentaire">Commentaire</Label>
                  <Textarea
                    id="commentaire"
                    placeholder="Notes supplémentaires..."
                    value={commentaire}
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
                  items={tarifsBord}
                  onRemove={removeTarifBord}
                  total={totalTarifsBord}
                />

                {/* Tarifs Contrôle List */}
                <TarifList
                  title="Tarifs contrôle"
                  items={tarifsControle}
                  onRemove={removeTarifControle}
                  total={totalTarifsControle}
                  variant="primary"
                  stt50Count={stt50Count}
                />

                {/* PV List */}
                <TarifList
                  title="Procès-verbaux"
                  items={pvList}
                  onRemove={removePv}
                  total={totalPV}
                  variant="destructive"
                  stt100Count={stt100Count}
                />

                {/* RI Summary */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Relevés d'identité</h4>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg bg-success/10 p-2 text-center">
                      <p className="text-lg font-bold text-success">{riPositif}</p>
                      <p className="text-xs text-muted-foreground">Positifs</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-destructive/10 p-2 text-center">
                      <p className="text-lg font-bold text-destructive">{riNegatif}</p>
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

      <ControlsTable
        title="Historique des contrôles à bord"
        description={`${controls.length} contrôle${controls.length > 1 ? 's' : ''} enregistré${controls.length > 1 ? 's' : ''}`}
        data={controls}
        columns={columns}
        emptyMessage="Aucun contrôle enregistré pour le moment"
      />
    </div>
  );
}
