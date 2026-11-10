#!/usr/bin/env node
/**
 * Grant or revoke Firebase Auth custom claims (`admin`, `validator`) for a user by email.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json \
 *     node scripts/set-admin-claim.mjs admin@kiruu.xyz --admin
 *
 * Never store serviceAccountKey.json inside the repository.
 */

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith("--"));
const revoke = args.includes("--revoke");
const validatorOnly = args.includes("--validator");

if (!email || !email.includes("@")) {
  console.error(
    "Usage: GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/set-admin-claim.mjs <email> [--admin|--validator|--revoke]"
  );
  process.exit(1);
}

async function run() {
  let adminApp;
  let adminAuth;
  try {
    adminApp = await import("firebase-admin/app");
    adminAuth = await import("firebase-admin/auth");
  } catch {
    console.error("Missing firebase-admin. Install locally with: npm i -D firebase-admin");
    process.exit(1);
  }

  adminApp.initializeApp({
    credential: adminApp.applicationDefault(),
  });

  const auth = adminAuth.getAuth();
  const user = await auth.getUserByEmail(email.trim());
  const existingClaims = user.customClaims || {};

  let nextClaims;
  if (revoke) {
    nextClaims = { ...existingClaims, admin: false, validator: false };
  } else if (validatorOnly) {
    nextClaims = { ...existingClaims, validator: true };
  } else {
    nextClaims = { ...existingClaims, admin: true, validator: true };
  }

  await auth.setCustomUserClaims(user.uid, nextClaims);
  console.log(`Updated custom claims for ${user.email} (${user.uid}):`, nextClaims);
}

run().catch((err) => {
  console.error("Failed to update custom claims:", err.message || err);
  process.exit(1);
});
