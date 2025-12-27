import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ControlFormProps {
  type: 'onboard' | 'station';
  onSubmit: (data: Record<string, string | number>) => void;
}

export function ControlForm({ type, onSubmit }: ControlFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().slice(0, 5);

  const [formData, setFormData] = useState({
    // Common fields
    date: today,
    time: now,
    passengers: '',
    fraudCount: '',
    // Onboard specific
    trainNumber: '',
    route: '',
    // Station specific
    stationName: '',
    platform: '',
    origin: '',
    destination: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) newErrors.date = 'Date requise';
    if (!formData.time) newErrors.time = 'Heure requise';
    if (!formData.passengers || parseInt(formData.passengers) < 0) {
      newErrors.passengers = 'Nombre de passagers invalide';
    }
    if (formData.fraudCount === '' || parseInt(formData.fraudCount) < 0) {
      newErrors.fraudCount = 'Nombre de fraudes invalide';
    }
    if (parseInt(formData.fraudCount) > parseInt(formData.passengers)) {
      newErrors.fraudCount = 'Ne peut pas dépasser le nombre de passagers';
    }

    if (type === 'onboard') {
      if (!formData.trainNumber.trim()) newErrors.trainNumber = 'Numéro de train requis';
      if (!formData.route.trim()) newErrors.route = 'Trajet requis';
    } else {
      if (!formData.stationName.trim()) newErrors.stationName = 'Nom de gare requis';
      if (!formData.platform.trim()) newErrors.platform = 'Quai requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    const data = type === 'onboard'
      ? {
          trainNumber: formData.trainNumber,
          route: formData.route,
          date: formData.date,
          time: formData.time,
          passengers: parseInt(formData.passengers),
          fraudCount: parseInt(formData.fraudCount),
        }
      : {
          stationName: formData.stationName,
          platform: formData.platform,
          origin: formData.origin,
          destination: formData.destination,
          date: formData.date,
          time: formData.time,
          passengers: parseInt(formData.passengers),
          fraudCount: parseInt(formData.fraudCount),
        };

    onSubmit(data);
    
    // Reset form
    setFormData({
      date: today,
      time: new Date().toTimeString().slice(0, 5),
      passengers: '',
      fraudCount: '',
      trainNumber: '',
      route: '',
      stationName: '',
      platform: '',
      origin: '',
      destination: '',
    });

    toast.success('Contrôle enregistré !', {
      description: type === 'onboard' 
        ? `Train ${formData.trainNumber} - ${formData.passengers} passagers`
        : `${formData.stationName} - ${formData.passengers} passagers`,
    });
  };

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle>
          {type === 'onboard' ? 'Nouveau contrôle à bord' : 'Nouveau contrôle en gare'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {type === 'onboard' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="trainNumber">Numéro de train</Label>
                  <Input
                    id="trainNumber"
                    placeholder="TGV 8541"
                    value={formData.trainNumber}
                    onChange={(e) => handleChange('trainNumber', e.target.value)}
                    className={errors.trainNumber ? 'border-destructive' : ''}
                  />
                  {errors.trainNumber && <p className="text-xs text-destructive">{errors.trainNumber}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route">Trajet</Label>
                  <Input
                    id="route"
                    placeholder="Paris → Lyon"
                    value={formData.route}
                    onChange={(e) => handleChange('route', e.target.value)}
                    className={errors.route ? 'border-destructive' : ''}
                  />
                  {errors.route && <p className="text-xs text-destructive">{errors.route}</p>}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="stationName">Gare</Label>
                  <Input
                    id="stationName"
                    placeholder="Paris Gare de Lyon"
                    value={formData.stationName}
                    onChange={(e) => handleChange('stationName', e.target.value)}
                    className={errors.stationName ? 'border-destructive' : ''}
                  />
                  {errors.stationName && <p className="text-xs text-destructive">{errors.stationName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform">Quai</Label>
                  <Input
                    id="platform"
                    placeholder="5A"
                    value={formData.platform}
                    onChange={(e) => handleChange('platform', e.target.value)}
                    className={errors.platform ? 'border-destructive' : ''}
                  />
                  {errors.platform && <p className="text-xs text-destructive">{errors.platform}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="origin">Provenance</Label>
                  <Input
                    id="origin"
                    placeholder="Marseille"
                    value={formData.origin}
                    onChange={(e) => handleChange('origin', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    placeholder="Paris"
                    value={formData.destination}
                    onChange={(e) => handleChange('destination', e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className={errors.date ? 'border-destructive' : ''}
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Heure</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
                className={errors.time ? 'border-destructive' : ''}
              />
              {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="passengers">Passagers</Label>
              <Input
                id="passengers"
                type="number"
                min="0"
                placeholder="150"
                value={formData.passengers}
                onChange={(e) => handleChange('passengers', e.target.value)}
                className={errors.passengers ? 'border-destructive' : ''}
              />
              {errors.passengers && <p className="text-xs text-destructive">{errors.passengers}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fraudCount">Fraudes</Label>
              <Input
                id="fraudCount"
                type="number"
                min="0"
                placeholder="5"
                value={formData.fraudCount}
                onChange={(e) => handleChange('fraudCount', e.target.value)}
                className={errors.fraudCount ? 'border-destructive' : ''}
              />
              {errors.fraudCount && <p className="text-xs text-destructive">{errors.fraudCount}</p>}
            </div>
          </div>

          <Button type="submit" className="w-full sm:w-auto" variant="hero">
            <Plus className="h-4 w-4" />
            Enregistrer le contrôle
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
