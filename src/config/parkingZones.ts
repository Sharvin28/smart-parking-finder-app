export type ZoneKey = 'Student' | 'Staff' | 'Visitor';

export interface ZoneConfig {
  key: ZoneKey;
  zoneName: string;
  color: string;
  totalSlots: number;
  // GPS coordinates are now stored in Firebase (written by ESP32 at boot).
  // This file no longer holds coordinates — keeping the interface minimal.
}

export const PARKING_ZONES: ZoneConfig[] = [
  {
    key: 'Student',
    zoneName: 'Student Zone',
    color: '#01ff23',
    totalSlots: 2,
  },
  {
    key: 'Staff',
    zoneName: 'Staff Zone',
    color: '#4fc3f7',
    totalSlots: 2,
  },
  {
    key: 'Visitor',
    zoneName: 'Visitor Zone',
    color: '#b079f8',
    totalSlots: 2,
  },
];

export const getZoneByKey = (key: string) =>
  PARKING_ZONES.find((z) => z.key === key);

// ── Explicit per-role visibility map ───────────────────────────────────────
// Student → Student + Visitor zones
// Staff   → Staff + Visitor zones
// Visitor → Visitor zone only
// Admin   → all zones
const ROLE_ZONE_MAP: Record<string, ZoneKey[]> = {
  student: ['Student', 'Visitor'],
  staff:   ['Staff', 'Visitor'],
  visitor: ['Visitor'],
  admin:   ['Student', 'Staff', 'Visitor'],
};

export const getZonesForRole = (role: string) => {
  const normalizedRole = role.toLowerCase().trim();
  const visibleKeys = ROLE_ZONE_MAP[normalizedRole] ?? [];
  return PARKING_ZONES.filter((z) => visibleKeys.includes(z.key));
};
