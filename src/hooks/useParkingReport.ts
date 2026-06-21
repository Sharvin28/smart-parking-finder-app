import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { db } from '../../firebase';

// Mirrors the parkingRecords document shape written in navi.tsx's
// handleCheckIn / handleCheckOut — do not change field names here
// without updating navi.tsx too.
export interface ParkingRecord {
  id: string;
  userId: string;
  slotId: string;
  zone: string;
  timeIn: Timestamp | null;
  timeOut: Timestamp | null;
}

export interface ZoneSummary {
  zone: string;
  sessions: number;
  completedSessions: number; // has both timeIn and timeOut
  avgDurationMinutes: number | null;
  peakHourLabel: string | null; // e.g. "9–10 AM"
}

export interface ReportSummary {
  totalSessions: number;
  totalCompletedSessions: number;
  avgDurationMinutes: number | null;
  peakZone: string | null;
  zoneSummaries: ZoneSummary[];
}

function formatHourRange(hour: number): string {
  const to12 = (h: number) => {
    const period = h < 12 ? 'AM' : 'PM';
    const display = h % 12 === 0 ? 12 : h % 12;
    return { display, period };
  };
  const start = to12(hour);
  const end = to12((hour + 1) % 24);
  // Collapse "9 AM–10 AM" to "9–10 AM" when periods match, like the mockup
  if (start.period === end.period) {
    return `${start.display}–${end.display} ${end.period}`;
  }
  return `${start.display} ${start.period}–${end.display} ${end.period}`;
}

function summarize(records: ParkingRecord[]): ReportSummary {
  const byZone = new Map<string, ParkingRecord[]>();
  for (const r of records) {
    const list = byZone.get(r.zone) ?? [];
    list.push(r);
    byZone.set(r.zone, list);
  }

  const zoneSummaries: ZoneSummary[] = [];
  let totalDurationMs = 0;
  let totalCompleted = 0;

  for (const [zone, zoneRecords] of byZone.entries()) {
    let zoneDurationMs = 0;
    let zoneCompleted = 0;
    const hourCounts = new Array(24).fill(0);

    for (const r of zoneRecords) {
      if (r.timeIn) {
        hourCounts[r.timeIn.toDate().getHours()]++;
      }
      if (r.timeIn && r.timeOut) {
        const durationMs = r.timeOut.toMillis() - r.timeIn.toMillis();
        if (durationMs > 0) {
          zoneDurationMs += durationMs;
          zoneCompleted++;
        }
      }
    }

    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const hasAnyArrivals = hourCounts.some((c) => c > 0);

    zoneSummaries.push({
      zone,
      sessions: zoneRecords.length,
      completedSessions: zoneCompleted,
      avgDurationMinutes:
        zoneCompleted > 0 ? Math.round(zoneDurationMs / zoneCompleted / 60000) : null,
      peakHourLabel: hasAnyArrivals ? formatHourRange(peakHour) : null,
    });

    totalDurationMs += zoneDurationMs;
    totalCompleted += zoneCompleted;
  }

  zoneSummaries.sort((a, b) => b.sessions - a.sessions);

  const peakZone = zoneSummaries.length > 0 ? zoneSummaries[0].zone : null;

  return {
    totalSessions: records.length,
    totalCompletedSessions: totalCompleted,
    avgDurationMinutes:
      totalCompleted > 0 ? Math.round(totalDurationMs / totalCompleted / 60000) : null,
    peakZone,
    zoneSummaries,
  };
}

export function useParkingReport() {
  const [records, setRecords] = useState<ParkingRecord[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'parkingRecords'), orderBy('timeIn', 'desc'));
      const snap = await getDocs(q);
      const fetched: ParkingRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          slotId: data.slotId,
          zone: data.zone,
          timeIn: data.timeIn ?? null,
          timeOut: data.timeOut ?? null,
        };
      });
      setRecords(fetched);
      setSummary(summarize(fetched));
      setHasLoaded(true);
    } catch (err: any) {
      console.error('Report fetch error:', err);
      setError(err.message ?? 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load once on mount so AdminZonesScreen-style usage works too
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { records, summary, loading, error, hasLoaded, refetch: fetchReport };
}
