import { useState } from 'react';
import { Plus, Building2, AlertTriangle, FileText, User, Download, FileCode, Ticket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ControlsTable } from '@/components/controls/ControlsTable';
import { Counter } from '@/components/controls/Counter';
import { TypeToggle, TarifType } from '@/components/controls/TypeToggle';
import { TarifList } from '@/components/controls/TarifList';
import { TarifBordList } from '@/components/controls/TarifBordList';
import { CitySelect } from '@/components/controls/CitySelect';
import { useStationControls, StationControl, TarifItem, TarifBordItem, TarifBordType } from '@/hooks/useControls';
import { exportToHTML, exportToPDF } from '@/utils/exportControls';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function StationControls() {
  const { controls, addControl } = useStationControls();
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().slice(0, 5);

  // Basic info
  const [stationName, setStationName] = useState('');
  const [platform, setPlatform] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(today);
  const [time, setTime] = useState(now);
  const [passengers, setPassengers] = useState('');

  // Tarif à bord / exceptionnel (ne compte pas pour la fraude)
  const [tarifBordMontant, setTarifBordMontant] = useState('');
  const [tarifBordDescription, setTarifBordDescription] = useState('');
  const [tarifBordType, setTarifBordType] = useState<TarifBordType>('bord');
  const [tarifsBord, setTarifsBord] = useState<TarifBordItem[]>([]);

  // Tarif contrôle
  const [tarifControleType, setTarifControleType] = useState<TarifType>('STT');
  const [tarifControleMontant, setTarifControleMontant] = useState('');
  const [tarifsControle, setTarifsControle] = useState<TarifItem[]>([]);
  const [stt50Count, setStt50Count] = useState(0);

  // PV
  const [pvType, setPvType] = useState<TarifType>('STT');
  const [pvMontant, setPvMontant] = useState('');
  const [pvList, setPvList] = useState<TarifItem[]>([]);
  const [stt100Count, setStt100Count] = useState(0);

  // RI
  const [riPositif, setRiPositif] = useState(0);
  const [riNegatif, setRiNegatif] = useState(0);
  const [commentaire, setCommentaire] = useState('');

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
    setTarifsBord([...tarifsBord, { 
      id: Date.now(), 
      montant, 
      description: tarifBordDescription || undefined,
      tarifType: tarifBordType
    }]);
    setTarifBordMontant('');
    setTarifBordDescription('');
  };

  const removeTarifBord = (id: number) => {
    setTarifsBord(tarifsBord.filter((t) => t.id !== id));
  };

  const addTarifControle = () => {
    const montant = parseFloat(tarifControleMontant);
    if (!montant || montant <= 0) {
      toast.error('Montant invalide');
      return;
    }
    setTarifsControle([...tarifsControle, { id: Date.now(), type: tarifControleType, montant }]);
    setTarifControleMontant('');
  };

  const removeTarifControle = (id: number) => {
    setTarifsControle(tarifsControle.filter((t) => t.id !== id));
  };

  const addPv = () => {
    const montant = parseFloat(pvMontant);
    if (!montant || montant <= 0) {
      toast.error('Montant invalide');
      return;
    }
    setPvList([...pvList, { id: Date.now(), type: pvType, montant }]);
    setPvMontant('');
  };

  const removePv = (id: number) => {
    setPvList(pvList.filter((t) => t.id !== id));
  };

  const resetForm = () => {
    setStationName('');
    setPlatform('');
    setOrigin('');
    setDestination('');
    setDate(today);
    setTime(new Date().toTimeString().slice(0, 5));
    setPassengers('');
    setTarifsBord([]);
    setTarifBordMontant('');
    setTarifBordDescription('');
    setTarifsControle([]);
    setStt50Count(0);
    setPvList([]);
    setStt100Count(0);
    setRiPositif(0);
    setRiNegatif(0);
    setCommentaire('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!stationName.trim() || !platform.trim() || !passengers) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    addControl({
      stationName,
      platform,
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

    toast.success('Contrôle enregistré !', {
      description: `${stationName} - ${passengersNum} passagers, ${fraudCount} fraudes`,
    });

    resetForm();
  };

  const handleExportHTML = () => {
    if (controls.length === 0) {
      toast.error('Aucun contrôle à exporter');
      return;
    }
    exportToHTML(controls, 'station');
    toast.success('Export HTML téléchargé');
  };

  const handleExportPDF = () => {
    if (controls.length === 0) {
      toast.error('Aucun contrôle à exporter');
      return;
    }
    exportToPDF(controls, 'station');
    toast.success('Export PDF ouvert');
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contrôles en gare</h1>
          <p className="text-muted-foreground">Enregistrez et consultez les contrôles effectués dans les gares</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportHTML}>
            <FileCode className="mr-1 h-4 w-4" />
            HTML
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="mr-1 h-4 w-4" />
            PDF
          </Button>
        </div>
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
                    <CitySelect
                      id="stationName"
                      value={stationName}
                      onChange={setStationName}
                      placeholder="Sélectionner la gare"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Quai *</Label>
                    <Input
                      id="platform"
                      placeholder="5A"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="origin">Origine</Label>
                    <CitySelect
                      id="origin"
                      value={origin}
                      onChange={setOrigin}
                      placeholder="Provenance du train"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination</Label>
                    <CitySelect
                      id="destination"
                      value={destination}
                      onChange={setDestination}
                      placeholder="Destination du train"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Heure</Label>
                    <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passengers">Passagers *</Label>
                    <Input
                      id="passengers"
                      type="number"
                      min="0"
                      placeholder="150"
                      value={passengers}
                      onChange={(e) => setPassengers(e.target.value)}
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
                    onClick={() => setTarifBordType('bord')}
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
                    onClick={() => setTarifBordType('exceptionnel')}
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
                    type="text"
                    placeholder="Description (optionnel)"
                    value={tarifBordDescription}
                    onChange={(e) => setTarifBordDescription(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Montant (€)"
                    value={tarifBordMontant}
                    onChange={(e) => setTarifBordMontant(e.target.value)}
                    className="w-32"
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
                  <TypeToggle value={tarifControleType} onChange={setTarifControleType} />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Montant (€)"
                    value={tarifControleMontant}
                    onChange={(e) => setTarifControleMontant(e.target.value)}
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
                  onChange={setStt50Count}
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
                  <TypeToggle value={pvType} onChange={setPvType} />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Montant (€)"
                    value={pvMontant}
                    onChange={(e) => setPvMontant(e.target.value)}
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
                  onChange={setStt100Count}
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
                  <Counter label="RI positif" value={riPositif} onChange={setRiPositif} variant="success" />
                  <Counter label="RI négatif" value={riNegatif} onChange={setRiNegatif} variant="destructive" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commentaire">Commentaire</Label>
                  <Textarea
                    id="commentaire"
                    placeholder="Notes supplémentaires..."
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
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

                <Button type="submit" variant="hero" size="lg" className="w-full">
                  <Plus className="h-4 w-4" />
                  Enregistrer le contrôle
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      <ControlsTable
        title="Historique des contrôles en gare"
        description={`${controls.length} contrôle${controls.length > 1 ? 's' : ''} enregistré${controls.length > 1 ? 's' : ''}`}
        data={controls}
        columns={columns}
        emptyMessage="Aucun contrôle enregistré pour le moment"
      />
    </div>
  );
}
