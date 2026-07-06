import * as admin from 'firebase-admin';
import { onValueUpdated } from 'firebase-functions/v2/database';
import { logger } from 'firebase-functions/v2';
import fetch from 'node-fetch';

admin.initializeApp();
const db = admin.firestore();

const ZONE_ROLES: Record<string, string[]> = {
  student: ['student', 'Student'],
  staff:   ['staff',   'Staff'],
  visitor: ['visitor', 'Visitor', 'student', 'Student', 'staff', 'Staff'],
};

export const onSlotAvailable = onValueUpdated(
  {
    ref: '/parking/{zone}/{slotKey}/occupied',
    region: 'asia-southeast1',
  },
  async (event) => {
    const before = event.data.before.val();
    const after  = event.data.after.val();

    if (before === after) return;
    if (after !== false)  return;

    const zone: string    = event.params.zone;
    const slotKey: string = event.params.slotKey;

    const slotSnap = await admin.database()
      .ref(`/parking/${zone}/${slotKey}/number`)
      .once('value');
    const slotNumber = slotSnap.val() ?? slotKey.replace('slot', '');

    logger.info(`Slot available: ${zone}/${slotKey} (#${slotNumber})`);

    const allowedRoles = ZONE_ROLES[zone.toLowerCase()] ?? [];
    if (allowedRoles.length === 0) {
      logger.warn(`No allowed roles found for zone: ${zone}`);
      return;
    }

    const now = new Date();
    const tokens: string[] = [];

    const chunks: string[][] = [];
    for (let i = 0; i < allowedRoles.length; i += 10) {
      chunks.push(allowedRoles.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      const snap = await db
        .collection('users')
        .where('role', 'in', chunk)
        .get();

      snap.forEach((userDoc) => {
        const data = userDoc.data();
        if (!data.expoPushToken) return;
        if (data.mutedUntil) {
          const mutedUntil = new Date(data.mutedUntil);
          if (mutedUntil > now) {
            logger.info(`Skipping ${userDoc.id} — muted until ${data.mutedUntil}`);
            return;
          }
        }
        tokens.push(data.expoPushToken);
      });
    }

    if (tokens.length === 0) {
      logger.info('No eligible tokens to notify');
      return;
    }

    logger.info(`Sending to ${tokens.length} device(s)`);

    const zoneName = zone.charAt(0).toUpperCase() + zone.slice(1).toLowerCase();

    const messages = tokens.map((token) => ({
      to:    token,
      sound: 'default',
      title: '🅿️ Parking Available!',
      body:  `Slot ${slotNumber} in ${zoneName} Zone is now free.`,
      data:  { zone, slotKey, slotNumber: String(slotNumber) },
    }));

    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type':    'application/json',
          'Accept':          'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(batch),
      });

      const result = await response.json() as {
        data: { status: string; message?: string }[];
      };
      logger.info('Expo push result:', result);

      result.data?.forEach((item, idx) => {
        if (item.status === 'error') {
          logger.error(`Token error for ${batch[idx].to}: ${item.message}`);
        }
      });
    }
  }
);