import { OnboardControl, StationControl } from '@/hooks/useSupabaseControls';

export interface ExportFilters {
  dateStart?: string;
  dateEnd?: string;
  trainNumber?: string;
  origin?: string;
  destination?: string;
  stationName?: string;
  minFraudRate?: number;
  maxFraudRate?: number;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  } catch {
    return dateStr;
  }
}

function safeNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  return fallback;
}

function safeArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? val : [];
}

function calculateTarifs(control: OnboardControl | StationControl): number {
  const tarifsControle = safeArray<{ montant?: number }>(control.tarifsControle);
  const sum = tarifsControle.reduce((s, t) => s + safeNumber(t?.montant), 0);
  return sum + safeNumber(control.stt50Count) * 50;
}

function calculatePV(control: OnboardControl | StationControl): number {
  const pvList = safeArray<{ montant?: number }>(control.pvList);
  const sum = pvList.reduce((s, t) => s + safeNumber(t?.montant), 0);
  return sum + safeNumber(control.stt100Count) * 100;
}

function calculateTarifsBord(control: OnboardControl | StationControl): number {
  const tarifsBord = safeArray<{ montant?: number }>(control.tarifsBord);
  return tarifsBord.reduce((s, t) => s + safeNumber(t?.montant), 0);
}

export function filterOnboardControls(
  controls: OnboardControl[],
  filters: ExportFilters
): OnboardControl[] {
  return controls.filter((c) => {
    if (filters.dateStart && c.date < filters.dateStart) return false;
    if (filters.dateEnd && c.date > filters.dateEnd) return false;
    if (filters.trainNumber && !c.trainNumber?.toLowerCase().includes(filters.trainNumber.toLowerCase())) return false;
    if (filters.origin && !c.origin?.toLowerCase().includes(filters.origin.toLowerCase())) return false;
    if (filters.destination && !c.destination?.toLowerCase().includes(filters.destination.toLowerCase())) return false;
    if (filters.minFraudRate !== undefined && safeNumber(c.fraudRate) < filters.minFraudRate) return false;
    if (filters.maxFraudRate !== undefined && safeNumber(c.fraudRate) > filters.maxFraudRate) return false;
    return true;
  });
}

export function filterStationControls(
  controls: StationControl[],
  filters: ExportFilters
): StationControl[] {
  return controls.filter((c) => {
    if (filters.dateStart && c.date < filters.dateStart) return false;
    if (filters.dateEnd && c.date > filters.dateEnd) return false;
    if (filters.stationName && !c.stationName?.toLowerCase().includes(filters.stationName.toLowerCase())) return false;
    if (filters.origin && !c.origin?.toLowerCase().includes(filters.origin.toLowerCase())) return false;
    if (filters.destination && !c.destination?.toLowerCase().includes(filters.destination.toLowerCase())) return false;
    if (filters.minFraudRate !== undefined && safeNumber(c.fraudRate) < filters.minFraudRate) return false;
    if (filters.maxFraudRate !== undefined && safeNumber(c.fraudRate) > filters.maxFraudRate) return false;
    return true;
  });
}

function getFilterSummaryHTML(filters: ExportFilters): string {
  const parts: string[] = [];
  
  if (filters.dateStart || filters.dateEnd) {
    parts.push(`<strong>Période:</strong> ${filters.dateStart || 'début'} au ${filters.dateEnd || 'fin'}`);
  }
  if (filters.trainNumber) parts.push(`<strong>Train:</strong> ${filters.trainNumber}`);
  if (filters.stationName) parts.push(`<strong>Gare:</strong> ${filters.stationName}`);
  if (filters.origin) parts.push(`<strong>Origine:</strong> ${filters.origin}`);
  if (filters.destination) parts.push(`<strong>Destination:</strong> ${filters.destination}`);
  if (filters.minFraudRate !== undefined || filters.maxFraudRate !== undefined) {
    parts.push(`<strong>Taux de fraude:</strong> ${filters.minFraudRate ?? 0}% - ${filters.maxFraudRate ?? 100}%`);
  }
  
  if (parts.length === 0) return '';
  
  return `
    <div class="filters-applied">
      <h4>🔍 Filtres appliqués</h4>
      <p>${parts.join(' | ')}</p>
    </div>
  `;
}

function generateOnboardHTML(controls: OnboardControl[], filters?: ExportFilters): string {
  // Group by train for detailed view
  const byTrain = controls.reduce((acc, c) => {
    const key = c.trainNumber || 'Inconnu';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, OnboardControl[]>);

  // Group by origin-destination
  const byRoute = controls.reduce((acc, c) => {
    const key = `${c.origin || 'Inconnu'} → ${c.destination || 'Inconnu'}`;
    if (!acc[key]) acc[key] = { count: 0, passengers: 0, frauds: 0 };
    acc[key].count++;
    acc[key].passengers += safeNumber(c.passengers);
    acc[key].frauds += safeNumber(c.fraudCount);
    return acc;
  }, {} as Record<string, { count: number; passengers: number; frauds: number }>);

  // Group by date
  const byDate = controls.reduce((acc, c) => {
    const key = formatDate(c.date);
    if (!acc[key]) acc[key] = { count: 0, passengers: 0, frauds: 0, tarifs: 0, pv: 0 };
    acc[key].count++;
    acc[key].passengers += safeNumber(c.passengers);
    acc[key].frauds += safeNumber(c.fraudCount);
    acc[key].tarifs += calculateTarifs(c);
    acc[key].pv += calculatePV(c);
    return acc;
  }, {} as Record<string, { count: number; passengers: number; frauds: number; tarifs: number; pv: number }>);

  const totalPassengers = controls.reduce((s, c) => s + safeNumber(c.passengers), 0);
  const totalFrauds = controls.reduce((s, c) => s + safeNumber(c.fraudCount), 0);
  const totalTarifs = controls.reduce((s, c) => s + calculateTarifs(c), 0);
  const totalPV = controls.reduce((s, c) => s + calculatePV(c), 0);
  const totalTarifsBord = controls.reduce((s, c) => s + calculateTarifsBord(c), 0);
  const avgFraudRate = totalPassengers > 0 ? (totalFrauds / totalPassengers) * 100 : 0;

  const mainTableRows = controls.map((c, index) => `
    <tr id="control-${index}">
      <td><a href="#train-${c.trainNumber}" class="train-link">${c.trainNumber || '-'}</a></td>
      <td><a href="#route-${encodeURIComponent(`${c.origin}-${c.destination}`)}" class="route-link">${c.origin || '-'} → ${c.destination || '-'}</a></td>
      <td><a href="#date-${c.date}" class="date-link">${formatDate(c.date)} ${c.time || ''}</a></td>
      <td class="right">${safeNumber(c.passengers)}</td>
      <td class="right">${safeNumber(c.fraudCount)}</td>
      <td class="right ${safeNumber(c.fraudRate) > 10 ? 'high-fraud' : safeNumber(c.fraudRate) > 5 ? 'medium-fraud' : ''}">${safeNumber(c.fraudRate).toFixed(1)}%</td>
      <td class="right">${calculateTarifs(c).toFixed(2)}€</td>
      <td class="right">${calculatePV(c).toFixed(2)}€</td>
      <td class="right">${safeNumber(c.riPositif)}</td>
      <td class="right">${safeNumber(c.riNegatif)}</td>
      <td>${c.commentaire || '-'}</td>
    </tr>
  `).join('');

  const trainSummaryRows = Object.entries(byTrain).map(([train, ctrls]) => {
    const passengers = ctrls.reduce((s, c) => s + safeNumber(c.passengers), 0);
    const frauds = ctrls.reduce((s, c) => s + safeNumber(c.fraudCount), 0);
    const rate = passengers > 0 ? (frauds / passengers) * 100 : 0;
    return `
      <tr id="train-${train}">
        <td><strong>${train}</strong></td>
        <td class="right">${ctrls.length}</td>
        <td class="right">${passengers}</td>
        <td class="right">${frauds}</td>
        <td class="right ${rate > 10 ? 'high-fraud' : rate > 5 ? 'medium-fraud' : ''}">${rate.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');

  const routeSummaryRows = Object.entries(byRoute).map(([route, data]) => {
    const rate = data.passengers > 0 ? (data.frauds / data.passengers) * 100 : 0;
    return `
      <tr id="route-${encodeURIComponent(route.replace(' → ', '-'))}">
        <td><strong>${route}</strong></td>
        <td class="right">${data.count}</td>
        <td class="right">${data.passengers}</td>
        <td class="right">${data.frauds}</td>
        <td class="right ${rate > 10 ? 'high-fraud' : rate > 5 ? 'medium-fraud' : ''}">${rate.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');

  const dateSummaryRows = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).map(([date, data]) => {
    const rate = data.passengers > 0 ? (data.frauds / data.passengers) * 100 : 0;
    return `
      <tr id="date-${date}">
        <td><strong>${date}</strong></td>
        <td class="right">${data.count}</td>
        <td class="right">${data.passengers}</td>
        <td class="right">${data.frauds}</td>
        <td class="right ${rate > 10 ? 'high-fraud' : rate > 5 ? 'medium-fraud' : ''}">${rate.toFixed(1)}%</td>
        <td class="right">${data.tarifs.toFixed(2)}€</td>
        <td class="right">${data.pv.toFixed(2)}€</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Contrôles à bord - SNCF - Export détaillé</title>
  <style>
    :root {
      --primary: #0066cc;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #333; line-height: 1.5; }
    h1 { color: var(--primary); border-bottom: 3px solid var(--primary); padding-bottom: 10px; }
    h2 { color: #444; margin-top: 40px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
    h3 { color: #555; margin-top: 30px; }
    
    .nav { 
      position: sticky; top: 0; background: white; padding: 10px 0; 
      border-bottom: 1px solid #ddd; margin-bottom: 20px; z-index: 100;
      display: flex; gap: 10px; flex-wrap: wrap;
    }
    .nav a { 
      padding: 8px 16px; background: var(--primary); color: white; 
      text-decoration: none; border-radius: 4px; font-size: 14px;
    }
    .nav a:hover { background: #0055aa; }
    
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 10px 8px; text-align: left; }
    th { background: var(--primary); color: white; font-weight: 600; position: sticky; top: 50px; }
    tr:nth-child(even) { background: #f8f9fa; }
    tr:hover { background: #e3f2fd; }
    .right { text-align: right; }
    
    .high-fraud { background: #fee2e2 !important; color: var(--danger); font-weight: bold; }
    .medium-fraud { background: #fef3c7 !important; color: var(--warning); }
    
    .summary { margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #f0f7ff, #e8f4fc); border-radius: 12px; }
    .summary h3 { margin: 0 0 15px 0; color: var(--primary); }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; }
    .stat { text-align: center; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-value { font-size: 28px; font-weight: bold; color: var(--primary); }
    .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
    
    .filters-applied { 
      background: #fef9c3; padding: 15px; border-radius: 8px; margin: 15px 0;
      border-left: 4px solid var(--warning);
    }
    .filters-applied h4 { margin: 0 0 8px 0; color: #854d0e; }
    .filters-applied p { margin: 0; color: #713f12; font-size: 14px; }
    
    .train-link, .route-link, .date-link { 
      color: var(--primary); text-decoration: none; 
    }
    .train-link:hover, .route-link:hover, .date-link:hover { 
      text-decoration: underline; 
    }
    
    @media print { 
      body { margin: 0; font-size: 10px; } 
      .nav { display: none; }
      th { position: static; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>🚂 Contrôles à bord - SNCF</h1>
  <p>Exporté le ${new Date().toLocaleString('fr-FR')}</p>
  
  <nav class="nav no-print">
    <a href="#summary">📊 Résumé</a>
    <a href="#by-train">🚂 Par train</a>
    <a href="#by-route">🛤️ Par trajet</a>
    <a href="#by-date">📅 Par date</a>
    <a href="#all-controls">📋 Tous les contrôles</a>
    <a href="javascript:window.print()">🖨️ Imprimer</a>
  </nav>
  
  ${filters ? getFilterSummaryHTML(filters) : ''}
  
  <section id="summary">
    <div class="summary">
      <h3>📊 Résumé global</h3>
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${controls.length}</div>
          <div class="stat-label">Contrôles</div>
        </div>
        <div class="stat">
          <div class="stat-value">${totalPassengers.toLocaleString('fr-FR')}</div>
          <div class="stat-label">Passagers</div>
        </div>
        <div class="stat">
          <div class="stat-value">${totalFrauds}</div>
          <div class="stat-label">Fraudes</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: ${avgFraudRate > 10 ? 'var(--danger)' : avgFraudRate > 5 ? 'var(--warning)' : 'var(--success)'}">${avgFraudRate.toFixed(1)}%</div>
          <div class="stat-label">Taux moyen</div>
        </div>
        <div class="stat">
          <div class="stat-value">${totalTarifs.toFixed(0)}€</div>
          <div class="stat-label">Total Tarifs</div>
        </div>
        <div class="stat">
          <div class="stat-value">${totalPV.toFixed(0)}€</div>
          <div class="stat-label">Total PV</div>
        </div>
        <div class="stat">
          <div class="stat-value">${totalTarifsBord.toFixed(0)}€</div>
          <div class="stat-label">Tarifs Bord</div>
        </div>
        <div class="stat">
          <div class="stat-value">${Object.keys(byTrain).length}</div>
          <div class="stat-label">Trains</div>
        </div>
      </div>
    </div>
  </section>

  <section id="by-train">
    <h2>🚂 Synthèse par train</h2>
    <table>
      <thead>
        <tr>
          <th>Train</th>
          <th class="right">Contrôles</th>
          <th class="right">Passagers</th>
          <th class="right">Fraudes</th>
          <th class="right">Taux</th>
        </tr>
      </thead>
      <tbody>
        ${trainSummaryRows}
      </tbody>
    </table>
  </section>

  <section id="by-route">
    <h2>🛤️ Synthèse par trajet</h2>
    <table>
      <thead>
        <tr>
          <th>Trajet</th>
          <th class="right">Contrôles</th>
          <th class="right">Passagers</th>
          <th class="right">Fraudes</th>
          <th class="right">Taux</th>
        </tr>
      </thead>
      <tbody>
        ${routeSummaryRows}
      </tbody>
    </table>
  </section>

  <section id="by-date">
    <h2>📅 Synthèse par date</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th class="right">Contrôles</th>
          <th class="right">Passagers</th>
          <th class="right">Fraudes</th>
          <th class="right">Taux</th>
          <th class="right">Tarifs</th>
          <th class="right">PV</th>
        </tr>
      </thead>
      <tbody>
        ${dateSummaryRows}
      </tbody>
    </table>
  </section>

  <section id="all-controls">
    <h2>📋 Tous les contrôles (${controls.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Train</th>
          <th>Trajet</th>
          <th>Date/Heure</th>
          <th class="right">Passagers</th>
          <th class="right">Fraudes</th>
          <th class="right">Taux</th>
          <th class="right">Tarifs</th>
          <th class="right">PV</th>
          <th class="right">RI+</th>
          <th class="right">RI-</th>
          <th>Commentaire</th>
        </tr>
      </thead>
      <tbody>
        ${mainTableRows}
      </tbody>
    </table>
  </section>
</body>
</html>`;
}

function generateStationHTML(controls: StationControl[], filters?: ExportFilters): string {
  // Group by station
  const byStation = controls.reduce((acc, c) => {
    const key = c.stationName || 'Inconnue';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, StationControl[]>);

  // Group by route
  const byRoute = controls.reduce((acc, c) => {
    const key = `${c.origin || 'Inconnu'} → ${c.destination || 'Inconnu'}`;
    if (!acc[key]) acc[key] = { count: 0, passengers: 0, frauds: 0 };
    acc[key].count++;
    acc[key].passengers += safeNumber(c.passengers);
    acc[key].frauds += safeNumber(c.fraudCount);
    return acc;
  }, {} as Record<string, { count: number; passengers: number; frauds: number }>);

  // Group by date
  const byDate = controls.reduce((acc, c) => {
    const key = formatDate(c.date);
    if (!acc[key]) acc[key] = { count: 0, passengers: 0, frauds: 0, tarifs: 0, pv: 0 };
    acc[key].count++;
    acc[key].passengers += safeNumber(c.passengers);
    acc[key].frauds += safeNumber(c.fraudCount);
    acc[key].tarifs += calculateTarifs(c);
    acc[key].pv += calculatePV(c);
    return acc;
  }, {} as Record<string, { count: number; passengers: number; frauds: number; tarifs: number; pv: number }>);

  const totalPassengers = controls.reduce((s, c) => s + safeNumber(c.passengers), 0);
  const totalFrauds = controls.reduce((s, c) => s + safeNumber(c.fraudCount), 0);
  const totalTarifs = controls.reduce((s, c) => s + calculateTarifs(c), 0);
  const totalPV = controls.reduce((s, c) => s + calculatePV(c), 0);
  const totalTarifsBord = controls.reduce((s, c) => s + calculateTarifsBord(c), 0);
  const avgFraudRate = totalPassengers > 0 ? (totalFrauds / totalPassengers) * 100 : 0;

  const mainTableRows = controls.map((c, index) => `
    <tr id="control-${index}">
      <td><a href="#station-${encodeURIComponent(c.stationName || '')}" class="station-link">${c.stationName || '-'}</a></td>
      <td>${c.platform || '-'}</td>
      <td><a href="#route-${encodeURIComponent(`${c.origin}-${c.destination}`)}" class="route-link">${c.origin || '-'} → ${c.destination || '-'}</a></td>
      <td><a href="#date-${c.date}" class="date-link">${formatDate(c.date)} ${c.time || ''}</a></td>
      <td class="right">${safeNumber(c.passengers)}</td>
      <td class="right">${safeNumber(c.fraudCount)}</td>
      <td class="right ${safeNumber(c.fraudRate) > 10 ? 'high-fraud' : safeNumber(c.fraudRate) > 5 ? 'medium-fraud' : ''}">${safeNumber(c.fraudRate).toFixed(1)}%</td>
      <td class="right">${calculateTarifs(c).toFixed(2)}€</td>
      <td class="right">${calculatePV(c).toFixed(2)}€</td>
      <td class="right">${safeNumber(c.riPositif)}</td>
      <td class="right">${safeNumber(c.riNegatif)}</td>
      <td>${c.commentaire || '-'}</td>
    </tr>
  `).join('');

  const stationSummaryRows = Object.entries(byStation).map(([station, ctrls]) => {
    const passengers = ctrls.reduce((s, c) => s + safeNumber(c.passengers), 0);
    const frauds = ctrls.reduce((s, c) => s + safeNumber(c.fraudCount), 0);
    const rate = passengers > 0 ? (frauds / passengers) * 100 : 0;
    return `
      <tr id="station-${encodeURIComponent(station)}">
        <td><strong>${station}</strong></td>
        <td class="right">${ctrls.length}</td>
        <td class="right">${passengers}</td>
        <td class="right">${frauds}</td>
        <td class="right ${rate > 10 ? 'high-fraud' : rate > 5 ? 'medium-fraud' : ''}">${rate.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');

  const routeSummaryRows = Object.entries(byRoute).map(([route, data]) => {
    const rate = data.passengers > 0 ? (data.frauds / data.passengers) * 100 : 0;
    return `
      <tr id="route-${encodeURIComponent(route.replace(' → ', '-'))}">
        <td><strong>${route}</strong></td>
        <td class="right">${data.count}</td>
        <td class="right">${data.passengers}</td>
        <td class="right">${data.frauds}</td>
        <td class="right ${rate > 10 ? 'high-fraud' : rate > 5 ? 'medium-fraud' : ''}">${rate.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');

  const dateSummaryRows = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).map(([date, data]) => {
    const rate = data.passengers > 0 ? (data.frauds / data.passengers) * 100 : 0;
    return `
      <tr id="date-${date}">
        <td><strong>${date}</strong></td>
        <td class="right">${data.count}</td>
        <td class="right">${data.passengers}</td>
        <td class="right">${data.frauds}</td>
        <td class="right ${rate > 10 ? 'high-fraud' : rate > 5 ? 'medium-fraud' : ''}">${rate.toFixed(1)}%</td>
        <td class="right">${data.tarifs.toFixed(2)}€</td>
        <td class="right">${data.pv.toFixed(2)}€</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Contrôles en gare - SNCF - Export détaillé</title>
  <style>
    :root {
      --primary: #0066cc;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #333; line-height: 1.5; }
    h1 { color: var(--primary); border-bottom: 3px solid var(--primary); padding-bottom: 10px; }
    h2 { color: #444; margin-top: 40px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
    
    .nav { 
      position: sticky; top: 0; background: white; padding: 10px 0; 
      border-bottom: 1px solid #ddd; margin-bottom: 20px; z-index: 100;
      display: flex; gap: 10px; flex-wrap: wrap;
    }
    .nav a { 
      padding: 8px 16px; background: var(--primary); color: white; 
      text-decoration: none; border-radius: 4px; font-size: 14px;
    }
    .nav a:hover { background: #0055aa; }
    
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 10px 8px; text-align: left; }
    th { background: var(--primary); color: white; font-weight: 600; position: sticky; top: 50px; }
    tr:nth-child(even) { background: #f8f9fa; }
    tr:hover { background: #e3f2fd; }
    .right { text-align: right; }
    
    .high-fraud { background: #fee2e2 !important; color: var(--danger); font-weight: bold; }
    .medium-fraud { background: #fef3c7 !important; color: var(--warning); }
    
    .summary { margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #f0f7ff, #e8f4fc); border-radius: 12px; }
    .summary h3 { margin: 0 0 15px 0; color: var(--primary); }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; }
    .stat { text-align: center; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-value { font-size: 28px; font-weight: bold; color: var(--primary); }
    .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
    
    .filters-applied { 
      background: #fef9c3; padding: 15px; border-radius: 8px; margin: 15px 0;
      border-left: 4px solid var(--warning);
    }
    .filters-applied h4 { margin: 0 0 8px 0; color: #854d0e; }
    .filters-applied p { margin: 0; color: #713f12; font-size: 14px; }
    
    .station-link, .route-link, .date-link { color: var(--primary); text-decoration: none; }
    .station-link:hover, .route-link:hover, .date-link:hover { text-decoration: underline; }
    
    @media print { 
      body { margin: 0; font-size: 10px; } 
      .nav { display: none; }
      th { position: static; }
    }
  </style>
</head>
<body>
  <h1>🚉 Contrôles en gare - SNCF</h1>
  <p>Exporté le ${new Date().toLocaleString('fr-FR')}</p>
  
  <nav class="nav no-print">
    <a href="#summary">📊 Résumé</a>
    <a href="#by-station">🚉 Par gare</a>
    <a href="#by-route">🛤️ Par trajet</a>
    <a href="#by-date">📅 Par date</a>
    <a href="#all-controls">📋 Tous les contrôles</a>
    <a href="javascript:window.print()">🖨️ Imprimer</a>
  </nav>
  
  ${filters ? getFilterSummaryHTML(filters) : ''}
  
  <section id="summary">
    <div class="summary">
      <h3>📊 Résumé global</h3>
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${controls.length}</div>
          <div class="stat-label">Contrôles</div>
        </div>
        <div class="stat">
          <div class="stat-value">${totalPassengers.toLocaleString('fr-FR')}</div>
          <div class="stat-label">Passagers</div>
        </div>
        <div class="stat">
          <div class="stat-value">${totalFrauds}</div>
          <div class="stat-label">Fraudes</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: ${avgFraudRate > 10 ? 'var(--danger)' : avgFraudRate > 5 ? 'var(--warning)' : 'var(--success)'}">${avgFraudRate.toFixed(1)}%</div>
          <div class="stat-label">Taux moyen</div>
        </div>
        <div class="stat">
          <div class="stat-value">${totalTarifs.toFixed(0)}€</div>
          <div class="stat-label">Total Tarifs</div>
        </div>
        <div class="stat">
          <div class="stat-value">${totalPV.toFixed(0)}€</div>
          <div class="stat-label">Total PV</div>
        </div>
        <div class="stat">
          <div class="stat-value">${totalTarifsBord.toFixed(0)}€</div>
          <div class="stat-label">Tarifs Bord</div>
        </div>
        <div class="stat">
          <div class="stat-value">${Object.keys(byStation).length}</div>
          <div class="stat-label">Gares</div>
        </div>
      </div>
    </div>
  </section>

  <section id="by-station">
    <h2>🚉 Synthèse par gare</h2>
    <table>
      <thead>
        <tr>
          <th>Gare</th>
          <th class="right">Contrôles</th>
          <th class="right">Passagers</th>
          <th class="right">Fraudes</th>
          <th class="right">Taux</th>
        </tr>
      </thead>
      <tbody>
        ${stationSummaryRows}
      </tbody>
    </table>
  </section>

  <section id="by-route">
    <h2>🛤️ Synthèse par trajet</h2>
    <table>
      <thead>
        <tr>
          <th>Trajet</th>
          <th class="right">Contrôles</th>
          <th class="right">Passagers</th>
          <th class="right">Fraudes</th>
          <th class="right">Taux</th>
        </tr>
      </thead>
      <tbody>
        ${routeSummaryRows}
      </tbody>
    </table>
  </section>

  <section id="by-date">
    <h2>📅 Synthèse par date</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th class="right">Contrôles</th>
          <th class="right">Passagers</th>
          <th class="right">Fraudes</th>
          <th class="right">Taux</th>
          <th class="right">Tarifs</th>
          <th class="right">PV</th>
        </tr>
      </thead>
      <tbody>
        ${dateSummaryRows}
      </tbody>
    </table>
  </section>

  <section id="all-controls">
    <h2>📋 Tous les contrôles (${controls.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Gare</th>
          <th>Quai</th>
          <th>Trajet</th>
          <th>Date/Heure</th>
          <th class="right">Passagers</th>
          <th class="right">Fraudes</th>
          <th class="right">Taux</th>
          <th class="right">Tarifs</th>
          <th class="right">PV</th>
          <th class="right">RI+</th>
          <th class="right">RI-</th>
          <th>Commentaire</th>
        </tr>
      </thead>
      <tbody>
        ${mainTableRows}
      </tbody>
    </table>
  </section>
</body>
</html>`;
}

export function exportToHTML(
  controls: OnboardControl[] | StationControl[], 
  type: 'onboard' | 'station',
  filters?: ExportFilters
) {
  // Apply filters if provided
  let filteredControls: OnboardControl[] | StationControl[];
  if (filters) {
    filteredControls = type === 'onboard'
      ? filterOnboardControls(controls as OnboardControl[], filters)
      : filterStationControls(controls as StationControl[], filters);
  } else {
    filteredControls = controls;
  }

  const html = type === 'onboard' 
    ? generateOnboardHTML(filteredControls as OnboardControl[], filters)
    : generateStationHTML(filteredControls as StationControl[], filters);
  
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sncf-controles-${type}-${new Date().toISOString().split('T')[0]}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPDF(
  controls: OnboardControl[] | StationControl[], 
  type: 'onboard' | 'station',
  filters?: ExportFilters
) {
  // Apply filters if provided
  let filteredControls: OnboardControl[] | StationControl[];
  if (filters) {
    filteredControls = type === 'onboard'
      ? filterOnboardControls(controls as OnboardControl[], filters)
      : filterStationControls(controls as StationControl[], filters);
  } else {
    filteredControls = controls;
  }

  const html = type === 'onboard' 
    ? generateOnboardHTML(filteredControls as OnboardControl[], filters)
    : generateStationHTML(filteredControls as StationControl[], filters);
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

export function exportToCSV(
  controls: OnboardControl[] | StationControl[], 
  type: 'onboard' | 'station',
  filters?: ExportFilters
) {
  // Apply filters if provided
  let filteredControls: OnboardControl[] | StationControl[];
  if (filters) {
    filteredControls = type === 'onboard'
      ? filterOnboardControls(controls as OnboardControl[], filters)
      : filterStationControls(controls as StationControl[], filters);
  } else {
    filteredControls = controls;
  }

  const headers = type === 'onboard'
    ? ['Train', 'Origine', 'Destination', 'Date', 'Heure', 'Passagers', 'Fraudes', 'Taux (%)', 'Tarifs (€)', 'PV (€)', 'RI+', 'RI-', 'Commentaire']
    : ['Gare', 'Quai', 'Origine', 'Destination', 'Date', 'Heure', 'Passagers', 'Fraudes', 'Taux (%)', 'Tarifs (€)', 'PV (€)', 'RI+', 'RI-', 'Commentaire'];

  const rows = filteredControls.map((c) => {
    const base = [
      c.origin || '',
      c.destination || '',
      c.date || '',
      c.time || '',
      safeNumber(c.passengers).toString(),
      safeNumber(c.fraudCount).toString(),
      safeNumber(c.fraudRate).toFixed(1),
      calculateTarifs(c).toFixed(2),
      calculatePV(c).toFixed(2),
      safeNumber(c.riPositif).toString(),
      safeNumber(c.riNegatif).toString(),
      (c.commentaire || '').replace(/"/g, '""'),
    ];

    if (type === 'onboard') {
      return [(c as OnboardControl).trainNumber || '', ...base];
    } else {
      return [(c as StationControl).stationName || '', (c as StationControl).platform || '', ...base];
    }
  });

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sncf-controles-${type}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
