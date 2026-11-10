import {
  doc,
  collection,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { ref, set, remove } from "firebase/database";
import { db, rtdb } from "../../lib/firebase.js";

export const SITE_CONFIG_COLLECTION = "site_config";
export const SITE_STATUS_DOC_ID = "status";
export const LEGACY_STATUS_COLLECTION = "validations";
export const LEGACY_STATUS_DOC_ID = "system_status";

/**
 * Commit a versioned status update inside a Firestore transaction, mirror to
 * legacy `validations/system_status` for backwards-compatible guards, and append
 * an immutable audit entry under `site_config/status/audit/{auditId}`.
 */
export async function commitEcosystemStatusTransaction({
  masterSwitch,
  sublinks,
  adminAnnouncement,
  actor,
  actionSummary,
  updatedKey = null,
  isDelete = false,
}) {
  if (!db) {
    throw new Error("Firestore SDK is not initialized.");
  }
  if (!actor || !actor.uid) {
    throw new Error("Authenticated administrator session is required to modify ecosystem status.");
  }

  const syncedSublinks = { ...sublinks };
  if (syncedSublinks["tawir-beta"]) {
    syncedSublinks["tawir-dev"] = {
      ...syncedSublinks["tawir-beta"],
      path: "tawir.kiruu.xyz/beta",
      url: "https://tawir.kiruu.xyz/beta/",
    };
  }

  const nowIso = new Date().toISOString();
  const statusRef = doc(db, SITE_CONFIG_COLLECTION, SITE_STATUS_DOC_ID);
  const legacyRef = doc(db, LEGACY_STATUS_COLLECTION, LEGACY_STATUS_DOC_ID);
  const auditRef = doc(collection(statusRef, "audit"));

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(statusRef);
    const prevVersion = snap.exists() && typeof snap.data()?.version === "number" ? snap.data().version : 0;
    const nextVersion = prevVersion + 1;

    const payload = {
      version: nextVersion,
      updatedAt: nowIso,
      updatedBy: actor.uid,
      updatedByEmail: actor.email || "admin",
      masterSwitch: Boolean(masterSwitch),
      adminAnnouncement: {
        enabled: Boolean(adminAnnouncement?.enabled),
        message: String(adminAnnouncement?.message || "").slice(0, 280),
        variant: adminAnnouncement?.variant || "info",
        updatedAt: adminAnnouncement?.updatedAt || nowIso,
      },
      services: syncedSublinks,
      sublinks: syncedSublinks,
    };

    const serialized = JSON.stringify(payload);

    tx.set(statusRef, {
      ...payload,
      configJson: serialized,
    });

    tx.set(
      legacyRef,
      {
        configJson: serialized,
        version: nextVersion,
        updatedAt: nowIso,
        updatedBy: actor.uid,
      },
      { merge: true }
    );

    tx.set(auditRef, {
      actorUid: actor.uid,
      actorEmail: actor.email || "admin",
      action: String(actionSummary || "Updated ecosystem configuration").slice(0, 160),
      targetService: updatedKey || "all",
      version: nextVersion,
      masterSwitch: Boolean(masterSwitch),
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
    });

    return { version: nextVersion, payload };
  });

  try {
    localStorage.setItem("kiruu_sublinks_status", JSON.stringify(result.payload));
    localStorage.setItem("kiruu_services_status", JSON.stringify(result.payload));
  } catch (_) {}

  // Best-effort non-blocking RTDB mirror for any legacy listeners
  if (rtdb) {
    Promise.race([
      (async () => {
        if (updatedKey && isDelete) {
          await remove(ref(rtdb, `services/${updatedKey}`));
        } else if (updatedKey && syncedSublinks[updatedKey]) {
          await set(ref(rtdb, `services/${updatedKey}`), {
            ...syncedSublinks[updatedKey],
            updatedAt: Date.now(),
          });
        }
        await set(ref(rtdb, "masterSwitch"), Boolean(masterSwitch));
        await set(ref(rtdb, "adminAnnouncement"), result.payload.adminAnnouncement);
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("RTDB timeout")), 600)),
    ]).catch(() => {});
  }

  return result;
}

export function subscribeToAuditLog(onEntries, onError) {
  if (!db) return () => {};
  const auditCol = collection(db, SITE_CONFIG_COLLECTION, SITE_STATUS_DOC_ID, "audit");
  const q = query(auditCol, orderBy("timestamp", "desc"), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onEntries(rows);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}
