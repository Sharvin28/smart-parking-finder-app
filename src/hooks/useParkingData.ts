import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { rtdb } from '../../firebase';
import { ZoneKey } from '@/config/parkingZones';

export interface SlotStatus {
  slotNumber: string;
  occupied: boolean;
}

export interface AvailableCounts {
  student: number;
  staff: number;
  visitor: number;
  total: number;
}

export interface ZoneSlots {
  student: SlotStatus[];
  staff: SlotStatus[];
  visitor: SlotStatus[];
}

const EMPTY_COUNTS: AvailableCounts = {
  student: 0,
  staff: 0,
  visitor: 0,
  total: 0,
};

const EMPTY_SLOTS: ZoneSlots = {
  student: [],
  staff: [],
  visitor: [],
};

/**
 * Subscribes to the ESP32's live data at /availableSlots in Firebase
 * Realtime Database. Updates automatically every time the ESP32 writes
 * new sensor readings (every 2 seconds in the current firmware).
 */
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
            student: data.student ?? 0,
            staff: data.staff ?? 0,
            visitor: data.visitor ?? 0,
            total: data.total ?? 0,
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

/**
 * Subscribes to the full per-slot occupied/empty state at /parking
 * for every zone, so the Parking screen can show individual slots,
 * not just the aggregate count.
 */
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
              .sort() // slot1, slot2, ...
              .map((slotKey) => ({
                slotNumber: String(zoneData[slotKey]?.number ?? slotKey.replace('slot', '')),
                occupied: Boolean(zoneData[slotKey]?.occupied),
              }));
          };

          setSlots({
            student: buildZone('student'),
            staff: buildZone('staff'),
            visitor: buildZone('visitor'),
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
