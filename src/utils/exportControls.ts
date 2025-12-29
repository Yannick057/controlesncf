import { OnboardControl, StationControl } from '@/hooks/useControls';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function generateOnboardHTML(controls: OnboardControl[]): string {
  const rows = controls.map((c) => `
    <tr>
      <td>${c.trainNumber}</td>
      <td>${c.origin} → ${c.destination}</td>
      <td>${formatDate(c.date)} ${c.time}</td>
      <td class="right">${c.passengers}</td>
      <td class="right">${c.fraudCount}</td>
      <td class="right">${c.fraudRate.toFixed(1)}%</td>
      <td class="right">${(c.tarifsControle.reduce((s, t) => s + t.montant, 0) + c.stt50Count * 50).toFixed(2)}€</td>
      <td class="right">${(c.pvList.reduce((s, t) => s + t.montant, 0) + c.stt100Count * 100).toFixed(2)}€</td>
      <td class="right">${c.riPositif}</td>
      <td class="right">${c.riNegatif}</td>
      <td>${c.commentaire || '-'}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Contrôles à bord - SNCF</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #333; }
    h1 { color: #0066cc; border-bottom: 3px solid #0066cc; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #0066cc; color: white; font-weight: 600; }
    tr:nth-child(even) { background: #f8f9fa; }
    tr:hover { background: #e9ecef; }
    .right { text-align: right; }
    .summary { margin-top: 20px; padding: 15px; background: #f0f7ff; border-radius: 8px; }
    .summary h3 { margin: 0 0 10px 0; color: #0066cc; }
    .stats { display: flex; gap: 30px; flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #0066cc; }
    .stat-label { font-size: 12px; color: #666; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>🚂 Contrôles à bord - SNCF</h1>
  <p>Exporté le ${new Date().toLocaleString('fr-FR')}</p>
  
  <div class="summary">
    <h3>Résumé</h3>
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
        <div class="stat-value">${controls.reduce((s, c) => s + c.tarifsControle.reduce((ss, t) => ss + t.montant, 0) + c.stt50Count * 50, 0).toFixed(2)}€</div>
        <div class="stat-label">Total Tarifs</div>
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
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

function generateStationHTML(controls: StationControl[]): string {
  const rows = controls.map((c) => `
    <tr>
      <td>${c.stationName}</td>
      <td>${c.platform}</td>
      <td>${c.origin} → ${c.destination}</td>
      <td>${formatDate(c.date)} ${c.time}</td>
      <td class="right">${c.passengers}</td>
      <td class="right">${c.fraudCount}</td>
      <td class="right">${c.fraudRate.toFixed(1)}%</td>
      <td class="right">${(c.tarifsControle.reduce((s, t) => s + t.montant, 0) + c.stt50Count * 50).toFixed(2)}€</td>
      <td class="right">${(c.pvList.reduce((s, t) => s + t.montant, 0) + c.stt100Count * 100).toFixed(2)}€</td>
      <td class="right">${c.riPositif}</td>
      <td class="right">${c.riNegatif}</td>
      <td>${c.commentaire || '-'}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Contrôles en gare - SNCF</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #333; }
    h1 { color: #0066cc; border-bottom: 3px solid #0066cc; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #0066cc; color: white; font-weight: 600; }
    tr:nth-child(even) { background: #f8f9fa; }
    tr:hover { background: #e9ecef; }
    .right { text-align: right; }
    .summary { margin-top: 20px; padding: 15px; background: #f0f7ff; border-radius: 8px; }
    .summary h3 { margin: 0 0 10px 0; color: #0066cc; }
    .stats { display: flex; gap: 30px; flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #0066cc; }
    .stat-label { font-size: 12px; color: #666; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>🚉 Contrôles en gare - SNCF</h1>
  <p>Exporté le ${new Date().toLocaleString('fr-FR')}</p>
  
  <div class="summary">
    <h3>Résumé</h3>
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
        <div class="stat-value">${controls.reduce((s, c) => s + c.tarifsControle.reduce((ss, t) => ss + t.montant, 0) + c.stt50Count * 50, 0).toFixed(2)}€</div>
        <div class="stat-label">Total Tarifs</div>
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
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

export function exportToHTML(controls: OnboardControl[] | StationControl[], type: 'onboard' | 'station') {
  const html = type === 'onboard' 
    ? generateOnboardHTML(controls as OnboardControl[])
    : generateStationHTML(controls as StationControl[]);
  
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sncf-controles-${type}-${new Date().toISOString().split('T')[0]}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPDF(controls: OnboardControl[] | StationControl[], type: 'onboard' | 'station') {
  const html = type === 'onboard' 
    ? generateOnboardHTML(controls as OnboardControl[])
    : generateStationHTML(controls as StationControl[]);
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
