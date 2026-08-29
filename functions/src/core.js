"use strict";

const crypto = require("node:crypto");
const sharp = require("sharp");
const {HttpsError} = require("firebase-functions/v2/https");

const KINDS = Object.freeze({
  AP: {limit: 5, windowMs: 15 * 60 * 1000, auth: false, prefix: "AP", start: 0},
  NE: {limit: 5, windowMs: 15 * 60 * 1000, auth: false, prefix: "NE", start: 0},
  CO: {limit: 4, windowMs: 30 * 60 * 1000, auth: false, prefix: "CO", start: 0},
  MEMBER: {limit: 3, windowMs: 60 * 60 * 1000, auth: false, prefix: "SOC", start: 3},
  SUGGESTION: {limit: 6, windowMs: 30 * 60 * 1000, auth: false, prefix: "BUZ", start: 0},
  CONTACT: {limit: 4, windowMs: 30 * 60 * 1000, auth: false, prefix: "CON", start: 0},
  PROJECT: {limit: 4, windowMs: 60 * 60 * 1000, auth: true, prefix: "PRO", start: 0},
  VIRTUAL: {limit: 8, windowMs: 60 * 60 * 1000, auth: true, prefix: "VIR", start: 0}
});

const CATEGORIES = new Set(["knowledge", "time", "space", "equipment", "technology", "service", "other"]);
const PAYMENT_METHODS = new Set(["card", "sepa"]);
const LOCALES = new Set(["es", "en"]);
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 7 * 1024 * 1024;

function cleanText(value, min, max, field, required = true) {
  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) return "";
    throw new HttpsError("invalid-argument", `${field}:type`);
  }
  const normalized = value.normalize("NFKC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (required && normalized.length < min) throw new HttpsError("invalid-argument", `${field}:min`);
  if (normalized.length > max) throw new HttpsError("invalid-argument", `${field}:max`);
  return normalized;
}

function cleanEmail(value, required = true) {
  const email = cleanText(value, required ? 3 : 0, 254, "email", required).toLowerCase();
  if (!email && !required) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(email)) throw new HttpsError("invalid-argument", "email:format");
  return email;
}

function cleanPhone(value) {
  const phone = cleanText(value, 7, 32, "phone");
  if (!/^\+?[0-9().\s-]{7,32}$/u.test(phone)) throw new HttpsError("invalid-argument", "phone:format");
  return phone;
}

function pickLocale(value) {
  return LOCALES.has(value) ? value : "es";
}

function requireConsent(value) {
  if (value !== true) throw new HttpsError("invalid-argument", "consent:required");
  return true;
}

function validatePayload(kind, raw) {
  const p = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  if (kind === "AP" || kind === "NE") {
    if (!CATEGORIES.has(p.category)) throw new HttpsError("invalid-argument", "category:enum");
    return {
      functional: {
        title: cleanText(p.title, 5, 120, "title"),
        description: cleanText(p.description, 20, 3000, "description"),
        category: p.category,
        location: cleanText(p.location, 0, 120, "location", false)
      },
      pii: {
        contactName: cleanText(p.contactName, 2, 120, "contactName"),
        email: cleanEmail(p.email),
        phone: cleanText(p.phone, 0, 32, "phone", false),
        consent: requireConsent(p.consent)
      }
    };
  }
  if (kind === "CO") {
    return {
      functional: {
        title: cleanText(p.title, 5, 120, "title"),
        description: cleanText(p.description, 20, 3000, "description"),
        collaborationType: cleanText(p.collaborationType, 3, 40, "collaborationType")
      },
      pii: {
        contactName: cleanText(p.contactName, 2, 120, "contactName"),
        email: cleanEmail(p.email),
        phone: cleanText(p.phone, 0, 32, "phone", false),
        consent: requireConsent(p.consent)
      }
    };
  }
  if (kind === "MEMBER") {
    if (!PAYMENT_METHODS.has(p.paymentMethod)) throw new HttpsError("invalid-argument", "paymentMethod:enum");
    return {
      functional: {
        contribution: cleanText(p.contribution, 0, 2000, "contribution", false),
        need: cleanText(p.need, 0, 2000, "need", false),
        paymentMethod: p.paymentMethod,
        paymentStatus: "not_initiated"
      },
      pii: {
        fullName: cleanText(p.fullName, 3, 160, "fullName"),
        email: cleanEmail(p.email),
        phone: cleanPhone(p.phone),
        consent: requireConsent(p.consent)
      }
    };
  }
  if (kind === "SUGGESTION") {
    return {
      functional: {text: cleanText(p.text, 10, 3000, "text")},
      pii: {email: cleanEmail(p.email, false), consent: requireConsent(p.consent)}
    };
  }
  if (kind === "CONTACT") {
    return {
      functional: {
        subject: cleanText(p.subject, 3, 120, "subject"),
        message: cleanText(p.message, 10, 3000, "message")
      },
      pii: {
        contactName: cleanText(p.contactName, 2, 120, "contactName"),
        email: cleanEmail(p.email),
        phone: cleanText(p.phone, 0, 32, "phone", false),
        consent: requireConsent(p.consent)
      }
    };
  }
  if (kind === "PROJECT") {
    return {
      functional: {
        title: cleanText(p.title, 5, 120, "title"),
        description: cleanText(p.description, 20, 3000, "description"),
        location: cleanText(p.location, 2, 120, "location"),
        mode: "physical"
      },
      pii: {}
    };
  }
  if (kind === "VIRTUAL") {
    return {
      functional: {
        projectReference: cleanText(p.projectReference || "N0W-ONLINE", 3, 40, "projectReference"),
        message: cleanText(p.message, 10, 2000, "message"),
        mode: "virtual"
      },
      pii: {}
    };
  }
  throw new HttpsError("invalid-argument", "kind:enum");
}

function validateEnvelope(data, now = Date.now()) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpsError("invalid-argument", "request:type");
  const kind = String(data.kind || "").toUpperCase();
  const config = KINDS[kind];
  if (!config) throw new HttpsError("invalid-argument", "kind:enum");
  if (typeof data.website !== "string" || data.website.length > 0) throw new HttpsError("permission-denied", "automation:honeypot");
  if (!Number.isFinite(data.startedAt)) throw new HttpsError("invalid-argument", "startedAt:type");
  const elapsed = now - data.startedAt;
  if (elapsed < 1200 || elapsed > 2 * 60 * 60 * 1000) throw new HttpsError("failed-precondition", "automation:timing");
  return {kind, config, locale: pickLocale(data.locale), validated: validatePayload(kind, data.payload)};
}

function clientIp(rawRequest) {
  const forwarded = rawRequest && rawRequest.headers ? rawRequest.headers["x-forwarded-for"] : "";
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return rawRequest && rawRequest.ip ? String(rawRequest.ip) : "unknown";
}

function pseudonymize(value, pepper) {
  return crypto.createHmac("sha256", pepper).update(String(value)).digest("hex");
}

function normalizeAttachments(raw, allowed) {
  if (!allowed && raw && raw.length) throw new HttpsError("invalid-argument", "attachments:not_allowed");
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > MAX_ATTACHMENTS) throw new HttpsError("invalid-argument", "attachments:count");
  let total = 0;
  return raw.map((item, index) => {
    if (!item || typeof item !== "object") throw new HttpsError("invalid-argument", `attachments.${index}:type`);
    const type = String(item.type || "").toLowerCase();
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(type)) throw new HttpsError("invalid-argument", `attachments.${index}:mime`);
    const name = cleanText(item.name || `image-${index + 1}`, 1, 100, `attachments.${index}.name`);
    const encoded = String(item.data || "").replace(/^data:image\/(?:jpeg|png|webp);base64,/iu, "");
    if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(encoded)) throw new HttpsError("invalid-argument", `attachments.${index}:data`);
    const buffer = Buffer.from(encoded, "base64");
    if (!buffer.length || buffer.length > MAX_ATTACHMENT_BYTES) throw new HttpsError("invalid-argument", `attachments.${index}:size`);
    total += buffer.length;
    if (total > MAX_TOTAL_ATTACHMENT_BYTES) throw new HttpsError("invalid-argument", "attachments:total_size");
    return {name, type, buffer};
  });
}

async function processAttachment(attachment) {
  let image;
  try {
    image = sharp(attachment.buffer, {failOn: "warning", limitInputPixels: 24_000_000});
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format)) throw new Error("unsupported image");
    if (!metadata.width || !metadata.height || metadata.width > 8000 || metadata.height > 8000) throw new Error("invalid dimensions");
  } catch {
    throw new HttpsError("invalid-argument", "attachments:content");
  }
  const output = await image.rotate().resize({width: 1800, height: 1800, fit: "inside", withoutEnlargement: true}).jpeg({quality: 84, mozjpeg: true}).toBuffer();
  return {buffer: output, contentType: "image/jpeg"};
}

function publicErrorMessage(error) {
  if (error instanceof HttpsError) return error;
  console.error("infon0w unexpected error", error);
  return new HttpsError("internal", "backend:unexpected");
}

module.exports = {
  KINDS,
  MAX_ATTACHMENTS,
  cleanText,
  validatePayload,
  validateEnvelope,
  clientIp,
  pseudonymize,
  normalizeAttachments,
  processAttachment,
  publicErrorMessage
};
