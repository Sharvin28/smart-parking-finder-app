// Static metadata for each parking zone.
// The ESP32 only reports occupied/available counts per role key
// (student / staff / visitor) — display names, colors, and GPS
// coordinates for navigation live here in the app.
//
// IMPORTANT: role strings must be lowercase. This must match exactly
// what is stored in users/{uid}/role in both Firestore and Realtime
// Database — the RTDB security rules validate role as one of:
// 'student' | 'staff' | 'visitor' | 'admin' (all lowercase).
// If this doesn't match, getZonesForRole() returns an empty list and
// ParkingGrid will show "No parking zones assigned to your role"
// even when the user has a valid role.

export type ZoneKey = 'student' | 'staff' | 'visitor';

export interface ZoneConfig {
  key: ZoneKey;
  zoneName: string;
  allowedRoles: string[]; // lowercase — must match users/{uid}/role values
  color: string;
  totalSlots: number;
  // Approximate GPS for each physical slot in this zone — replace with
  // real coordinates from your campus map for accurate navigation.
  slots: {
    slotNumber: string;
    latitude: number;
    longitude: number;
  }[];
}

export const PARKING_ZONES: ZoneConfig[] = [
  {
    key: 'student',
    zoneName: 'Student Zone',
    allowedRoles: ['student'],
    color: '#01ff23',
    totalSlots: 2,
    slots: [
      { slotNumber: '1', latitude: 3.1391, longitude: 101.6869 },
      { slotNumber: '2', latitude: 3.1392, longitude: 101.6870 },
    ],
  },
  {
    key: 'staff',
    zoneName: 'Staff Zone',
    allowedRoles: ['staff'],
    color: '#4fc3f7',
    totalSlots: 2,
    slots: [
      { slotNumber: '1', latitude: 3.1395, longitude: 101.6873 },
      { slotNumber: '2', latitude: 3.1396, longitude: 101.6874 },
    ],
  },
  {
    key: 'visitor',
    zoneName: 'Visitor Zone',
    // Visitor zone open to everyone, matching the RTDB .read rule
    // (parking/visitor and availableSlots/visitor allow student/staff too)
    allowedRoles: ['visitor', 'student', 'staff'],
    color: '#b079f8',
    totalSlots: 2,
    slots: [
      { slotNumber: '1', latitude: 3.1388, longitude: 101.6865 },
      { slotNumber: '2', latitude: 3.1389, longitude: 101.6866 },
    ],
  },
];

export const getZoneByKey = (key: string) =>
  PARKING_ZONES.find((z) => z.key === key);

export const getZonesForRole = (role: string) =>
  PARKING_ZONES.filter((z) => z.allowedRoles.includes(role.toLowerCase()));
