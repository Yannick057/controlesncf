import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ControlData {
  trainNumber?: string;
  station_name?: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  passengers: number;
  fraudCount: number;
  fraudRate: number;
}

interface ReportOptions {
  title: string;
  period: string;
  onboardControls: ControlData[];
  stationControls: ControlData[];
  teamName?: string;
}

interface ReportStats {
  totalControls: number;
  totalPassengers: number;
  totalFraud: number;
  avgFraudRate: number;
  onboardCount: number;
  stationCount: number;
}

function calculateStats(options: ReportOptions): ReportStats {
  const { onboardControls, stationControls } = options;
  
  const allControls = [...onboardControls, ...stationControls];
  const totalPassengers = allControls.reduce((sum, c) => sum + c.passengers, 0);
  const totalFraud = allControls.reduce((sum, c) => sum + c.fraudCount, 0);

  return {
    totalControls: allControls.length,
    totalPassengers,
    totalFraud,
    avgFraudRate: totalPassengers > 0 ? (totalFraud / totalPassengers) * 100 : 0,
    onboardCount: onboardControls.length,
    stationCount: stationControls.length,
  };
}

function getTopLocations(onboardControls: ControlData[], stationControls: ControlData[]) {
  const locationStats = new Map<string, { passengers: number; fraud: number }>();

  onboardControls.forEach(c => {
    [c.origin, c.destination].forEach(loc => {
      if (!loc) return;
      const existing = locationStats.get(loc) || { passengers: 0, fraud: 0 };
      existing.passengers += c.passengers;
      existing.fraud += c.fraudCount;
      locationStats.set(loc, existing);
    });
  });

  stationControls.forEach(c => {
    const loc = c.station_name;
    if (!loc) return;
    const existing = locationStats.get(loc) || { passengers: 0, fraud: 0 };
    existing.passengers += c.passengers;
    existing.fraud += c.fraudCount;
    locationStats.set(loc, existing);
  });

  return Array.from(locationStats.entries())
    .map(([name, stats]) => ({
      name,
      ...stats,
      rate: stats.passengers > 0 ? (stats.fraud / stats.passengers) * 100 : 0
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);
}

export function generatePDFReport(options: ReportOptions): void {
  const doc = new jsPDF();
  const stats = calculateStats(options);
  const topLocations = getTopLocations(options.onboardControls, options.stationControls);

  // Header
  doc.setFontSize(20);
  doc.setTextColor(0, 102, 204);
  doc.text('SNCF Contrôles', 20, 20);
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(options.title, 20, 32);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Période: ${options.period}`, 20, 40);
  doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 20, 46);
  if (options.teamName) {
    doc.text(`Équipe: ${options.teamName}`, 20, 52);
  }

  // Stats summary
  let yPos = options.teamName ? 62 : 56;
  
  doc.setFillColor(245, 245, 245);
  doc.rect(20, yPos, 170, 30, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  
  const statBoxWidth = 42.5;
  const statData = [
    { label: 'Contrôles', value: stats.totalControls.toString() },
    { label: 'Passagers', value: stats.totalPassengers.toLocaleString('fr-FR') },
    { label: 'Fraudes', value: stats.totalFraud.toString() },
    { label: 'Taux moyen', value: `${stats.avgFraudRate.toFixed(2)}%` },
  ];

  statData.forEach((stat, i) => {
    const x = 20 + (i * statBoxWidth) + (statBoxWidth / 2);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(stat.value, x, yPos + 12, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(stat.label, x, yPos + 22, { align: 'center' });
  });

  yPos += 40;

  // Top locations by fraud
  if (topLocations.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Gares/Villes à surveiller', 20, yPos);
    yPos += 6;

    autoTable(doc, {
      startY: yPos,
      head: [['Gare/Ville', 'Passagers', 'Fraudes', 'Taux']],
      body: topLocations.map(loc => [
        loc.name,
        loc.passengers.toLocaleString('fr-FR'),
        loc.fraud.toString(),
        `${loc.rate.toFixed(2)}%`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [0, 102, 204] },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Onboard controls table
  if (options.onboardControls.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Contrôles à bord (${stats.onboardCount})`, 20, yPos);
    yPos += 6;

    autoTable(doc, {
      startY: yPos,
      head: [['Train', 'Trajet', 'Date', 'Passagers', 'Fraudes', 'Taux']],
      body: options.onboardControls.slice(0, 15).map(c => [
        c.trainNumber || '-',
        `${c.origin} → ${c.destination}`,
        new Date(c.date).toLocaleDateString('fr-FR'),
        c.passengers.toString(),
        c.fraudCount.toString(),
        `${c.fraudRate.toFixed(1)}%`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [0, 102, 204] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 8 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Check if we need a new page
  if (yPos > 250 && options.stationControls.length > 0) {
    doc.addPage();
    yPos = 20;
  }

  // Station controls table
  if (options.stationControls.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Contrôles en gare (${stats.stationCount})`, 20, yPos);
    yPos += 6;

    autoTable(doc, {
      startY: yPos,
      head: [['Gare', 'Trajet', 'Date', 'Passagers', 'Fraudes', 'Taux']],
      body: options.stationControls.slice(0, 15).map(c => [
        c.station_name || '-',
        `${c.origin} → ${c.destination}`,
        new Date(c.date).toLocaleDateString('fr-FR'),
        c.passengers.toString(),
        c.fraudCount.toString(),
        `${c.fraudRate.toFixed(1)}%`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [0, 102, 204] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 8 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} sur ${pageCount} - SNCF Contrôles - Rapport généré automatiquement`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Save
  const filename = `rapport-sncf-${options.period.replace(/\s/g, '-')}.pdf`;
  doc.save(filename);
}

export function generateHTMLReport(options: ReportOptions): string {
  const stats = calculateStats(options);
  const topLocations = getTopLocations(options.onboardControls, options.stationControls);

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      padding: 40px; 
      max-width: 1000px; 
      margin: 0 auto; 
      background: #fafafa;
      color: #1a1a1a;
    }
    .header { 
      background: linear-gradient(135deg, #0066cc, #004499);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .header h1 { font-size: 1.8em; margin-bottom: 8px; }
    .header p { opacity: 0.9; font-size: 0.95em; }
    .stats { 
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .stat-card { 
      background: white; 
      padding: 20px; 
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      text-align: center;
    }
    .stat-value { 
      font-size: 2em; 
      font-weight: bold; 
      color: #0066cc; 
    }
    .stat-label { color: #666; font-size: 0.9em; margin-top: 4px; }
    .section { 
      background: white;
      border-radius: 10px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .section h2 { 
      color: #333; 
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #f0f0f0;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { 
      border: 1px solid #e0e0e0; 
      padding: 12px; 
      text-align: left; 
    }
    th { background: #f5f5f5; font-weight: 600; }
    tr:hover { background: #fafafa; }
    .alert { 
      background: #fff3cd; 
      border-left: 4px solid #ffc107;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 8px;
    }
    .alert.danger { background: #f8d7da; border-color: #dc3545; }
    .footer { 
      margin-top: 40px; 
      padding-top: 20px; 
      border-top: 1px solid #e0e0e0; 
      color: #666; 
      font-size: 0.85em;
      text-align: center;
    }
    @media print {
      body { padding: 20px; background: white; }
      .section { box-shadow: none; border: 1px solid #e0e0e0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚄 ${options.title}</h1>
    <p>Période: ${options.period} | Généré le ${new Date().toLocaleString('fr-FR')}</p>
    ${options.teamName ? `<p>Équipe: ${options.teamName}</p>` : ''}
  </div>
  
  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${stats.totalControls}</div>
      <div class="stat-label">Contrôles</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.totalPassengers.toLocaleString('fr-FR')}</div>
      <div class="stat-label">Passagers</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.totalFraud}</div>
      <div class="stat-label">Fraudes</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.avgFraudRate.toFixed(2)}%</div>
      <div class="stat-label">Taux moyen</div>
    </div>
  </div>

  ${topLocations.length > 0 ? `
  <div class="section">
    <h2>🎯 Gares/Villes à surveiller</h2>
    ${topLocations.map((loc, i) => `
      <div class="alert ${loc.rate >= 5 ? 'danger' : ''}">
        <strong>#${i + 1} ${loc.name}</strong> - 
        ${loc.passengers.toLocaleString('fr-FR')} passagers, 
        ${loc.fraud} fraudes, 
        <strong>${loc.rate.toFixed(2)}%</strong>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${options.onboardControls.length > 0 ? `
  <div class="section">
    <h2>🚆 Contrôles à bord (${stats.onboardCount})</h2>
    <table>
      <thead>
        <tr>
          <th>Train</th>
          <th>Trajet</th>
          <th>Date</th>
          <th>Passagers</th>
          <th>Fraudes</th>
          <th>Taux</th>
        </tr>
      </thead>
      <tbody>
        ${options.onboardControls.slice(0, 20).map(c => `
          <tr>
            <td>${c.trainNumber || '-'}</td>
            <td>${c.origin} → ${c.destination}</td>
            <td>${new Date(c.date).toLocaleDateString('fr-FR')}</td>
            <td>${c.passengers}</td>
            <td>${c.fraudCount}</td>
            <td><strong>${c.fraudRate.toFixed(1)}%</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${options.stationControls.length > 0 ? `
  <div class="section">
    <h2>🚉 Contrôles en gare (${stats.stationCount})</h2>
    <table>
      <thead>
        <tr>
          <th>Gare</th>
          <th>Trajet</th>
          <th>Date</th>
          <th>Passagers</th>
          <th>Fraudes</th>
          <th>Taux</th>
        </tr>
      </thead>
      <tbody>
        ${options.stationControls.slice(0, 20).map(c => `
          <tr>
            <td>${c.station_name || '-'}</td>
            <td>${c.origin} → ${c.destination}</td>
            <td>${new Date(c.date).toLocaleDateString('fr-FR')}</td>
            <td>${c.passengers}</td>
            <td>${c.fraudCount}</td>
            <td><strong>${c.fraudRate.toFixed(1)}%</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p>Ce rapport a été généré automatiquement par l'application SNCF Contrôles.</p>
  </div>
</body>
</html>
  `.trim();
}

export function openHTMLReport(options: ReportOptions): void {
  const html = generateHTMLReport(options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export function downloadHTMLReport(options: ReportOptions): void {
  const html = generateHTMLReport(options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rapport-sncf-${options.period.replace(/\s/g, '-')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
