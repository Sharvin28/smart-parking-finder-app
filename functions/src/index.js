"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onSlotAvailable = void 0;
const admin = __importStar(require("firebase-admin"));
const database_1 = require("firebase-functions/v2/database");
const v2_1 = require("firebase-functions/v2");
const node_fetch_1 = __importDefault(require("node-fetch"));
admin.initializeApp();
const db = admin.firestore();
const ZONE_ROLES = {
    student: ['student', 'Student'],
    staff: ['staff', 'Staff'],
    visitor: ['visitor', 'Visitor', 'student', 'Student', 'staff', 'Staff'],
};
exports.onSlotAvailable = (0, database_1.onValueUpdated)({
    ref: '/parking/{zone}/{slotKey}/occupied',
    region: 'asia-southeast1',
}, async (event) => {
    var _a, _b, _c;
    const before = event.data.before.val();
    const after = event.data.after.val();
    if (before === after)
        return;
    if (after !== false)
        return;
    const zone = event.params.zone;
    const slotKey = event.params.slotKey;
    const slotSnap = await admin.database()
        .ref(`/parking/${zone}/${slotKey}/number`)
        .once('value');
    const slotNumber = (_a = slotSnap.val()) !== null && _a !== void 0 ? _a : slotKey.replace('slot', '');
    v2_1.logger.info(`Slot available: ${zone}/${slotKey} (#${slotNumber})`);
    const allowedRoles = (_b = ZONE_ROLES[zone.toLowerCase()]) !== null && _b !== void 0 ? _b : [];
    if (allowedRoles.length === 0) {
        v2_1.logger.warn(`No allowed roles found for zone: ${zone}`);
        return;
    }
    const now = new Date();
    const tokens = [];
    const chunks = [];
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
            if (!data.expoPushToken)
                return;
            if (data.mutedUntil) {
                const mutedUntil = new Date(data.mutedUntil);
                if (mutedUntil > now) {
                    v2_1.logger.info(`Skipping ${userDoc.id} — muted until ${data.mutedUntil}`);
                    return;
                }
            }
            tokens.push(data.expoPushToken);
        });
    }
    if (tokens.length === 0) {
        v2_1.logger.info('No eligible tokens to notify');
        return;
    }
    v2_1.logger.info(`Sending to ${tokens.length} device(s)`);
    const zoneName = zone.charAt(0).toUpperCase() + zone.slice(1).toLowerCase();
    const messages = tokens.map((token) => ({
        to: token,
        sound: 'default',
        title: '🅿️ Parking Available!',
        body: `Slot ${slotNumber} in ${zoneName} Zone is now free.`,
        data: { zone, slotKey, slotNumber: String(slotNumber) },
    }));
    for (let i = 0; i < messages.length; i += 100) {
        const batch = messages.slice(i, i + 100);
        const response = await (0, node_fetch_1.default)('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
            },
            body: JSON.stringify(batch),
        });
        const result = await response.json();
        v2_1.logger.info('Expo push result:', result);
        (_c = result.data) === null || _c === void 0 ? void 0 : _c.forEach((item, idx) => {
            if (item.status === 'error') {
                v2_1.logger.error(`Token error for ${batch[idx].to}: ${item.message}`);
            }
        });
    }
});
//# sourceMappingURL=index.js.map