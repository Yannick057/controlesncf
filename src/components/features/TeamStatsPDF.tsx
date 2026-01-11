import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TeamStats {
  totalMembers: number;
  managers: number;
  agents: number;
  totalOnboardControls: number;
  totalStationControls: number;
  totalPassengers: number;
  avgFraudRate: number;
  topPerformers: { name: string; controls: number }[];
}

interface TeamStatsPDFProps {
  stats: TeamStats;
  teamName?: string;
}

export function TeamStatsPDF({ stats, teamName = 'Équipe' }: TeamStatsPDFProps) {
  const generatePDF = () => {
    const now = new Date();
    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport d'équipe - ${now.toLocaleDateString('fr-FR')}</title>
  <style>
    @page { margin: 2cm; }
    * { box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', system-ui, sans-serif; 
      color: #1a1a1a; 
      line-height: 1.6;
      margin: 0;
      padding: 20px;
    }
    .header { 
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px solid #0066cc;
      margin-bottom: 30px;
    }
    .header h1 { 
      color: #0066cc; 
      margin: 0;
      font-size: 28px;
    }
    .header .subtitle { 
      color: #666; 
      margin-top: 5px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .stat-value {
      font-size: 36px;
      font-weight: bold;
      color: #0066cc;
    }
    .stat-label {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #333;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #f5f5f5;
      font-weight: 600;
    }
    .highlight {
      background: linear-gradient(90deg, #0066cc 0%, #0099ff 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 30px;
    }
    .highlight .value {
      font-size: 48px;
      font-weight: bold;
    }
    .highlight .label {
      font-size: 18px;
      opacity: 0.9;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .badge-danger { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Rapport Statistiques ${teamName}</h1>
    <p class="subtitle">Généré le ${now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
  </div>

  <div class="highlight">
    <div class="value">${stats.totalOnboardControls + stats.totalStationControls}</div>
    <div class="label">Contrôles effectués au total</div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${stats.totalMembers}</div>
      <div class="stat-label">Membres de l'équipe</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.totalPassengers.toLocaleString('fr-FR')}</div>
      <div class="stat-label">Passagers contrôlés</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.avgFraudRate.toFixed(1)}%</div>
      <div class="stat-label">Taux de fraude moyen</div>
    </div>
  </div>

  <div class="two-col">
    <div class="section">
      <h2>👥 Répartition de l'équipe</h2>
      <table>
        <tr>
          <td>Managers</td>
          <td><strong>${stats.managers}</strong></td>
        </tr>
        <tr>
          <td>Agents</td>
          <td><strong>${stats.agents}</strong></td>
        </tr>
        <tr>
          <td><strong>Total</strong></td>
          <td><strong>${stats.totalMembers}</strong></td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h2>🎫 Contrôles par type</h2>
      <table>
        <tr>
          <td>Contrôles à bord</td>
          <td><strong>${stats.totalOnboardControls}</strong></td>
        </tr>
        <tr>
          <td>Contrôles en gare</td>
          <td><strong>${stats.totalStationControls}</strong></td>
        </tr>
        <tr>
          <td><strong>Total</strong></td>
          <td><strong>${stats.totalOnboardControls + stats.totalStationControls}</strong></td>
        </tr>
      </table>
    </div>
  </div>

  ${stats.topPerformers.length > 0 ? `
  <div class="section">
    <h2>🏆 Top Performeurs</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Agent</th>
          <th>Contrôles</th>
        </tr>
      </thead>
      <tbody>
        ${stats.topPerformers.map((p, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${p.name}</td>
            <td><strong>${p.controls}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p>Ce rapport a été généré automatiquement par SNCF Contrôles</p>
    <p>© ${now.getFullYear()} - Tous droits réservés</p>
  </div>
</body>
</html>
    `.trim();

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    toast.success('Rapport PDF généré');
  };

  return (
    <Button variant="outline" onClick={generatePDF}>
      <FileDown className="mr-2 h-4 w-4" />
      Export PDF
    </Button>
  );
}
