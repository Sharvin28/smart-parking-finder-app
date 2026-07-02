import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ParkingRecord, ReportSummary } from '../hooks/useParkingReport';

function fmtDate(ts: ParkingRecord['timeIn']): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function durationLabel(record: ParkingRecord): string {
  if (!record.timeIn || !record.timeOut) return '—';
  const mins = Math.round((record.timeOut.toMillis() - record.timeIn.toMillis()) / 60000);
  if (mins < 0) return '—';
  return `${mins} min`;
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportReportAsCSV(records: ParkingRecord[]): Promise<void> {
  const header = ['Zone', 'Slot', 'User ID', 'Time In', 'Time Out', 'Duration'];
  const rows = records.map((r) => [
    r.zone,
    r.slotId,
    r.userId,
    fmtDate(r.timeIn),
    fmtDate(r.timeOut),
    durationLabel(r),
  ]);

  const csvLines = [header, ...rows].map((row) => row.map(csvCell).join(','));
  const csvContent = csvLines.join('\n');

  const fileName = `parking_report_${Date.now()}.csv`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
  encoding: 'utf8',
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Parking Report (CSV)',
      UTI: 'public.comma-separated-values-text',
    });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
}

function buildReportHTML(summary: ReportSummary, records: ParkingRecord[]): string {
  const generatedAt = new Date().toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const zoneRows = summary.zoneSummaries
    .map(
      (z) => `
      <tr>
        <td>${z.zone}</td>
        <td>${z.sessions}</td>
        <td>${z.completedSessions}</td>
        <td>${z.avgDurationMinutes !== null ? `${z.avgDurationMinutes} min` : '—'}</td>
        <td>${z.peakHourLabel ?? '—'}</td>
      </tr>`
    )
    .join('');

  const sessionRows = records
    .slice(0, 200) // cap for a manageable PDF size; full data is in the CSV export
    .map(
      (r) => `
      <tr>
        <td>${r.zone}</td>
        <td>${r.slotId}</td>
        <td>${r.userId}</td>
        <td>${fmtDate(r.timeIn)}</td>
        <td>${fmtDate(r.timeOut)}</td>
        <td>${durationLabel(r)}</td>
      </tr>`
    )
    .join('');

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #0D1B2A; padding: 32px; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .meta { color: #4A5568; font-size: 12px; margin-bottom: 24px; }
        .stats { display: flex; gap: 12px; margin-bottom: 28px; }
        .stat { flex: 1; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; text-align: center; }
        .stat .value { font-size: 22px; font-weight: 800; color: #00A88B; }
        .stat .label { font-size: 11px; color: #4A5568; margin-top: 2px; }
        h2 { font-size: 15px; margin-top: 28px; margin-bottom: 8px; border-bottom: 2px solid #00C9A7; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { text-align: left; background: #0D1B2A; color: #fff; padding: 6px 8px; }
        td { padding: 6px 8px; border-bottom: 1px solid #E2E8F0; }
        tr:nth-child(even) { background: #F8FAFC; }
        .footnote { font-size: 10px; color: #8A96A3; margin-top: 16px; }
      </style>
    </head>
    <body>
      <h1>Smart Parking MMU — Usage Report</h1>
      <div class="meta">Generated ${generatedAt}</div>

      <div class="stats">
        <div class="stat">
          <div class="value">${summary.totalSessions}</div>
          <div class="label">Total Sessions</div>
        </div>
        <div class="stat">
          <div class="value">${summary.peakZone ?? '—'}</div>
          <div class="label">Peak Zone</div>
        </div>
        <div class="stat">
          <div class="value">${summary.avgDurationMinutes !== null ? `${summary.avgDurationMinutes} min` : '—'}</div>
          <div class="label">Avg. Stay</div>
        </div>
      </div>

      <h2>Zone Breakdown</h2>
      <table>
        <thead>
          <tr><th>Zone</th><th>Sessions</th><th>Completed</th><th>Avg Duration</th><th>Peak Hour</th></tr>
        </thead>
        <tbody>${zoneRows || '<tr><td colspan="5">No data</td></tr>'}</tbody>
      </table>

      <h2>Session Log${records.length > 200 ? ' (most recent 200 — full data in CSV export)' : ''}</h2>
      <table>
        <thead>
          <tr><th>Zone</th><th>Slot</th><th>User ID</th><th>Time In</th><th>Time Out</th><th>Duration</th></tr>
        </thead>
        <tbody>${sessionRows || '<tr><td colspan="6">No data</td></tr>'}</tbody>
      </table>

      <div class="footnote">Smart Parking MMU · Final Year Project · User IDs shown are Firebase Auth UIDs.</div>
    </body>
  </html>`;
}

export async function exportReportAsPDF(
  summary: ReportSummary,
  records: ParkingRecord[]
): Promise<void> {
  const html = buildReportHTML(summary, records);

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Export Parking Report (PDF)',
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
}
