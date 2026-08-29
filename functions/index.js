"use strict";

const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue, Timestamp} = require("firebase-admin/firestore");
const {getStorage} = require("firebase-admin/storage");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const {
  validateEnvelope,
  clientIp,
  pseudonymize,
  normalizeAttachments,
  processAttachment,
  publicErrorMessage
} = require("./src/core");
const {sendUserEmail, sendAdminEmail} = require("./src/email");

initializeApp();

const rateLimitPepper = defineSecret("INFON0W_RATE_LIMIT_PEPPER");
const emailApiKey = defineSecret("INFON0W_EMAIL_API_KEY");
const emailFrom = defineSecret("INFON0W_EMAIL_FROM");
const emailReplyTo = defineSecret("INFON0W_EMAIL_REPLY_TO");
const adminEmail = defineSecret("INFON0W_ADMIN_EMAIL");
const REGION = "europe-west1";
const ALLOWED_ORIGINS = [
  "https://infon0w.com",
  "https://www.infon0w.com",
  "https://sergiopenalbacerdan-oss.github.io",
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/u
];

const baseOptions = {
  region: REGION,
  invoker: "public",
  cors: ALLOWED_ORIGINS,
  enforceAppCheck: true,
  secrets: [rateLimitPepper, emailApiKey, emailFrom, emailReplyTo, adminEmail],
  maxInstances: 20,
  concurrency: 40,
  timeoutSeconds: 60,
  memory: "512MiB"
};

function requireAuth(request) {
  if (!request.auth || !request.auth.uid) throw new HttpsError("unauthenticated", "auth:required");
  return request.auth.uid;
}

async function consumeRateLimit(db, request, scope, limit, windowMs) {
  const pepper = rateLimitPepper.value();
  if (!pepper) throw new HttpsError("internal", "security:rate_limit_unavailable");
  const principal = request.auth?.uid || clientIp(request.rawRequest);
  const key = pseudonymize(`${scope}|${principal}`, pepper);
  const ref = db.collection("infon0w_rate_limits").doc(key);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? snap.data() : null;
    const windowStartedAt = current?.windowStartedAt?.toMillis ? current.windowStartedAt.toMillis() : 0;
    const expired = !windowStartedAt || now - windowStartedAt >= windowMs;
    const count = expired ? 0 : Number(current?.count || 0);
    if (count >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - windowStartedAt)) / 1000));
      throw new HttpsError("resource-exhausted", "rate_limit:exceeded", {retryAfterSeconds});
    }
    tx.set(ref, {
      scope,
      principalHash: key,
      count: count + 1,
      windowStartedAt: expired ? Timestamp.fromMillis(now) : current.windowStartedAt,
      expiresAt: Timestamp.fromMillis((expired ? now : windowStartedAt) + windowMs + 24 * 60 * 60 * 1000),
      updatedAt: FieldValue.serverTimestamp()
    }, {merge: true});
  });
}

async function uploadImages(recordId, rawAttachments) {
  const attachments = normalizeAttachments(rawAttachments, true);
  if (!attachments.length) return [];
  const bucket = getStorage().bucket();
  const paths = [];
  try {
    for (let index = 0; index < attachments.length; index += 1) {
      const processed = await processAttachment(attachments[index]);
      const path = `infon0w_uploads/${recordId}/${String(index + 1).padStart(2, "0")}.jpg`;
      await bucket.file(path).save(processed.buffer, {
        resumable: false,
        validation: "crc32c",
        metadata: {
          contentType: processed.contentType,
          cacheControl: "private,max-age=0,no-store",
          metadata: {application: "infon0w", recordId, originalName: attachments[index].name}
        }
      });
      paths.push(path);
    }
    return paths;
  } catch (error) {
    await Promise.allSettled(paths.map((path) => bucket.file(path).delete({ignoreNotFound: true})));
    throw error;
  }
}

async function deleteUploads(paths) {
  if (!paths.length) return;
  const bucket = getStorage().bucket();
  await Promise.allSettled(paths.map((path) => bucket.file(path).delete({ignoreNotFound: true})));
}

async function persistSubmission(db, request, envelope, recordId, mediaPaths) {
  const {kind, config, locale, validated} = envelope;
  const ownerUid = request.auth?.uid || null;
  const recordRef = db.collection("infon0w_records").doc(recordId);
  const privateRef = db.collection("infon0w_private").doc(recordId);
  const counterRef = db.collection("infon0w_counters").doc(kind.toLowerCase());
  const statsRef = db.collection("infon0w_public").doc("stats");
  const auditRef = db.collection("infon0w_audit").doc();
  let reference = "";

  await db.runTransaction(async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const current = counterSnap.exists ? Number(counterSnap.data().value || config.start) : config.start;
    const next = current + 1;
    reference = `${config.prefix}-${String(next).padStart(6, "0")}`;
    tx.set(counterRef, {value: next, updatedAt: FieldValue.serverTimestamp()}, {merge: true});

    const status = kind === "PROJECT" ? "proposal_received" : kind === "VIRTUAL" ? "participation_received" : "received";
    tx.create(recordRef, {
      application: "infon0w",
      kind,
      reference,
      status,
      locale,
      ownerUid,
      functional: validated.functional,
      mediaPaths,
      mediaCount: mediaPaths.length,
      piiSeparated: true,
      notification: {onscreen: "confirmed", email: "pending_configuration"},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    if (Object.keys(validated.pii).length) {
      tx.create(privateRef, {
        application: "infon0w",
        recordId,
        kind,
        reference,
        ownerUid,
        ...validated.pii,
        consentVersion: "2026-08-29",
        createdAt: FieldValue.serverTimestamp()
      });
    }

    if (kind === "PROJECT") {
      tx.create(db.collection("infon0w_projects").doc(recordId), {
        application: "infon0w",
        recordId,
        reference,
        ownerUid,
        title: validated.functional.title,
        description: validated.functional.description,
        location: validated.functional.location,
        mode: "physical",
        status: "proposal_received",
        visibility: "private",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    tx.set(statsRef, {
      counts: {[kind]: FieldValue.increment(1)},
      total: FieldValue.increment(1),
      lastOperationAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, {merge: true});

    tx.create(auditRef, {
      application: "infon0w",
      event: "submission.accepted",
      entityType: kind,
      entityId: recordId,
      reference,
      actorUid: ownerUid,
      result: "success",
      hasPii: Object.keys(validated.pii).length > 0,
      mediaCount: mediaPaths.length,
      createdAt: FieldValue.serverTimestamp()
    });
  });
  return reference;
}

exports.infon0wSubmit = onCall(baseOptions, async (request) => {
  const db = getFirestore();
  let mediaPaths = [];
  try {
    const envelope = validateEnvelope(request.data);
    if (envelope.config.auth) requireAuth(request);
    await consumeRateLimit(db, request, `submit:${envelope.kind}`, envelope.config.limit, envelope.config.windowMs);

    const mediaAllowed = envelope.kind === "AP" || envelope.kind === "NE";
    if (!mediaAllowed && request.data.attachments?.length) throw new HttpsError("invalid-argument", "attachments:not_allowed");
    const recordRef = db.collection("infon0w_records").doc();
    mediaPaths = mediaAllowed ? await uploadImages(recordRef.id, request.data.attachments) : [];
    let reference;
    let emailStatus = "pending_configuration";
    try {
      reference = await persistSubmission(db, request, envelope, recordRef.id, mediaPaths);
      const userEmail = (envelope.validated.pii && envelope.validated.pii.email) || null;
      const nowIso = new Date().toISOString();
      const emailData = {
        reference,
        date: nowIso,
        statusLabel: envelope.kind === "PROJECT" ? "Propuesta recibida" : envelope.kind === "VIRTUAL" ? "Participación recibida" : "Recibido"
      };
      if (userEmail) {
        const userResult = await sendUserEmail(envelope.kind, userEmail, emailData);
        emailStatus = userResult.status;
      }
      const adminResult = await sendAdminEmail(envelope.kind, emailData);
      if (emailStatus === "pending_configuration" && adminResult.status !== "pending_configuration") {
        emailStatus = adminResult.status;
      }
      await db.collection("infon0w_records").doc(recordRef.id).update({
        "notification.email": emailStatus,
        "notification.userEmailStatus": userEmail ? (emailStatus === "pending_configuration" ? "skipped" : emailStatus) : "not_applicable",
        "notification.adminEmailStatus": adminResult.status,
        updatedAt: FieldValue.serverTimestamp()
      });
    } catch (error) {
      await deleteUploads(mediaPaths);
      throw error;
    }
    return {
      ok: true,
      recordId: recordRef.id,
      reference,
      status: envelope.kind === "PROJECT" ? "proposal_received" : envelope.kind === "VIRTUAL" ? "participation_received" : "received",
      paymentStatus: envelope.kind === "MEMBER" ? "not_initiated" : null,
      emailStatus
    };
  } catch (error) {
    throw publicErrorMessage(error);
  }
});

exports.infon0wGetMyRecords = onCall({...baseOptions, maxInstances: 10, memory: "256MiB"}, async (request) => {
  try {
    const uid = requireAuth(request);
    const db = getFirestore();
    await consumeRateLimit(db, request, "read:my_records", 30, 15 * 60 * 1000);
    const snapshot = await db.collection("infon0w_records").where("ownerUid", "==", uid).limit(100).get();
    const records = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        kind: data.kind,
        reference: data.reference,
        status: data.status,
        functional: data.functional,
        mediaCount: data.mediaCount || 0,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null
      };
    }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return {ok: true, records};
  } catch (error) {
    throw publicErrorMessage(error);
  }
});

exports.infon0wGetMedia = onCall({...baseOptions, maxInstances: 5, memory: "512MiB"}, async (request) => {
  try {
    const uid = requireAuth(request);
    const db = getFirestore();
    await consumeRateLimit(db, request, "read:media", 20, 15 * 60 * 1000);
    const recordId = typeof request.data?.recordId === "string" ? request.data.recordId : "";
    const index = Number(request.data?.index);
    if (!/^[A-Za-z0-9_-]{10,40}$/u.test(recordId) || !Number.isInteger(index) || index < 0 || index > 2) {
      throw new HttpsError("invalid-argument", "media:request");
    }
    const record = await db.collection("infon0w_records").doc(recordId).get();
    if (!record.exists || record.data().ownerUid !== uid) throw new HttpsError("permission-denied", "media:ownership");
    const path = record.data().mediaPaths?.[index];
    if (!path || !path.startsWith(`infon0w_uploads/${recordId}/`)) throw new HttpsError("not-found", "media:not_found");
    const [buffer] = await getStorage().bucket().file(path).download();
    return {ok: true, contentType: "image/jpeg", data: buffer.toString("base64")};
  } catch (error) {
    throw publicErrorMessage(error);
  }
});

exports.infon0wHumanLensSnapshot = onCall({...baseOptions, maxInstances: 10, memory: "256MiB"}, async (request) => {
  try {
    const db = getFirestore();
    await consumeRateLimit(db, request, "read:humanlens", 30, 15 * 60 * 1000);
    const [infon0wDoc, platformSnapshot] = await Promise.all([
      db.collection("infon0w_public").doc("stats").get(),
      db.collection("n0w_stats").orderBy("date", "desc").limit(1).get().catch(() => null)
    ]);
    const infon0wData = infon0wDoc.exists ? infon0wDoc.data() : {};
    const platformData = platformSnapshot && !platformSnapshot.empty ? platformSnapshot.docs[0].data() : null;
    return {
      ok: true,
      source: "controlled-backend",
      infon0w: {
        total: Number(infon0wData.total || 0),
        counts: infon0wData.counts || {}
      },
      n0w: platformData ? {
        date: platformData.date || null,
        totalUsers: Number(platformData.totalUsers || 0),
        totalSignals: Number(platformData.totalSignals || 0),
        totalFollows: Number(platformData.totalFollows || 0)
      } : null,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    throw publicErrorMessage(error);
  }
});
