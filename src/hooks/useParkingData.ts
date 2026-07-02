import { ZoneKey } from '@/config/parkingZones';
import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { rtdb } from '../../firebase';

// ─── Slot status now carries GPS coordinates from Firebase ───────────────────
export interface SlotStatus {
  slotNumber: string;
  occupied: boolean;
  sensorId: string;
  latitude: number;
  longitude: number;
}

export interface AvailableCounts {
  Student: number;
  Staff: number;
  Visitor: number;
  Total: number;
}

export interface ZoneSlots {
  Student: SlotStatus[];
  Staff: SlotStatus[];
  Visitor: SlotStatus[];
}

const EMPTY_COUNTS: AvailableCounts = {
  Student: 0,
  Staff: 0,
  Visitor: 0,
  Total: 0,
};

const EMPTY_SLOTS: ZoneSlots = {
  Student: [],
  Staff: [],
  Visitor: [],
};

// ─── Available slot counters (for Home screen banner & ParkingGrid) ──────────
export function useAvailableSlots() {
  const [counts, setCounts] = useState<AvailableCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const countsRef = ref(rtdb, '/availableSlots');
    const unsubscribe = onValue(
      countsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setCounts({
            Student: data.student ?? 0,
            Staff:   data.staff   ?? 0,
            Visitor: data.visitor ?? 0,
            Total:   data.total   ?? 0,
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('RTDB availableSlots error:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { counts, loading, error };
}

// ─── Full slot list with live status + GPS from Firebase ─────────────────────
export function useParkingSlots() {
  const [slots, setSlots] = useState<ZoneSlots>(EMPTY_SLOTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parkingRef = ref(rtdb, '/parking');

    const unsubscribe = onValue(
      parkingRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const buildZone = (zoneKey: ZoneKey): SlotStatus[] => {
            const zoneData = data[zoneKey];
            if (!zoneData) return [];

            return Object.keys(zoneData)
              .sort()
              .map((slotKey) => {
                const s = zoneData[slotKey];
                return {
                  // "number" field written by ESP32 at boot; fall back to key strip
                  slotNumber: String(s?.number ?? slotKey.replace('slot', '')),
                  occupied:   Boolean(s?.occupied),
                  sensorId:   String(s?.sensorId ?? ''),
                  // GPS coordinates stored in Firebase — written by ESP32 at boot
                  latitude:   Number(s?.latitude  ?? 0),
                  longitude:  Number(s?.longitude ?? 0),
                };
              });
          };

          setSlots({
            Student: buildZone('Student'),
            Staff:   buildZone('Staff'),
            Visitor: buildZone('Visitor'),
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('RTDB parking error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { slots, loading, error };
}
