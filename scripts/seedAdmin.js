/**
 * scripts/seedAdmin.js
 *
 * One-time (or repeatable) script to create or promote an Admin account
 * for Smart Parking MMU. Uses the Firebase ADMIN SDK — not the client SDK
 * your app uses — so it can set arbitrary fields and bypass Firestore
 * security rules. Run this from your machine, never ship it in the app.
 *
 * SETUP (one-time):
 *   1. Firebase Console → Project Settings → Service Accounts
 *      → "Generate new private key" → save the JSON file as
 *      serviceAccountKey.json in your project ROOT (same level as package.json).
 *   2. Add serviceAccountKey.json to .gitignore — NEVER commit it.
 *   3. npm install firebase-admin --save-dev
 *
 * USAGE:
 *   node scripts/seedAdmin.js <userId> <password> <fullName>
 *
 * EXAMPLE:
 *   node scripts/seedAdmin.js admin1 SuperSecret123 "System Admin"
 *
 * This matches your app's UserID convention: Auth email is built as
 * `${userId}@mmucampus.app`, same as register.tsx / index.tsx.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (err) {
  console.error('\n❌ Could not find serviceAccountKey.json in your project root.');
  console.error('   Download it from Firebase Console → Project Settings →');
  console.error('   Service Accounts → Generate new private key, then save it as:');
  console.error(`   ${serviceAccountPath}\n`);
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth();
const db = getFirestore();

const toAuthEmail = (userId) => `${userId.trim().toLowerCase()}@mmucampus.app`;

async function seedAdmin(userId, password, fullName) {
  if (!userId || !password || !fullName) {
    console.error('\nUsage: node scripts/seedAdmin.js <userId> <password> <fullName>');
    console.error('Example: node scripts/seedAdmin.js admin1 SuperSecret123 "System Admin"\n');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('\n❌ Password must be at least 6 characters (Firebase Auth requirement).\n');
    process.exit(1);
  }

  const email = toAuthEmail(userId);

  try {
    let userRecord;

    // Check if this Auth account already exists
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`ℹ️  Auth account already exists for ${email} (uid: ${userRecord.uid})`);
      console.log('   Updating password...');
      userRecord = await auth.updateUser(userRecord.uid, { password });
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.log(`Creating new Auth account for ${email}...`);
        userRecord = await auth.createUser({
          email,
          password,
          displayName: fullName,
        });
      } else {
        throw err;
      }
    }

    // Set / overwrite the Firestore profile with role: "Admin"
    await db.collection('users').doc(userRecord.uid).set(
      {
        userId: userId.trim(),
        name: fullName.trim(),
        email,
        role: 'Admin',
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log('\n✅ Admin account ready:');
    console.log(`   UserID:   ${userId}`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   UID:      ${userRecord.uid}`);
    console.log('\nYou can now log in to the app with this UserID and password.\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Failed to seed admin account:', err.message);
    process.exit(1);
  }
}

const [, , userId, password, ...nameParts] = process.argv;
const fullName = nameParts.join(' ');

seedAdmin(userId, password, fullName);
