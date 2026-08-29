"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  KINDS,
  validateEnvelope,
  validatePayload,
  pseudonymize,
  normalizeAttachments,
  processAttachment
} = require("../src/core");

const now = 1_800_000_000_000;

function envelope(kind, payload, extra = {}) {
  return {
    kind,
    locale: "es",
    website: "",
    startedAt: now - 2500,
    payload,
    ...extra
  };
}

test("AP separa contenido funcional y PII", () => {
  const result = validateEnvelope(envelope("AP", {
    title: "Taller de carpintería",
    description: "Puedo enseñar técnicas básicas durante dos tardes.",
    category: "knowledge",
    location: "Albacete",
    contactName: "Ada Lovelace",
    email: "ADA@example.com",
    phone: "+34 600 000 000",
    consent: true
  }), now);
  assert.equal(result.kind, "AP");
  assert.equal(result.validated.functional.title, "Taller de carpintería");
  assert.equal(result.validated.pii.email, "ada@example.com");
  assert.equal(result.validated.functional.email, undefined);
});

test("socio conserva pago sin afirmar que esté realizado", () => {
  const result = validatePayload("MEMBER", {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+34 600 000 000",
    contribution: "Conocimiento",
    need: "Un espacio",
    paymentMethod: "sepa",
    consent: true
  });
  assert.equal(result.functional.paymentMethod, "sepa");
  assert.equal(result.functional.paymentStatus, "not_initiated");
});

test("honeypot y tiempo mínimo se aplican en servidor", () => {
  assert.throws(() => validateEnvelope(envelope("SUGGESTION", {
    text: "Una recomendación suficientemente larga.",
    email: "",
    consent: true
  }, {website: "spam.example"}), now), /automation:honeypot/u);
  assert.throws(() => validateEnvelope(envelope("SUGGESTION", {
    text: "Una recomendación suficientemente larga.",
    email: "",
    consent: true
  }, {startedAt: now - 100}), now), /automation:timing/u);
});

test("PROJECT y VIRTUAL están marcados como operaciones autenticadas", () => {
  assert.equal(KINDS.PROJECT.auth, true);
  assert.equal(KINDS.VIRTUAL.auth, true);
  assert.equal(KINDS.AP.auth, false);
});

test("la pseudonimización es estable sin almacenar IP", () => {
  const first = pseudonymize("127.0.0.1", "test-pepper");
  assert.equal(first, pseudonymize("127.0.0.1", "test-pepper"));
  assert.notEqual(first, pseudonymize("127.0.0.2", "test-pepper"));
  assert.equal(first.length, 64);
});

test("los adjuntos rechazan MIME no permitido", () => {
  assert.throws(() => normalizeAttachments([{name: "x.svg", type: "image/svg+xml", data: "PHN2Zz4="}], true), /attachments\.0:mime/u);
});

test("las imágenes válidas se recodifican a JPEG sin metadatos", async () => {
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const [attachment] = normalizeAttachments([{name: "pixel.png", type: "image/png", data: png}], true);
  const result = await processAttachment(attachment);
  assert.equal(result.contentType, "image/jpeg");
  assert.equal(result.buffer[0], 0xff);
  assert.equal(result.buffer[1], 0xd8);
});